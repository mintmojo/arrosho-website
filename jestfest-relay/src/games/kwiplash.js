// Kwiplash — server-side state machine.
//
// Source of truth for rules and prompts: `/mnt/user-data/uploads/T.O.D.O/Kwiplash.md`
// (do not re-derive rules or invent prompts; the 60 prompts below are copied
// verbatim from that file, including its one apparent typo — see #57,
// "Toliet" — left as written rather than silently "corrected").
//
// Wire contract: PROTOCOL.md §5 (server module) and §6 (non-negotiables).
// See /tmp/build-notes/kwiplash.md for the evidence log (rules read,
// ambiguities resolved, what got verified with running code) written while
// building this.
//
// ---------------------------------------------------------------------
// Shape, in one paragraph: two "normal" rounds (Round 1, Round 2), each a
// writing phase (every player gets ~2 prompts, paired with a different
// partner per prompt, decided server-side) followed by one paired-vote
// matchup at a time (everyone except that prompt's two authors votes,
// enforced server-side even if a client forges a vote), each matchup
// revealed and scored (more votes = more points, unanimous = landslide
// bonus) before the Display advances to the next. Then a final "Kwiplash!"
// round: one shared prompt, everyone writes, everyone votes gold/silver/
// bronze excluding themselves, scored and revealed. Whoever has the most
// *internal* points across all three rounds gets the game's BR award.
// ---------------------------------------------------------------------

// PROMPTS — copied verbatim from Kwiplash.md's numbered list (1-60), in
// the exact order and wording written there.
const PROMPTS = [
  "A bad first line for your award acceptance speech",
  "A bad thing to say to a cashier while paying for an item",
  "A fun thing to do while taking a bubble bath",
  "A fun thing to think about",
  "A good fake name to use when hiring for a job",
  "A good sign that you're bad at playing League of Legends",
  "A good way to get kicked out of a K-Pop concert",
  "A great name to have on a fake driver's license",
  'A great new invention that starts with "Automatic"',
  "A great opening line to start a conversation with a stranger at a party",
  "A name for a brand of designer adult diapers",
  "A rejected crayon color",
  "A rejected name for a ship in the U.S. Naval Fleet: the USS ...",
  "A terrifying fortune cookie fortune",
  "A Tweet from a caveman",
  "A tourist attraction",
  "An angry review you'd give this game",
  "An item on every moron's Amazon cart",
  "Disney Jr. has decided to replace Mickey Mouse Clubhouse with ...",
  "Fun thing to do if locked in the mall overnight",
  "If animals took over, an exhibit you'd see at the human zoo",
  "Little-known fact: The government allows peanut butter to contain up to 10% ...",
  "One place a foot shouldn't go",
  "One thing never to do on a first date",
  "Pants would be a whole lot better if they",
  "Something you probably shouldn't bring on a trip to the Sahara desert",
  "Something you shouldn't wear to Prom",
  "The best way to start your day before school",
  "The crime you would commit if you could get away with it",
  "The first commandment in the new religion you started",
  "The most awesome Guinness World Record to break",
  "The reason flamingoes stand on one leg",
  "The sound a tree actually makes when it falls and no one is around to hear it",
  "The weirdest name for a rock band",
  "The worst breakfast cereal:",
  "The worst Halloween costume for a young child",
  "The worst name for a funeral home",
  "The worst name for a guinea pig",
  "There's Gryffindor, Ravenclaw, Slytherin, and Hufflepuff, but what's the Hogwarts house few have ever heard of?",
  "Thing you'd be most surprised to have a dentist find in your mouth",
  "What a moron would say at a aquarium",
  "What kittens would say if they could talk",
  "What to say to get out of jury duty",
  "What you'd guess is an unadvertised ingredient in most hot dogs",
  "Your last words before you're burned in Salem as a witch",
  "Hear me out:",
  "A rainbow doesn't have gold at the end of it. It actually has __",
  '"Do you know why I pulled you over?"',
  "I really like to ... when I get scared",
  "Best way to end a party",
  "Neighbor's knocking at the door, what's he asking for?",
  "Why did the chicken really cross the road?",
  "I didn't mean to kill him! I just...",
  "Instead of a bad word say ... instead!",
  "My imaginary friend is...",
  "Worst response from a magic 8 ball",
  "Name for a Toliet company",
  "3 greatest words in the English language",
  "Best place to bury all those bodies",
  "Most intriguing phrase to find in a dating profile",
];

