// Fish and Slips -- server-authoritative state machine.
//
// Ruleset source of truth: /mnt/user-data/uploads/T.O.D.O/Fish and slips.md
// ("the note", below). Do not re-derive rules from anywhere else. This file
// implements every mechanic in that note; every place this file makes a call
// the note leaves ambiguous is flagged with a "RESOLVED AMBIGUITY" comment
// explaining the ruling and why. The build report (delivered separately)
// summarizes all of them in one place.
//
// Contract: PROTOCOL.md §5 (server module) / §6 (non-negotiables). Reference
// implementation for the plumbing shape: src/games/_smoke.js. `ctx` is
// provided by src/room.js's buildCtx().
//
// -----------------------------------------------------------------------
// Vocabulary used in this file matches the note's original (non-renamed)
// terms: Bank, Stash, Bid, Tariff, Slip, Bust, DUEL!, Newcomer/Fresh Catch,
// Poach, Schooling Together, Cascade, Overtime.
// -----------------------------------------------------------------------

const STARTING_STASH = 10;

// RESOLVED AMBIGUITY (round limit / bid timer setup): the note says round
// limit (3/5/10) and the bid-writing timer are "agreed before playing" /
// "toggled at setup", but PROTOCOL.md's `start` frame is `{gameId}` only --
// there is no wire message a Display can use to configure a game before
// `start()` runs, and this is a frozen contract this file must conform to,
// not extend. Resolution: default to the note's "standard/playtest" value
// (5 rounds), and never run a bid-writing timer (the note's own stated
// default is "off"). Both are plain constants below so a future protocol
// revision that adds a pre-start config frame can wire them up trivially.
const DEFAULT_ROUND_LIMIT = 5;

// The note specifies the DUEL race window precisely: 10 seconds.
const RACE_MS = 10_000;

// RESOLVED AMBIGUITY (simultaneous newcomer arrivals): "if 2+ newcomers
// arrive at once, they DUEL each other" is meaningful on paper but the
// server only ever learns about one join at a time (`onPlayerJoin` fires
// once per connection) -- true network simultaneity isn't observable.
// Resolution: every newcomer arrival while the game is in progress opens
// (or joins, if one is already open) a short collection window; if it
// closes with exactly one candidate they Poach solo (Fresh Catch), if 2+
// they DUEL per the note's "same recursive tie logic". This also gives a
// solo newcomer a brief, visible "you're about to poach the bank" beat
// instead of an instant, unexplained stash change. Not in the note; a
// deliberate, documented approximation of "at once" over a network.
const POACH_WINDOW_MS = 3_000;

// HARD REQUIREMENT (build brief): "Recursive DUELs must terminate. Guard
// against infinite recursion." The note's own text for a tied vote is
// "DUEL! happens again -- recursively, for as long as it takes" -- correct
// for a room full of humans who will eventually break a tie, but not a
// liveness guarantee a server can make against a deadlocked/adversarial
// vote (e.g. bots, or a room that always splits down the middle). After
// this many *tied* vote rounds on the exact same candidate set, the server
// force-breaks the tie with ctx.random() (seeded, reproducible) instead of
// asking for another vote. This is a safety valve beyond the literal rules,
// not a rules change -- with real players it will essentially never fire.
const MAX_VOTE_RECURSION = 25;

const MAX_BID_VALUE = 1_000_000;

function isPlainInt(n) {
  return typeof n === "number" && Number.isInteger(n) && Number.isFinite(n);
}

function sum(arr) {
  return arr.reduce((a, b) => a + b, 0);
}

/** Seeded pick of one element via ctx.random(). */
function seededPick(arr, random) {
  return arr[Math.floor(random() * arr.length)];
}

export default class FishAndSlips {
  static id = "fish-and-slips";
  static title = "Fish and Slips";
  // The note: "2 or more players. Scales freely." (the placeholder stub
  // this file replaces said 3 -- that was scaffolding, not a rule; the
  // note is the source of truth and display.js's own game-library card
  // already advertises "Needs 2+ players" for this id).
  static minPlayers = 2;
  static maxPlayers = null;
  static allowsMidGameJoin = true;

  constructor(ctx) {
    this.ctx = ctx;
    this._resetState();
  }

  _resetState() {
    this.roundLimit = DEFAULT_ROUND_LIMIT;
    this.roundsPlayed = 0; // completed, non-voided rounds only (Fresh Catch rounds don't count)
    this.overtimeExtensions = 0;
    /** @type {Record<string, number>} playerId -> Stash (integer fish count) */
    this.stashes = {};
    /** 'bidding' | 'revealed' | 'duel' | 'poach' */
    this.phase = "bidding";
    this.round = null; // current round working state, see _startRound()
    this.duelStack = []; // queue of pending DUEL frames; index 0 is active. See _pushDuel().
    this.poach = null; // pending newcomer collection window, see _openOrJoinPoachWindow()
    this.pendingGameEnd = null; // {reason:'roundLimit'|'schooling', awards} -- set once, consumed on next advance
    // Flavor only (note: "Flavor" section). Table-wide, cosmetic, tracked
    // for the lifetime of this game instance -- see the build report for
    // why this can't reach the room-level BR scoreboard from inside a game
    // module under the current (frozen) protocol.
    this.hopeUnlocked = false;
    this.recentLog = []; // short human-readable history for the results screen, newest first
  }

  // ------------------------------------------------------------------
  // lifecycle
  // ------------------------------------------------------------------

  start() {
    for (const p of this.ctx.players) this.stashes[p.id] = STARTING_STASH;
    this._startRound();
    this.ctx.push();
  }

  onAction(playerId, action) {
    if (!action || typeof action.action !== "string") return;
    if (!this.ctx.players.some((p) => p.id === playerId)) return;

    switch (action.action) {
      case "bid":
        this._handleBid(playerId, action);
        break;
      case "duelVote":
        this._handleDuelVote(playerId, action);
        break;
      case "duelRace":
        this._handleDuelRace(playerId);
        break;
      default:
        break; // unknown action -- ignore, per PROTOCOL.md §1's "unknown t is ignored" spirit
    }
  }

  onAdvance() {
    if (this.phase === "revealed") {
      if (this.pendingGameEnd) {
        const { awards } = this.pendingGameEnd;
        this.pendingGameEnd = null;
        this.ctx.end(awards);
        return; // this.game is now null on the room side; nothing left to push
      }
      this._startRound();
      this.ctx.push();
      return;
    }
    if (this.phase === "bidding") {
      this._forceRevealBidding();
      return;
    }
    if (this.phase === "duel") {
      const duel = this.duelStack[0];
      if (duel && duel.mode === "vote") this._forceResolveVote(duel);
      // race mode is only ever 10s; forcing it early would short-circuit a
      // rule-specified timer, so `advance` is a no-op there (PROTOCOL.md
      // §7: "Games may ignore" advance).
      return;
    }
    // 'poach' -- a 3s collection window; nothing sensible for a host to
    // force early, ignore (per contract).
  }

  onPlayerJoin(player) {
    // Every call here is, by construction, a join into an already
    // in-progress game (room.js only calls onPlayerJoin when
    // meta.state === 'in-game' and allowsMidGameJoin is true) -- i.e.
    // exactly the situation the note's "Fresh Catch" section describes.
    //
    // RESOLVED AMBIGUITY (join during a "between rounds" results screen):
    // the note frames Fresh Catch as triggering on joining "an in-progress
    // game" / "mid-game", not narrowly "mid-round". A join that lands while
    // a results recap is on screen (nothing currently in flight to void)
    // still Poaches the current Bank -- there's just nothing to void. This
    // reads truer to the note's plain text than inventing an unstated
    // "only mid-round" carve-out.
    // Deliberately NOT seeding this.stashes[player.id] here: _bank() is a
    // live average over every key in this.stashes (see its doc comment),
    // and a newcomer has no Stash yet -- a 0 placeholder while they sit in
    // the Poach window would drag the average down and let them poach a
    // smaller Bank than the one that was actually on the table the moment
    // they knocked. _standings()/controllerView() already default a
    // missing entry to 0 for display, so nothing needs the key to exist
    // before _awardPoach() sets the real amount.
    this._openOrJoinPoachWindow(player.id);
    this.ctx.push();
  }

  onPlayerLeave(playerId) {
    delete this.stashes[playerId];
    this._purgePlayerFromRoundState(playerId);
    this.ctx.push();
  }

  onPlayerReconnect(player) {
    this.ctx.pushTo(player.id);
  }

  onTimer(name) {
    if (name === "duelRace") {
      const duel = this.duelStack[0];
      if (duel && duel.mode === "race") this._resolveRaceTimeout(duel);
      this.ctx.push();
      return;
    }
    if (name === "poach") {
      this._resolvePoachWindow();
      this.ctx.push();
      return;
    }
  }

  // ------------------------------------------------------------------
  // connected/seated helpers
  // ------------------------------------------------------------------

  _seatedIds() {
    return this.ctx.players.map((p) => p.id);
  }

  _isConnected(playerId) {
    const p = this.ctx.players.find((pl) => pl.id === playerId);
    return !!(p && p.connected);
  }

  _connectedIds() {
    return this.ctx.players.filter((p) => p.connected).map((p) => p.id);
  }

  _name(playerId) {
    const p = this.ctx.players.find((pl) => pl.id === playerId);
    return p ? p.name : "?";
  }

  /** Bank is always the live average of current Stashes (note: "after every
   *  round, resets to the average of all players' Stashes" -- computing it
   *  as a continuously-true derived value, rather than an event we might
   *  forget to fire after every one of the several different ways a round
   *  can end, is equivalent at t=0 (everyone starts at 10) and stays
   *  correct through Busts, Slip collisions, and Poaches alike.) */
  _bank() {
    const values = Object.values(this.stashes);
    if (values.length === 0) return STARTING_STASH;
    return Math.round(sum(values) / values.length);
  }

  // ------------------------------------------------------------------
  // round lifecycle
  // ------------------------------------------------------------------

  _startRound() {
    this.phase = "bidding";
    this.duelStack = [];
    this.round = {
      participantIds: this._connectedIds(),
      submittedIds: [],
      bids: {}, // HARD REQUIREMENT: never read from this map into a view before revealed===true
      revealed: false,
      resolution: null,
    };
  }

  _handleBid(playerId, action) {
    if (this.phase !== "bidding" || !this.round || this.round.revealed) return;
    if (!this._isConnected(playerId)) return;

    const value = action.value;
    const slip = action.slip === true;
    if (!isPlainInt(value) || value < 0 || value > MAX_BID_VALUE) {
      this.ctx.toast(playerId, "error", "Cast must be a whole number of fish.");
      return;
    }

    // A reconnecting player who wasn't part of this round's snapshot (they
    // were disconnected when it started) is welcomed in the moment they
    // act, as long as the round hasn't revealed yet -- see onPlayerReconnect
    // comment / build report for why this doesn't risk a deadlock.
    if (!this.round.participantIds.includes(playerId)) {
      this.round.participantIds.push(playerId);
    }

    this.round.bids[playerId] = { value, slip };
    if (!this.round.submittedIds.includes(playerId)) this.round.submittedIds.push(playerId);

    this._maybeReveal();
    this.ctx.push();
  }