// ---------------------------------------------------------------------
// Tuning. Kwiplash.md only pins down the writing timer ("usually 60-90s")
// and the general shape of scoring ("more votes, more points... landslide
// win can earn a bonus... final round... higher stakes and bigger point
// swings"). Everything below that isn't a specific number in that source
// is a documented design choice made here — see /tmp/build-notes/kwiplash.md
// "ambiguities resolved" for the full reasoning.
// ---------------------------------------------------------------------

// Each player gets exactly one prompt per normal round (paired with one
// partner, decided server-side). Kwiplash.md says players answer "several
// different prompts" without pinning a per-round count; read as a
// whole-game total, one prompt in Round 1 + one in Round 2 + one shared
// prompt in the final round is "several different prompts" across the
// night. This is also the simplest reading, and it's what keeps "each
// prompt shown to only two players" cleanly 1:1 with "one round of
// writing, one round of voting" instead of needing multiple concurrent
// prompts in flight per player.
const PROMPTS_PER_PLAYER_PER_ROUND = 2;  // cycle pairing puts every player in exactly two matchups

const ROUND_CONFIG = [
  { label: "Round 1", pointsPerVote: 100, landslideBonus: 100, writingMs: 60_000 },
  { label: "Round 2", pointsPerVote: 200, landslideBonus: 200, writingMs: 75_000 },
];
const FINAL_CONFIG = { label: "Kwiplash!", gold: 300, silver: 150, bronze: 50, writingMs: 90_000 };

// Not spec'd by Kwiplash.md at all (only the writing timer is). A voting
// timer exists purely so the round can't stall forever on a connected
// player who simply never taps a vote -- see checkVotingComplete/
// finishVoting below. 20s is in line with how little time real
// Jackbox-style games give you to read two one-liners and pick.
const VOTING_MS = 20_000;

const NO_ANSWER_PLACEHOLDER = "(no answer)";
const MAX_ANSWER_LEN = 140;

function shuffle(arr, rand) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sanitizeAnswer(text) {
  return String(text == null ? "" : text)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_ANSWER_LEN);
}

export default class Kwiplash {
  static id = "kwiplash";
  static title = "Kwiplash";
  static minPlayers = 3;
  static maxPlayers = null;
  // Kwiplash.md's pairing/exclusion mechanic is decided at round-build
  // time from the current roster; a mid-game arrival wouldn't have a
  // sensible place to join. Jest fest-spec.md §5.2 confirms: "no mid-game
  // joins to handle."
  static allowsMidGameJoin = false;

  constructor(ctx) {
    this.ctx = ctx;
    this.stage = "round"; // 'round' | 'final'
    this.roundIndex = 0; // index into ROUND_CONFIG while stage === 'round'
    this.phase = "writing"; // 'writing' | 'voting' | 'reveal' | 'standings' | 'final-voting' | 'final-reveal'
    this.matchups = []; // current round's pairwise matchups
    this.currentMatchupIndex = -1;
    this.finalRound = null; // { id, promptText, authors, answers, ballots, result }
    this.scores = {}; // playerId -> cumulative internal points across the whole game
    this.promptDeck = []; // shuffled, not-yet-used indices into PROMPTS
    this.writingEndsAt = null;
    this.votingEndsAt = null;
  }

  // -- lifecycle -----------------------------------------------------------

  start() {
    this.scores = {};
    for (const p of this.ctx.players) this.scores[p.id] = 0;
    this.stage = "round";
    this.roundIndex = 0;
    this.startRound();
  }