  _pendingBidders() {
    return this.round.participantIds.filter(
      (id) => this._isConnected(id) && !this.round.submittedIds.includes(id)
    );
  }

  _maybeReveal() {
    if (this.round.submittedIds.length === 0) return; // nothing to reveal yet
    if (this._pendingBidders().length > 0) return; // still waiting on someone connected
    this._revealAndResolve();
  }

  /** Display-forced "stop waiting" during bidding (onAdvance). Non-submitters
   *  are dropped from the round the same way a disconnect would drop them --
   *  if that leaves zero bids at all, just re-snapshot a fresh round instead
   *  of revealing an empty one. */
  _forceRevealBidding() {
    if (this.phase !== "bidding" || !this.round || this.round.revealed) return;
    this.round.participantIds = this.round.participantIds.filter((id) =>
      this.round.submittedIds.includes(id)
    );
    if (this.round.submittedIds.length === 0) {
      this._startRound();
      this.ctx.push();
      return;
    }
    this._revealAndResolve();
    this.ctx.push();
  }

  // ------------------------------------------------------------------
  // reveal + resolution
  // ------------------------------------------------------------------

  _revealAndResolve() {
    this.round.revealed = true;

    const participants = this.round.participantIds;
    const entries = participants
      .filter((id) => this.round.bids[id])
      .map((id) => ({ id, ...this.round.bids[id] }));

    // ---- Schooling Together -----------------------------------------
    // Note: "3 or more players are in a round and every single one
    // independently writes the exact same number -- no Slips involved."
    if (
      participants.length >= 3 &&
      entries.length === participants.length &&
      entries.every((e) => !e.slip) &&
      entries.every((e) => e.value === entries[0].value)
    ) {
      this._finishRoundResolved({
        kind: "schooling",
        value: entries[0].value,
      });
      const awards = this._seatedIds().map((id) => ({ playerId: id, points: 1 }));
      this.pendingGameEnd = { reason: "schooling", awards };
      this.ctx.push();
      return;
    }

    // ---- Slip resolution ---------------------------------------------
    const slips = entries.filter((e) => e.slip);
    const plain = entries.filter((e) => !e.slip);

    if (slips.length >= 2) {
      // Collision: every colliding player's Stash empties (resets to 10)
      // and their bid is nulled -- removed from the round entirely.
      for (const s of slips) this.stashes[s.id] = STARTING_STASH;
      this._resolveRanked(plain, {
        collided: slips.map((s) => s.id),
        soleSlip: null,
      });
      return;
    }

    if (slips.length === 1) {
      const slipper = slips[0];
      // "Tariff is still calculated -- (their own bid number) - (the
      // highest bid among everyone who didn't Slip)" -- the Slip winner is
      // simply "the round's leader" for Tariff/Bust/cascade purposes, same
      // machinery as a normal highest bid (see _settleLeader for why this
      // unification is the natural reading, not a rules change).
      const secondValue = plain.length ? Math.max(...plain.map((e) => e.value)) : 0;
      // Recipient of the Slip Tariff is the highest bidder who did NOT Slip --
      // the same player whose bid defined `secondValue`.
      const secondEntry = plain.length
        ? plain.reduce((best, e) => (e.value > best.value ? e : best), plain[0])
        : null;
      this._settleLeader(slipper.id, slipper.value, secondValue, {
        soleSlip: slipper.id,
        collided: [],
        cascadeFrom: plain,
      }, secondEntry ? secondEntry.id : null);
      return;
    }

    // No slips at all: normal ranked resolution.
    this._resolveRanked(plain, { collided: [], soleSlip: null });
  }

  /** Rank plain bids and resolve highest/second-highest, including DUELs for
   *  ties at either spot and Bust cascades. `meta.collided` / `meta.soleSlip`
   *  are carried through purely for the results-screen log. */
  _resolveRanked(entries, meta) {
    if (entries.length === 0) {
      // Nothing survived (e.g. everyone slipped and collided, or a single
      // remaining slipper's cascade ran off the end -- see _cascadeBust).
      // No winner, no Tariff, no Bank movement. RESOLVED AMBIGUITY: the
      // note never states this case explicitly; it falls out naturally
      // from "cascades to the next-highest surviving bid ... until someone
      // can pay" when there is no one left to cascade to.
      this._finishRoundResolved({ kind: "noWinner", ...meta });
      return;
    }

    this._resolveTierThen("highest", entries, [], meta, (highestId, highestValue, rest) => {
      if (rest.length === 0) {
        this._settleLeader(highestId, highestValue, 0, meta);
        return;
      }
      this._resolveTierThen(
        "second",
        rest,
        [highestId],
        meta,
        (secondId, secondValue) => {
          this._settleLeader(highestId, highestValue, secondValue, meta, secondId);
        },
        { confirmedHighestId: highestId, confirmedHighestValue: highestValue }
      );
    });
  }