  onAction(playerId, action) {
    if (!action || typeof action.action !== "string") return;
    switch (action.action) {
      case "submit":
        this.handleSubmit(playerId, action);
        break;
      case "vote":
        this.handleVote(playerId, action);
        break;
      case "ballot":
        this.handleBallot(playerId, action);
        break;
      default:
        break; // unknown action: ignore, don't error (PROTOCOL.md §1's spirit)
    }
  }

  onAdvance() {
    if (this.stage === "round") {
      if (this.phase === "reveal") {
        this.currentMatchupIndex++;
        if (this.currentMatchupIndex < this.matchups.length) {
          this.startVotingForCurrentMatchup();
        } else {
          this.phase = "standings";
        }
      } else if (this.phase === "standings") {
        if (this.roundIndex + 1 < ROUND_CONFIG.length) {
          this.roundIndex++;
          this.startRound();
        } else {
          this.stage = "final";
          this.startFinalRound();
        }
      }
      // Display pressing advance during 'writing'/'voting' has nothing to
      // do -- those phases only ever end via a submit/vote completing them
      // or a server timer. Ignored, not errored.
    } else if (this.stage === "final") {
      if (this.phase === "final-reveal") {
        this.finishGame();
      }
    }
  }

  onPlayerJoin() {
    // allowsMidGameJoin is false; room.js never calls this.
  }

  onPlayerLeave(playerId) {
    void playerId;
    // A player who has fully left (past the 180s reconnect grace) is
    // already gone from ctx.players by the time this fires. Re-run
    // whichever completion check applies to the current phase, in case
    // this departure was the last thing the round was waiting on --
    // otherwise a writing/voting phase would just stall until its timer,
    // which is correct-but-slow; resolving immediately here is snappier.
    if (this.phase === "writing" && this.checkWritingComplete()) this.finishWriting();
    else if (this.phase === "voting" && this.checkVotingComplete()) this.finishVoting();
    else if (this.phase === "final-voting" && this.checkFinalVotingComplete()) this.finishFinalVoting();
  }

  onPlayerReconnect(player) {
    this.ctx.pushTo(player.id);
  }

  onTimer(name) {
    if (name === "writing" && this.phase === "writing") {
      this.finishWriting();
    } else if (name === "voting" && this.phase === "voting") {
      this.finishVoting();
    } else if (name === "voting" && this.phase === "final-voting") {
      this.finishFinalVoting();
    }
  }

  // -- round / prompt setup -------------------------------------------------

  drawPrompt() {
    if (!this.promptDeck || this.promptDeck.length === 0) {
      this.promptDeck = shuffle(
        PROMPTS.map((_, i) => i),
        () => this.ctx.random()
      );
    }
    const idx = this.promptDeck.pop();
    return PROMPTS[idx];
  }

  /**
   * Builds this round's pairwise matchups: every player currently seated
   * (connected or still within reconnect grace -- ctx.players is the live
   * roster either way) is shuffled into a random order (ctx.random(),
   * seeded, server-side -- Jest fest-spec.md §5.2) and paired up with the
   * next player in that order, WRAPPING AROUND so the pairing forms a single
   * cycle: player i is paired with player i+1, and the last is paired back to
   * the first. That yields exactly n matchups for n players, and puts every
   * player in exactly TWO of them, with two different partners.
   *
   * Why the cycle rather than simple two-at-a-time chunking: Kwiplash.md says
   * "each player answers several different prompts". Chunking gives each
   * player one prompt and, on an odd roster, benches somebody for the whole
   * round -- which is both a rules deviation and miserable at a party.
   * The cycle keeps exactly two authors per prompt (which is what the
   * voting-exclusion mechanic needs) while never sitting anyone out.
   * Requires n >= 3, which is Kwiplash's documented minimum anyway.
   */
  buildRoundMatchups() {
    const ids = this.ctx.players.map((p) => p.id);
    const order = shuffle(ids, () => this.ctx.random());
    const matchups = [];
    let n = 0;
    const count = order.length;
    // A 2-player room can only support one matchup; below Kwiplash's minimum
    // anyway, but guard so the cycle never pairs a player with themselves.
    const limit = count < 3 ? Math.max(0, count - 1) : count;
    for (let i = 0; i < limit; i += 1) {
      const a = order[i];
      const b = order[(i + 1) % count];
      matchups.push({
        id: `r${this.roundIndex}-m${n++}`,
        promptText: this.drawPrompt(),
        authors: [a, b],
        answers: { [a]: null, [b]: null },
        votes: {},
        revealed: false,
        result: null,
      });
    }
    return matchups;
  }