  /** Finds the top tier (max value) of `pool`, resolving a DUEL first if
   *  it's tied (excluding anyone in `excludeIds` from being a candidate --
   *  used to keep an already-confirmed highest out of the second-highest
   *  tie-break, per the note). Calls `onResolved(winnerId, value, restOfPool)`
   *  once a single winner is known -- synchronously if untied, later (after
   *  a DUEL) if not.
   *
   *  `meta` and `extra` (confirmedHighestId/Value, when resolving 'second')
   *  aren't needed by the live continuation below (that's all closures) --
   *  they're stashed on the pushed duel frame purely so serialize()/
   *  restore() can rebuild an equivalent continuation from scratch after a
   *  hibernation round-trip, without re-deriving "what's already been
   *  excluded" from round.bids (see _rehydrateDuel). */
  _resolveTierThen(reason, pool, excludeIds, meta, onResolved, extra = {}) {
    const candidates = pool.filter((e) => !excludeIds.includes(e.id));
    if (candidates.length === 0) {
      onResolved(null, 0, pool);
      return;
    }
    const topValue = Math.max(...candidates.map((e) => e.value));
    const tied = candidates.filter((e) => e.value === topValue);

    if (tied.length === 1) {
      const winnerId = tied[0].id;
      onResolved(winnerId, topValue, pool.filter((e) => e.id !== winnerId));
      return;
    }

    // IMPORTANT: the DUEL only decides who is *confirmed* as holding this
    // tier -- it does not remove the loser(s) from the board. A player who
    // loses a highest-tier DUEL still wrote that same (tied) number, and
    // the note's "only ties for highest or second-highest matter, resolve
    // highest first, then second-highest" reads as literal rank position
    // #2 of the full sorted list -- if 3 players tied for highest and one
    // is confirmed, the other two are *still* sitting at that same top
    // value and are exactly who "second highest" tied among next. So the
    // pool passed forward after a DUEL only ever drops the single
    // confirmed winner, never the whole tied group -- see the build report
    // for the worked example this resolves.
    this._pushDuel({
      reason,
      candidateIds: tied.map((t) => t.id),
      value: topValue,
      poolSnapshot: pool.map((e) => ({ id: e.id, value: e.value })),
      meta,
      ...extra,
      onResolved: (winnerId) => {
        if (winnerId == null) {
          // 2-player race expired unclaimed -- note: "both tied players'
          // Stashes reset to 10 ... No BR point awarded." A highest-tier
          // race can only happen when the whole game is 2 players (see
          // _duelMode), so there is nothing left to resolve: void the
          // round outright.
          for (const id of tied.map((t) => t.id)) this.stashes[id] = STARTING_STASH;
          this._finishRoundResolved({ kind: "duelUnclaimed", candidateIds: tied.map((t) => t.id) });
          return;
        }
        onResolved(winnerId, topValue, pool.filter((e) => e.id !== winnerId));
      },
    });
  }

  /** `leaderId` (highestId, or the sole Slip winner) is the round's
   *  provisional winner; `leaderValue`/`secondValue` drive the Tariff.
   *  Handles Bust + cascade, then finishes the round. */
  _settleLeader(leaderId, leaderValue, secondValue, meta, secondId = null) {
    const tariff = leaderValue - secondValue;
    const stash = this.stashes[leaderId] ?? STARTING_STASH;

    if (tariff > stash) {
      // Bust: Stash resets to 10, cascade to the next bid down.
      this.stashes[leaderId] = STARTING_STASH;
      const cascadeFrom = meta.cascadeFrom || [];
      this._cascadeBust(leaderId, cascadeFrom, meta);
      return;
    }

    // Snapshot the Bank BEFORE paying it out -- _bank() is a live average
    // over this.stashes, so computing it again after mutating the leader's
    // own entry below would silently report (and the leader would actually
    // receive) a *different*, self-referential number.
    const bankAwarded = this._bank();
    this.stashes[leaderId] = stash - tariff + bankAwarded;
    // The Tariff is PAID TO the second-highest bidder, not burned. The note
    // only says the winner "pays the Tariff out of their own Stash" and never
    // names a recipient, so this originally deducted it into nowhere.
    // Confirmed by Ethan 2026-08-21 with a worked example: E bids 10, A bids
    // 9, both start at 10, Bank 10 -> E ends on 19 (10 - 1 + 10) and A on 11
    // (10 + 1). Order matters: the Bank is a live average over `stashes`, so
    // it is snapshotted above before either side is mutated.
    if (secondId != null && secondId !== leaderId && tariff > 0) {
      this.stashes[secondId] = (this.stashes[secondId] ?? STARTING_STASH) + tariff;
    }
    this._finishRoundResolved({
      kind: "win",
      winnerId: leaderId,
      tariff,
      tariffPaidToId: tariff > 0 ? secondId : null,
      bank: bankAwarded,
      leaderValue,
      secondValue,
      ...meta,
    });
  }

  /** After a Bust, the note: "the second-highest bid becomes the new
   *  highest, a new Tariff is calculated against the next bid down, and so
   *  on until someone can pay." `cascadeFrom` is the pool to cascade
   *  through (the Slip winner's case starts from the non-Slip bids; the
   *  normal case re-derives it from the current round's plain bids minus
   *  everyone already resolved out). */
  _cascadeBust(bustedId, cascadeFrom, meta) {
    const bustLog = (meta.bustChain || []).concat([bustedId]);
    // `cascadeFrom` (only ever set once, on the very first cascade step out
    // of a Slip winner -- see the sole-Slip branch of _revealAndResolve) is
    // ALREADY the non-Slip pool with nothing extra to exclude. Every other
    // step re-derives from the round's raw bids, and MUST exclude every
    // previously-busted leader in this cascade (`bustLog`), not just the
    // one that just busted -- a 3+-step cascade that only excluded the
    // latest bust would let an earlier busted-out leader's bid re-enter the
    // ranking on the next step.
    const pool =
      cascadeFrom.length > 0
        ? cascadeFrom
        : Object.entries(this.round.bids)
            .map(([id, b]) => ({ id, ...b }))
            .filter((e) => !e.slip && !bustLog.includes(e.id) && !(meta.collided || []).includes(e.id));

    this._resolveRanked(pool, { ...meta, bustChain: bustLog, cascadeFrom: [] });
  }

  _finishRoundResolved(resolution) {
    this.phase = "revealed";
    this.roundsPlayed += 1;
    this.round.resolution = resolution;
    this._pushLog(resolution);

    if (this.roundsPlayed >= this.roundLimit) {
      this._checkOvertimeOrEnd();
    }
    this.ctx.push();
  }