  startRound() {
    const cfg = ROUND_CONFIG[this.roundIndex];
    this.matchups = this.buildRoundMatchups();
    this.currentMatchupIndex = -1;
    this.phase = "writing";
    this.writingEndsAt = this.ctx.now() + cfg.writingMs;
    this.ctx.setTimer("writing", cfg.writingMs);
  }

  startFinalRound() {
    const ids = this.ctx.players.map((p) => p.id);
    this.finalRound = {
      id: "final",
      promptText: this.drawPrompt(),
      authors: ids,
      answers: Object.fromEntries(ids.map((id) => [id, null])),
      ballots: {},
      result: null,
    };
    this.phase = "writing";
    this.writingEndsAt = this.ctx.now() + FINAL_CONFIG.writingMs;
    this.ctx.setTimer("writing", FINAL_CONFIG.writingMs);
  }

  startVotingForCurrentMatchup() {
    this.phase = "voting";
    this.votingEndsAt = this.ctx.now() + VOTING_MS;
    this.ctx.setTimer("voting", VOTING_MS);
  }

  // -- writing ---------------------------------------------------------------

  handleSubmit(playerId, action) {
    if (this.phase !== "writing") return;
    const set = this.stage === "final" ? [this.finalRound] : this.matchups;
    const m = set.find((mm) => mm && mm.id === action.promptId);
    if (!m || !m.authors.includes(playerId)) return;
    const text = sanitizeAnswer(action.text);
    if (!text) return;
    m.answers[playerId] = text;
    if (this.checkWritingComplete()) this.finishWriting();
  }

  /** True once every currently-CONNECTED author in the active writing set
   *  has submitted. A seat that's disconnected (even mid-grace) never
   *  blocks this -- Kwiplash.md hard requirement: a round must be able to
   *  complete without deadlocking on someone who left. Their prompt gets
   *  a placeholder answer at finishWriting() either way. */
  checkWritingComplete() {
    const set = this.stage === "final" ? [this.finalRound] : this.matchups;
    const activeIds = new Set(this.ctx.players.filter((p) => p.connected).map((p) => p.id));
    for (const m of set) {
      if (!m) continue;
      for (const pid of m.authors) {
        if (activeIds.has(pid) && m.answers[pid] == null) return false;
      }
    }
    return true;
  }

  /** Called either because everyone active finished early, or because the
   *  server-owned writing timer fired -- PROTOCOL.md §6.1: only the server
   *  decides time is up, never a client "I'm done". Either path fills any
   *  still-blank answer (an author who never submitted, connected or not)
   *  with a placeholder so voting/reveal never has to handle a null. */
  finishWriting() {
    this.ctx.clearTimer("writing");
    const set = this.stage === "final" ? [this.finalRound] : this.matchups;
    for (const m of set) {
      if (!m) continue;
      for (const pid of m.authors) {
        if (m.answers[pid] == null) m.answers[pid] = NO_ANSWER_PLACEHOLDER;
      }
    }
    if (this.stage === "final") {
      this.phase = "final-voting";
      this.votingEndsAt = this.ctx.now() + VOTING_MS;
      this.ctx.setTimer("voting", VOTING_MS);
    } else if (this.matchups.length === 0) {
      // Roster shrank below 2 mid-game; nothing to vote on this round.
      this.phase = "standings";
    } else {
      this.currentMatchupIndex = 0;
      this.startVotingForCurrentMatchup();
    }
  }

  // -- pairwise voting (Round 1 / Round 2) ------------------------------------

  handleVote(playerId, action) {
    if (this.phase !== "voting") return;
    const m = this.matchups[this.currentMatchupIndex];
    if (!m || m.id !== action.matchupId) return;
    if (m.authors.includes(playerId)) {
      // Hard requirement: the exclusion is enforced here, on the relay,
      // not by the client merely hiding a vote button -- a forged vote
      // from an author is rejected outright, not just discouraged.
      this.ctx.toast(playerId, "error", "You can't vote on your own matchup.");
      return;
    }
    if (action.choice !== "A" && action.choice !== "B") return;
    m.votes[playerId] = action.choice;
    if (this.checkVotingComplete()) this.finishVoting();
  }

  checkVotingComplete() {
    const m = this.matchups[this.currentMatchupIndex];
    if (!m) return false;
    const activeIds = this.ctx.players.filter((p) => p.connected).map((p) => p.id);
    const eligible = activeIds.filter((id) => !m.authors.includes(id));
    if (eligible.length === 0) return true; // nobody currently CAN vote; don't stall on that
    return eligible.every((id) => m.votes[id] !== undefined);
  }

  addScore(playerId, points) {
    this.scores[playerId] = (this.scores[playerId] || 0) + points;
  }

  finishVoting() {
    this.ctx.clearTimer("voting");
    const m = this.matchups[this.currentMatchupIndex];
    const cfg = ROUND_CONFIG[this.roundIndex];
    const [authorA, authorB] = m.authors;
    let countA = 0;
    let countB = 0;
    for (const v of Object.values(m.votes)) {
      if (v === "A") countA++;
      else if (v === "B") countB++;
    }
    const total = countA + countB;
    const aAnswered = m.answers[authorA] !== NO_ANSWER_PLACEHOLDER;
    const bAnswered = m.answers[authorB] !== NO_ANSWER_PLACEHOLDER;
    let pointsA = aAnswered ? countA * cfg.pointsPerVote : 0;
    let pointsB = bAnswered ? countB * cfg.pointsPerVote : 0;
    let landslide = null;
    // Landslide = every vote cast in this matchup went the same way (and
    // at least one vote was cast). Kwiplash.md: "A landslide win (like
    // unanimous votes) can earn a bonus." A no-answer placeholder can
    // never itself be a landslide winner.
    if (total > 0 && countA === total && aAnswered) {
      pointsA += cfg.landslideBonus;
      landslide = "A";
    } else if (total > 0 && countB === total && bAnswered) {
      pointsB += cfg.landslideBonus;
      landslide = "B";
    }
    m.result = { countA, countB, pointsA, pointsB, landslide };
    this.addScore(authorA, pointsA);
    this.addScore(authorB, pointsB);
    m.revealed = true;
    this.phase = "reveal";
  }

  // -- final round: gold/silver/bronze ranked voting --------------------------

  handleBallot(playerId, action) {
    if (this.phase !== "final-voting") return;
    const fr = this.finalRound;
    if (!fr) return;
    const candidates = new Set(fr.authors);
    const picks = ["gold", "silver", "bronze"].map((k) => (action[k] == null ? null : action[k]));
    const seen = new Set();
    for (const pick of picks) {
      if (pick == null) continue;
      if (pick === playerId) return; // can't vote for yourself -- reject the whole ballot
      if (!candidates.has(pick)) return; // not a real participant this round
      if (seen.has(pick)) return; // can't pick the same person twice on one ballot
      seen.add(pick);
    }
    fr.ballots[playerId] = { gold: picks[0], silver: picks[1], bronze: picks[2] };
    if (this.checkFinalVotingComplete()) this.finishFinalVoting();
  }

  /** Unlike pairwise voting, EVERYONE (including this round's authors)
   *  is an eligible voter here -- Kwiplash.md: "all respond and vote for
   *  a gold, silver and bronze not including their own." The exclusion is
   *  per-pick (can't name yourself), not whole-ballot. */
  checkFinalVotingComplete() {
    const fr = this.finalRound;
    if (!fr) return false;
    const activeIds = this.ctx.players.filter((p) => p.connected).map((p) => p.id);
    if (activeIds.length === 0) return true;
    return activeIds.every((id) => fr.ballots[id] !== undefined);
  }