  _pushLog(resolution) {
    let line;
    switch (resolution.kind) {
      case "schooling":
        line = `Schooling Together at ${resolution.value} -- everyone earns 1 BR!`;
        break;
      case "noWinner":
        line = "No survivors this round -- no winner, no Toll.";
        break;
      case "duelUnclaimed":
        line = `DUEL! went unclaimed (${resolution.candidateIds.map((id) => this._name(id)).join(" vs ")}) -- both reset to ${STARTING_STASH}.`;
        break;
      case "win":
        line = resolution.tariffPaidToId
          ? `${this._name(resolution.winnerId)} wins the round — takes the Market of ${resolution.bank}, pays a Toll of ${resolution.tariff} to ${this._name(resolution.tariffPaidToId)}.`
          : `${this._name(resolution.winnerId)} wins the round — takes the Market of ${resolution.bank}${resolution.tariff ? `, Toll ${resolution.tariff}` : ", no Toll owed"}.`;
        break;
      default:
        line = "Round resolved.";
    }
    this.recentLog.unshift(line);
    this.recentLog = this.recentLog.slice(0, 8);
  }

  // ------------------------------------------------------------------
  // DUEL! (highest/second-highest ties, and newcomer join-duels)
  // ------------------------------------------------------------------

  /** Total seated players determines race-vs-vote (note: "2-player game"
   *  races, "3+ player game" votes). This is the whole game's roster size
   *  at the moment the DUEL triggers, not merely how many are tied --
   *  see build report for why. */
  _duelMode() {
    return this._seatedIds().length <= 2 ? "race" : "vote";
  }

  _pushDuel({
    reason,
    candidateIds,
    value,
    onResolved,
    poolSnapshot = null,
    meta = null,
    confirmedHighestId = null,
    confirmedHighestValue = null,
  }) {
    const mode = this._duelMode();
    const duel = {
      reason, // 'highest' | 'second' | 'newcomer'
      candidateIds,
      value: value ?? null,
      mode,
      onResolved,
      votes: {}, // voterId -> candidateId
      voteRound: 0,
      voteHistory: [],
      // Serialization-only fields (see _resolveTierThen's doc comment /
      // _rehydrateDuel below) -- the live onResolved closure above never
      // reads these itself.
      poolSnapshot,
      meta,
      confirmedHighestId,
      confirmedHighestValue,
    };
    this.duelStack.unshift(duel);
    this.phase = "duel";

    if (mode === "race") {
      duel.endsAt = this.ctx.now() + RACE_MS;
      duel.claimedBy = null;
      this.ctx.setTimer("duelRace", RACE_MS);
    }
  }

  _popDuel() {
    this.duelStack.shift();
    if (this.duelStack.length === 0 && this.phase === "duel") {
      // onResolved() already drove us onward (into another duel, or into
      // _settleLeader/_finishRoundResolved which sets this.phase itself);
      // nothing else to do here.
    }
  }

  _handleDuelRace(playerId) {
    const duel = this.duelStack[0];
    if (!duel || this.phase !== "duel" || duel.mode !== "race") return;
    if (!duel.candidateIds.includes(playerId)) return;
    if (duel.claimedBy) return; // already resolved this tick

    // HARD REQUIREMENT: server decides who was first, using ctx.now() /
    // receipt order -- never a client timestamp. First onAction call the
    // server actually processes for this duel wins; there is no client-
    // supplied timing input anywhere in this path.
    duel.claimedBy = playerId;
    this.ctx.clearTimer("duelRace");
    const resolve = duel.onResolved;
    this._popDuel();
    resolve(playerId);
  }

  _resolveRaceTimeout(duel) {
    if (this.duelStack[0] !== duel || duel.claimedBy) return;
    // Flavor (note, "Flavor" section): "If a DUEL! times out unclaimed and
    // a player named 'Hope' is at the table, their BR total on the
    // scoreboard gets a ':)' appended for the rest of the night." Tracked
    // here, surfaced on this game's own screens -- see build report for why
    // the literal room-level scoreboard can't be reached from inside a
    // game module under the current protocol.
    if (this.ctx.players.some((p) => p.name === "Hope")) this.hopeUnlocked = true;
    const resolve = duel.onResolved;
    this._popDuel();
    resolve(null);
  }

  _eligibleVoters(duel) {
    return this._connectedIds().filter((id) => !duel.candidateIds.includes(id));
  }

  _handleDuelVote(playerId, action) {
    const duel = this.duelStack[0];
    if (!duel || this.phase !== "duel" || duel.mode !== "vote") return;
    // Author-can't-vote-on-own-matchup, relay-enforced (PROTOCOL.md §6.3).
    if (duel.candidateIds.includes(playerId)) return;
    if (!this._isConnected(playerId)) return;
    const candidateId = action.candidateId;
    if (!duel.candidateIds.includes(candidateId)) return;

    duel.votes[playerId] = candidateId;
    this._maybeResolveVote(duel);
    this.ctx.push();
  }

  _pendingVoters(duel) {
    return this._eligibleVoters(duel).filter((id) => !(id in duel.votes));
  }

  _maybeResolveVote(duel) {
    if (Object.keys(duel.votes).length === 0) return;
    if (this._pendingVoters(duel).length > 0) return;
    this._tallyAndAdvanceVote(duel);
  }

  _forceResolveVote(duel) {
    if (Object.keys(duel.votes).length === 0) {
      // Nobody has voted at all and the host wants to move on -- break the
      // tie with the seeded PRNG rather than hang forever (deadlock guard;
      // see MAX_VOTE_RECURSION comment above).
      this._settleDuelWinner(duel, seededPick(duel.candidateIds, this.ctx.random));
      return;
    }
    this._tallyAndAdvanceVote(duel);
  }