  finishFinalVoting() {
    this.ctx.clearTimer("voting");
    const fr = this.finalRound;
    const tally = {};
    for (const id of fr.authors) {
      tally[id] = { gold: 0, silver: 0, bronze: 0, points: 0, answered: fr.answers[id] !== NO_ANSWER_PLACEHOLDER };
    }
    for (const ballot of Object.values(fr.ballots)) {
      if (ballot.gold && tally[ballot.gold]) tally[ballot.gold].gold++;
      if (ballot.silver && tally[ballot.silver]) tally[ballot.silver].silver++;
      if (ballot.bronze && tally[ballot.bronze]) tally[ballot.bronze].bronze++;
    }
    for (const id of fr.authors) {
      const t = tally[id];
      t.points = t.answered ? t.gold * FINAL_CONFIG.gold + t.silver * FINAL_CONFIG.silver + t.bronze * FINAL_CONFIG.bronze : 0;
      this.addScore(id, t.points);
    }
    fr.result = tally;
    fr.revealed = true;
    this.phase = "final-reveal";
  }

  // -- game end ----------------------------------------------------------------

  /** Kwiplash.md, "Winning": "Whoever has the most points after the final
   *  round wins a BR point" -- singular winner, singular point. Read
   *  literally: the per-round point totals (votes/landslide/gold-silver-
   *  bronze) are Kwiplash's own in-game scoreboard, not a 1:1 BR feed:
   *  only the top scorer(s) convert to Bragging Rights, 1 BR point each
   *  (ties share it -- Kwiplash.md doesn't say, and splitting fractional
   *  BR seemed worse than just giving each tied leader the full point).
   *  See /tmp/build-notes/kwiplash.md for the alternative reading
   *  considered (proportional BR per point) and why this one was picked. */
  finishGame() {
    const entries = Object.entries(this.scores);
    let awards = [];
    if (entries.length > 0) {
      const topScore = Math.max(...entries.map(([, v]) => v));
      awards = entries.filter(([, v]) => v === topScore).map(([playerId]) => ({ playerId, points: 1 }));
    }
    this.ctx.end(awards);
  }

  // -- view helpers --------------------------------------------------------

  roundLabel() {
    return this.stage === "final" ? FINAL_CONFIG.label : ROUND_CONFIG[this.roundIndex].label;
  }

  playerName(id) {
    const p = this.ctx.players.find((pp) => pp.id === id);
    return p ? p.name : "A departed player";
  }

  writingSharedData() {
    const set = this.stage === "final" ? [this.finalRound] : this.matchups;
    const perPlayer = {};
    for (const m of set) {
      if (!m) continue;
      for (const pid of m.authors) {
        perPlayer[pid] = perPlayer[pid] || { total: 0, done: 0 };
        perPlayer[pid].total++;
        if (m.answers[pid] != null) perPlayer[pid].done++;
      }
    }
    const players = Object.keys(perPlayer);
    const doneCount = players.filter((pid) => perPlayer[pid].done === perPlayer[pid].total).length;
    return {
      round: this.roundLabel(),
      endsAt: this.writingEndsAt,
      submittedPlayers: doneCount,
      totalPlayers: players.length,
    };
  }

  writingControllerData(playerId) {
    const set = this.stage === "final" ? [this.finalRound] : this.matchups;
    const mine = set.filter((m) => m && m.authors.includes(playerId));
    return {
      ...this.writingSharedData(),
      prompts: mine.map((m) => ({
        promptId: m.id,
        text: m.promptText,
        submitted: m.answers[playerId] != null,
        myAnswer: m.answers[playerId] ?? "",
      })),
    };
  }

  votingSharedData(includeIdentity) {
    const m = this.matchups[this.currentMatchupIndex];
    if (!m) {
      return { round: this.roundLabel(), matchupNumber: 0, matchupCount: this.matchups.length, promptText: "", answers: null, endsAt: this.votingEndsAt };
    }
    const base = {
      round: this.roundLabel(),
      matchupId: m.id,
      matchupNumber: this.currentMatchupIndex + 1,
      matchupCount: this.matchups.length,
      promptText: m.promptText,
      answers: { A: m.answers[m.authors[0]], B: m.answers[m.authors[1]] },
      endsAt: this.votingEndsAt,
    };
    // Voting is deliberately anonymous (identity withheld until reveal) --
    // Kwiplash.md doesn't spell this out explicitly, but "the two who
    // wrote them can't vote on their own matchup" is the whole genre
    // convention of judging the joke, not the person; see build notes.
    if (includeIdentity) base.authors = m.authors;
    return base;
  }

  revealData() {
    const m = this.matchups[this.currentMatchupIndex];
    if (!m || !m.result) return { round: this.roundLabel(), matchupNumber: 0, matchupCount: this.matchups.length, promptText: "", entries: [] };
    const cfg = ROUND_CONFIG[this.roundIndex];
    return {
      round: this.roundLabel(),
      matchupNumber: this.currentMatchupIndex + 1,
      matchupCount: this.matchups.length,
      promptText: m.promptText,
      pointsPerVote: cfg.pointsPerVote,
      landslideBonus: cfg.landslideBonus,
      entries: [
        {
          key: "A",
          text: m.answers[m.authors[0]],
          authorName: this.playerName(m.authors[0]),
          votes: m.result.countA,
          points: m.result.pointsA,
          landslide: m.result.landslide === "A",
        },
        {
          key: "B",
          text: m.answers[m.authors[1]],
          authorName: this.playerName(m.authors[1]),
          votes: m.result.countB,
          points: m.result.pointsB,
          landslide: m.result.landslide === "B",
        },
      ],
    };
  }

  standingsData() {
    const rows = this.ctx.players
      .map((p) => ({ id: p.id, name: p.name, score: this.scores[p.id] || 0 }))
      .sort((a, b) => b.score - a.score);
    return { round: this.roundLabel(), rows };
  }

  finalVotingDisplayData() {
    const fr = this.finalRound;
    if (!fr) return { round: FINAL_CONFIG.label, promptText: "", entries: [], endsAt: this.votingEndsAt };
    return {
      round: FINAL_CONFIG.label,
      promptText: fr.promptText,
      entries: fr.authors.map((id) => ({ playerId: id, name: this.playerName(id), text: fr.answers[id] })),
      endsAt: this.votingEndsAt,
    };
  }

  finalVotingControllerData(playerId) {
    const fr = this.finalRound;
    if (!fr) return { round: FINAL_CONFIG.label, promptText: "", entries: [], myBallot: null, endsAt: this.votingEndsAt };
    return {
      round: FINAL_CONFIG.label,
      promptText: fr.promptText,
      // Own entry deliberately omitted -- defense in depth on top of the
      // server-side self-pick rejection in handleBallot, so a client can't
      // even render a self-vote option.
      entries: fr.authors.filter((id) => id !== playerId).map((id) => ({ playerId: id, name: this.playerName(id), text: fr.answers[id] })),
      myBallot: fr.ballots[playerId] || null,
      endsAt: this.votingEndsAt,
    };
  }

  finalRevealData() {
    const fr = this.finalRound;
    if (!fr || !fr.result) return { round: FINAL_CONFIG.label, promptText: "", rows: [], overall: [], winners: [] };
    const rows = fr.authors
      .map((id) => ({
        playerId: id,
        name: this.playerName(id),
        text: fr.answers[id],
        gold: fr.result[id].gold,
        silver: fr.result[id].silver,
        bronze: fr.result[id].bronze,
        points: fr.result[id].points,
      }))
      .sort((a, b) => b.points - a.points);
    const overall = this.ctx.players.map((p) => ({ id: p.id, name: p.name, score: this.scores[p.id] || 0 })).sort((a, b) => b.score - a.score);
    const topScore = overall.length ? overall[0].score : 0;
    const winners = overall.filter((o) => o.score === topScore).map((o) => o.name);
    return {
      round: FINAL_CONFIG.label,
      promptText: fr.promptText,
      gold: FINAL_CONFIG.gold,
      silver: FINAL_CONFIG.silver,
      bronze: FINAL_CONFIG.bronze,
      rows,
      overall,
      winners,
    };
  }