  _tallyAndAdvanceVote(duel) {
    const tally = {};
    for (const c of duel.candidateIds) tally[c] = 0;
    for (const c of Object.values(duel.votes)) if (c in tally) tally[c] += 1;

    const top = Math.max(...Object.values(tally));
    const winners = duel.candidateIds.filter((id) => tally[id] === top);

    duel.voteHistory.push({ tally: { ...tally } });

    if (winners.length === 1) {
      this._settleDuelWinner(duel, winners[0]);
      return;
    }

    // Vote tied -- note: "DUEL! happens again -- recursively, for as long
    // as it takes." Re-run the SAME candidate pool (only among the tied
    // winners of this ballot -- a candidate who got zero or non-top votes
    // is out) with a fresh ballot.
    duel.candidateIds = winners;
    duel.votes = {};
    duel.voteRound += 1;

    if (duel.voteRound >= MAX_VOTE_RECURSION) {
      this._settleDuelWinner(duel, seededPick(duel.candidateIds, this.ctx.random));
      return;
    }
    this.ctx.toast(null, "info", "The vote tied -- DUEL! again.");
  }

  _settleDuelWinner(duel, winnerId) {
    this._popDuel();
    duel.onResolved(winnerId);
  }

  // ------------------------------------------------------------------
  // Fresh Catch / Poach (mid-game joins)
  // ------------------------------------------------------------------

  _openOrJoinPoachWindow(playerId) {
    if (this.poach) {
      if (!this.poach.candidateIds.includes(playerId)) this.poach.candidateIds.push(playerId);
      return;
    }
    // Interrupt whatever was happening -- the note voids the round in
    // progress unconditionally on a Fresh Catch / Poach.
    if (this.phase === "duel") {
      const duel = this.duelStack[0];
      if (duel && duel.mode === "race") this.ctx.clearTimer("duelRace");
    }
    this.duelStack = [];
    this.poach = {
      candidateIds: [playerId],
      priorPhase: this.phase,
      endsAt: this.ctx.now() + POACH_WINDOW_MS,
    };
    this.phase = "poach";
    this.ctx.setTimer("poach", POACH_WINDOW_MS);
  }

  _resolvePoachWindow() {
    if (!this.poach) return;
    const candidates = this.poach.candidateIds.filter((id) => this._seatedIds().includes(id));
    this.poach = null;

    if (candidates.length === 0) {
      // Everyone who tried to join has since left again -- just resume.
      this._startRound();
      return;
    }

    const bank = this._bank();

    if (candidates.length === 1) {
      this._awardPoach(candidates[0], bank, []);
      return;
    }

    // 2+ newcomers: "they DUEL each other ... until one wins the Bank
    // outright. Every newcomer who lost that join-DUEL still gets a
    // consolation Stash worth 75% of the winner's award, each."
    this._pushDuel({
      reason: "newcomer",
      candidateIds: candidates,
      value: null,
      onResolved: (winnerId) => {
        const losers = candidates.filter((id) => id !== winnerId);
        if (winnerId == null) {
          // Degenerate: a newcomer join-duel is only ever 'vote' mode in
          // practice (see build report), but guard the 'race'-timeout path
          // anyway rather than assume -- seeded pick keeps this terminating
          // and fair instead of silently dropping the newcomers' stashes.
          const forced = seededPick(candidates, this.ctx.random);
          this._awardPoach(forced, bank, candidates.filter((id) => id !== forced));
          return;
        }
        this._awardPoach(winnerId, bank, losers);
      },
    });
  }

  _awardPoach(winnerId, bank, loserIds) {
    this.stashes[winnerId] = bank;
    for (const id of loserIds) this.stashes[id] = Math.floor(bank * 0.75);
    this.recentLog.unshift(
      loserIds.length
        ? `${this._name(winnerId)} poached the Bank (${bank}) over ${loserIds.map((id) => this._name(id)).join(", ")}.`
        : `${this._name(winnerId)} poached the Market (${bank}).`
    );
    this.recentLog = this.recentLog.slice(0, 8);
    this._startRound();
  }

  // ------------------------------------------------------------------
  // disconnect / leave cleanup (deadlock avoidance)
  // ------------------------------------------------------------------

  _purgePlayerFromRoundState(playerId) {
    if (this.poach) {
      this.poach.candidateIds = this.poach.candidateIds.filter((id) => id !== playerId);
    }
    if (this.round) {
      this.round.participantIds = this.round.participantIds.filter((id) => id !== playerId);
      if (this.phase === "bidding" && !this.round.revealed) this._maybeReveal();
    }
    const duel = this.duelStack[0];
    if (duel && this.phase === "duel") {
      if (duel.mode === "vote") delete duel.votes[playerId];

      if (duel.candidateIds.includes(playerId)) {
        // A DUEL candidate left mid-duel (either mode). Remaining
        // candidates carry on; if only one is left, they win by default --
        // nothing left to resolve against, in either a vote or a race, and
        // leaving a race's timer live for a single remaining racer would
        // (a) let a departed player's stash key get resurrected by the
        // unclaimed-race reset path if they somehow don't claim in time,
        // and (b) hold PROTOCOL's clear-cut "server decides" guarantee
        // hostage to a person who is no longer in the room. Not spelled
        // out in the note; the least surprising reading of "don't
        // deadlock" for a duel specifically.
        duel.candidateIds = duel.candidateIds.filter((id) => id !== playerId);
        if (duel.mode === "race") this.ctx.clearTimer("duelRace");

        if (duel.candidateIds.length === 1) {
          this._settleDuelWinner(duel, duel.candidateIds[0]);
          return;
        }
        if (duel.candidateIds.length === 0) {
          this._settleDuelWinner(duel, null);
          return;
        }
      }

      if (duel.mode === "vote") this._maybeResolveVote(duel);
    }
  }