  // -- PROTOCOL.md §5 required entry points ------------------------------------
  //
  // PROTOCOL.md §2: the `display`/`controller` frame shape is
  // `{gameId, view, data}` -- room.js spreads whatever a game module
  // returns here directly onto the wire frame, and jestfest/js/shell.js's
  // renderGameFrame() destructures `gameId` off that frame to pick which
  // `jestfest/games/<gameId>.js` renderer module to load. Every branch
  // below funnels through this one `{gameId: Kwiplash.id, ...}` wrapper so
  // that requirement can't accidentally get missed in any one view.

  displayView() {
    return { gameId: Kwiplash.id, ...this._displayView() };
  }

  _displayView() {
    if (this.stage === "round") {
      if (this.phase === "writing") return { view: "writing", data: this.writingSharedData() };
      if (this.phase === "voting") return { view: "voting", data: this.votingSharedData(false) };
      if (this.phase === "reveal") return { view: "reveal", data: this.revealData() };
      if (this.phase === "standings") return { view: "standings", data: this.standingsData() };
    } else if (this.stage === "final") {
      if (this.phase === "writing") return { view: "writing", data: this.writingSharedData() };
      if (this.phase === "final-voting") return { view: "final-voting", data: this.finalVotingDisplayData() };
      if (this.phase === "final-reveal") return { view: "final-reveal", data: this.finalRevealData() };
    }
    return { view: "writing", data: this.writingSharedData() };
  }

  controllerView(playerId) {
    return { gameId: Kwiplash.id, ...this._controllerView(playerId) };
  }

  _controllerView(playerId) {
    if (this.stage === "round") {
      if (this.phase === "writing") return { view: "writing", data: this.writingControllerData(playerId) };
      if (this.phase === "voting") return { view: "voting", data: this.votingControllerDataFor(playerId) };
      if (this.phase === "reveal") return { view: "reveal", data: this.revealData() };
      if (this.phase === "standings") return { view: "standings", data: this.standingsData() };
    } else if (this.stage === "final") {
      if (this.phase === "writing") return { view: "writing", data: this.writingControllerData(playerId) };
      if (this.phase === "final-voting") return { view: "final-voting", data: this.finalVotingControllerData(playerId) };
      if (this.phase === "final-reveal") return { view: "final-reveal", data: this.finalRevealData() };
    }
    return { view: "writing", data: this.writingControllerData(playerId) };
  }

  votingControllerDataFor(playerId) {
    const m = this.matchups[this.currentMatchupIndex];
    const base = this.votingSharedData(false);
    if (!m) return { ...base, canVote: false, myVote: null };
    return {
      ...base,
      canVote: !m.authors.includes(playerId),
      myVote: m.votes[playerId] ?? null,
    };
  }

  // -- hibernation round-trip ------------------------------------------------

  serialize() {
    return {
      stage: this.stage,
      roundIndex: this.roundIndex,
      phase: this.phase,
      matchups: this.matchups,
      currentMatchupIndex: this.currentMatchupIndex,
      finalRound: this.finalRound,
      scores: this.scores,
      promptDeck: this.promptDeck,
      writingEndsAt: this.writingEndsAt,
      votingEndsAt: this.votingEndsAt,
    };
  }

  restore(saved) {
    if (!saved) return;
    this.stage = saved.stage ?? "round";
    this.roundIndex = saved.roundIndex ?? 0;
    this.phase = saved.phase ?? "writing";
    this.matchups = saved.matchups ?? [];
    this.currentMatchupIndex = saved.currentMatchupIndex ?? -1;
    this.finalRound = saved.finalRound ?? null;
    this.scores = saved.scores ?? {};
    this.promptDeck = saved.promptDeck ?? [];
    this.writingEndsAt = saved.writingEndsAt ?? null;
    this.votingEndsAt = saved.votingEndsAt ?? null;
  }
}