  // ------------------------------------------------------------------
  // Overtime + game end
  // ------------------------------------------------------------------

  _checkOvertimeOrEnd() {
    const ids = this._seatedIds().filter((id) => id in this.stashes);
    if (ids.length === 0) {
      this.pendingGameEnd = { reason: "roundLimit", awards: [] };
      return;
    }
    const top = Math.max(...ids.map((id) => this.stashes[id]));
    const leaders = ids.filter((id) => this.stashes[id] === top);

    if (leaders.length >= 2) {
      // Overtime: note: "add 3 more rounds. Still tied? Add 3 more. Still
      // tied after that? Switch to adding one round at a time."
      this.overtimeExtensions += 1;
      const block = this.overtimeExtensions <= 2 ? 3 : 1;
      this.roundLimit += block;
      this.ctx.toast(null, "info", `Tied for the lead -- Overtime! +${block} round${block > 1 ? "s" : ""}.`);
      return;
    }

    this.pendingGameEnd = {
      reason: "roundLimit",
      awards: [{ playerId: leaders[0], points: 1 }],
    };
  }

  // ------------------------------------------------------------------
  // views
  // ------------------------------------------------------------------

  _standings() {
    return this.ctx.players
      .map((p) => ({
        id: p.id,
        name: p.name,
        connected: p.connected,
        stash: this.stashes[p.id] ?? 0,
        hope: this.hopeUnlocked && p.name === "Hope",
      }))
      .sort((a, b) => b.stash - a.stash);
  }

  _duelPublicView(duel) {
    return {
      reason: duel.reason,
      value: duel.value,
      mode: duel.mode,
      candidates: duel.candidateIds.map((id) => ({ id, name: this._name(id) })),
      endsAt: duel.mode === "race" ? duel.endsAt : null,
      claimedBy: duel.mode === "race" ? duel.claimedBy : null,
      votesIn: duel.mode === "vote" ? Object.keys(duel.votes).length : null,
      votesNeeded: duel.mode === "vote" ? this._eligibleVoters(duel).length : null,
      voteRound: duel.voteRound,
    };
  }

  _revealedBidsPublic() {
    if (!this.round || !this.round.revealed) return null;
    return this.round.participantIds
      .filter((id) => this.round.bids[id])
      .map((id) => ({ id, name: this._name(id), ...this.round.bids[id] }));
  }

  displayView() {
    const base = {
      bank: this._bank(),
      roundsPlayed: this.roundsPlayed,
      roundLimit: this.roundLimit,
      overtimeExtensions: this.overtimeExtensions,
      standings: this._standings(),
      log: this.recentLog,
    };

    if (this.phase === "poach") {
      return {
        view: "poach",
        data: {
          ...base,
          candidates: this.poach.candidateIds.map((id) => ({ id, name: this._name(id) })),
          endsAt: this.poach.endsAt,
        },
      };
    }

    if (this.phase === "duel") {
      const duel = this.duelStack[0];
      return {
        view: duel.mode === "race" ? "duel-race" : "duel-vote",
        data: { ...base, duel: this._duelPublicView(duel) },
      };
    }

    if (this.phase === "revealed") {
      return {
        view: "revealed",
        data: {
          ...base,
          bids: this._revealedBidsPublic(),
          resolution: this._resolutionForView(this.round.resolution),
          gameEnding: !!this.pendingGameEnd,
        },
      };
    }

    // 'bidding'
    return {
      view: "bidding",
      data: {
        ...base,
        submittedCount: this.round.submittedIds.length,
        participantCount: this.round.participantIds.length,
      },
    };
  }

  _resolutionForView(resolution) {
    if (!resolution) return null;
    // Names resolved server-side so the client never needs to cross-reference.
    const withNames = { ...resolution };
    if (withNames.winnerId) withNames.winnerName = this._name(withNames.winnerId);
    if (withNames.candidateIds) {
      withNames.candidateNames = withNames.candidateIds.map((id) => this._name(id));
    }
    return withNames;
  }

  controllerView(playerId) {
    const base = {
      bank: this._bank(),
      myStash: this.stashes[playerId] ?? 0,
      roundsPlayed: this.roundsPlayed,
      roundLimit: this.roundLimit,
    };

    if (this.phase === "poach") {
      const isCandidate = this.poach.candidateIds.includes(playerId);
      return {
        view: "poach",
        data: {
          ...base,
          isCandidate,
          multiway: this.poach.candidateIds.length > 1,
          endsAt: this.poach.endsAt,
        },
      };
    }

    if (this.phase === "duel") {
      const duel = this.duelStack[0];
      const isCandidate = duel.candidateIds.includes(playerId);
      const isVoter = duel.mode === "vote" && !isCandidate && this._isConnected(playerId);
      return {
        view: duel.mode === "race" ? "duel-race" : "duel-vote",
        data: {
          ...base,
          duel: this._duelPublicView(duel),
          isCandidate,
          isVoter,
          myVote: duel.votes[playerId] ?? null,
          alreadyClaimed: duel.mode === "race" ? !!duel.claimedBy : null,
        },
      };
    }

    if (this.phase === "revealed") {
      return {
        view: "revealed",
        data: {
          ...base,
          bids: this._revealedBidsPublic(),
          resolution: this._resolutionForView(this.round.resolution),
          gameEnding: !!this.pendingGameEnd,
        },
      };
    }

    // 'bidding' -- HARD REQUIREMENT: never include another player's bid here.
    const myBid = this.round.bids[playerId] || null;
    return {
      view: "bidding",
      data: {
        ...base,
        hasSubmitted: this.round.submittedIds.includes(playerId),
        myBid, // only ever this player's own value -- see round.bids access pattern above
        waitingOn: this._pendingBidders().length,
      },
    };
  }

  // ------------------------------------------------------------------
  // persistence
  // ------------------------------------------------------------------

  serialize() {
    return {
      roundLimit: this.roundLimit,
      roundsPlayed: this.roundsPlayed,
      overtimeExtensions: this.overtimeExtensions,
      stashes: this.stashes,
      phase: this.phase,
      round: this.round,
      // Functions (`onResolved`) obviously can't survive JSON. Persist just
      // enough of each duel frame to rebuild it structurally; `onResolved`
      // is re-wired in restore() by re-deriving what it needs to do from
      // `reason` + the round/poach context, which is itself fully
      // serialized alongside it.
      duelStack: this.duelStack.map((d) => ({
        reason: d.reason,
        candidateIds: d.candidateIds,
        value: d.value,
        mode: d.mode,
        votes: d.votes,
        voteRound: d.voteRound,
        voteHistory: d.voteHistory,
        endsAt: d.endsAt ?? null,
        claimedBy: d.claimedBy ?? null,
        poolSnapshot: d.poolSnapshot ?? null,
        meta: d.meta ?? null,
        confirmedHighestId: d.confirmedHighestId ?? null,
        confirmedHighestValue: d.confirmedHighestValue ?? null,
      })),
      poach: this.poach,
      pendingGameEnd: this.pendingGameEnd,
      hopeUnlocked: this.hopeUnlocked,
      recentLog: this.recentLog,
    };
  }

  restore(saved) {
    this._resetState();
    if (!saved) return;
    this.roundLimit = saved.roundLimit ?? DEFAULT_ROUND_LIMIT;
    this.roundsPlayed = saved.roundsPlayed ?? 0;
    this.overtimeExtensions = saved.overtimeExtensions ?? 0;
    this.stashes = saved.stashes ?? {};
    this.phase = saved.phase ?? "bidding";
    this.round = saved.round ?? null;
    this.poach = saved.poach ?? null;
    this.pendingGameEnd = saved.pendingGameEnd ?? null;
    this.hopeUnlocked = saved.hopeUnlocked ?? false;
    this.recentLog = saved.recentLog ?? [];

    // Rebuild duel frames with a live onResolved closure. Every duel this
    // game ever pushes resolves through exactly one of two shapes: a
    // newcomer Poach-duel, or a highest/second tier resolution inside
    // _resolveRanked -- for the latter, `poolSnapshot`/`meta`/
    // `confirmedHighest*` (persisted by _pushDuel specifically so this
    // works) let us rebuild the exact same continuation _resolveTierThen
    // itself would have wired up, without re-deriving "what's already been
    // excluded" from round.bids -- see the doc comment on _resolveTierThen.
    // This is what makes a hibernation-mid-DUEL round-trip (including a
    // DUEL that is itself mid-cascade, after one or more Busts) safe.
    this.duelStack = (saved.duelStack || []).map((d) => this._rehydrateDuel(d));
  }

  _rehydrateDuel(d) {
    const duel = {
      reason: d.reason,
      candidateIds: d.candidateIds,
      value: d.value,
      mode: d.mode,
      votes: d.votes || {},
      voteRound: d.voteRound || 0,
      voteHistory: d.voteHistory || [],
      endsAt: d.endsAt ?? null,
      claimedBy: d.claimedBy ?? null,
      poolSnapshot: d.poolSnapshot ?? null,
      meta: d.meta ?? null,
      confirmedHighestId: d.confirmedHighestId ?? null,
      confirmedHighestValue: d.confirmedHighestValue ?? null,
    };

    if (d.reason === "newcomer") {
      duel.onResolved = (winnerId) => {
        const bank = this._bank();
        const originalCandidates = d.candidateIds; // the full original newcomer pool
        if (winnerId == null) {
          const forced = seededPick(originalCandidates, this.ctx.random);
          this._awardPoach(forced, bank, originalCandidates.filter((id) => id !== forced));
          return;
        }
        this._awardPoach(winnerId, bank, originalCandidates.filter((id) => id !== winnerId));
      };
      return duel;
    }

    // 'highest' or 'second'.
    duel.onResolved = (winnerId) => {
      if (winnerId == null) {
        for (const id of d.candidateIds) this.stashes[id] = STARTING_STASH;
        this._finishRoundResolved({ kind: "duelUnclaimed", candidateIds: d.candidateIds });
        return;
      }
      const pool = d.poolSnapshot || [];
      const meta = d.meta || { collided: [], soleSlip: null };
      // Only the confirmed winner drops out of the pool -- a DUEL loser is
      // still at the tied value and stays in contention for the next tier
      // down (see the matching comment in the live path, _resolveTierThen,
      // for why "the whole tied group drops out" would be wrong here).
      const rest = pool.filter((e) => e.id !== winnerId);

      if (d.reason === "highest") {
        if (rest.length === 0) {
          this._settleLeader(winnerId, d.value, 0, meta);
          return;
        }
        this._resolveTierThen(
          "second",
          rest,
          [winnerId],
          meta,
          (secondId, secondValue) => {
            this._settleLeader(winnerId, d.value, secondValue, meta, secondId);
          },
          { confirmedHighestId: winnerId, confirmedHighestValue: d.value }
        );
        return;
      }

      // reason === 'second': the highest tier was already confirmed before
      // this duel was pushed (see _resolveRanked) -- its id/value travel
      // with this frame specifically so this branch doesn't need to.
      // This duel decided the SECOND-highest slot, so its winner is exactly
      // the player the Tariff is owed to.
      this._settleLeader(d.confirmedHighestId, d.confirmedHighestValue, d.value, meta, winnerId);
    };
    return duel;
  }
}
