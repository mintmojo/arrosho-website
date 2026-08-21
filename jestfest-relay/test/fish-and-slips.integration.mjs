// Fish and Slips -- live integration script. NOT a node:test unit test,
// same pattern as test/integration.mjs and test/kwiplash.integration.mjs:
// connects real WebSocket clients to a running `wrangler dev --local`
// instance and plays full games with 4-5 simulated players, printing
// PASS/FAIL per check so the output can be pasted verbatim as evidence
// (see /tmp/build-notes/fish-and-slips.md).
//
// Usage: node test/fish-and-slips.integration.mjs [http://localhost:8787]
//
// Run against wrangler with a short RECONNECT_GRACE_MS (this script assumes
// ~3s): `wrangler dev --local --var RECONNECT_GRACE_MS:3000`.
//
// RACE_MS (10s, the note's DUEL race window) and POACH_WINDOW_MS (3s) are
// plain constants in src/games/fish-and-slips.js, not wired to any env var
// -- ctx (src/room.js's buildCtx()) never exposes `env` to a game module,
// so there is no way to shorten them for this script the way
// RECONNECT_GRACE_MS is shortened at the room level. Section 8 below
// therefore really does wait out the full 10s timer -- that is
// deliberate: the whole point of that check is proving the real,
// production-value server timer resolves rather than hangs.

const BASE = process.argv[2] || "http://localhost:8787";
const WS_BASE = BASE.replace(/^http/, "ws");

let passCount = 0;
let failCount = 0;

function log(...args) {
  console.log(...args);
}

function assert(cond, msg) {
  if (cond) {
    passCount++;
    log(`  PASS: ${msg}`);
  } else {
    failCount++;
    log(`  FAIL: ${msg}`);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// -- WebSocket client harness, copied verbatim from test/integration.mjs --
function connect(url, label) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const frames = [];
    const waiters = [];
    let closedInfo = null;

    ws.addEventListener("open", () => resolve(client));
    ws.addEventListener("error", (e) => {
      log(`  [${label}] socket error`, e.message || e);
    });
    ws.addEventListener("close", (e) => {
      closedInfo = { code: e.code, reason: e.reason };
    });
    ws.addEventListener("message", (e) => {
      let msg;
      try {
        msg = JSON.parse(e.data);
      } catch {
        return;
      }
      const idx = frames.push(msg) - 1;
      log(`  [${label}] <- ${JSON.stringify(msg)}`);
      for (let i = waiters.length - 1; i >= 0; i--) {
        const w = waiters[i];
        if (idx >= w.sinceMark && w.pred(msg)) {
          w.resolve(msg);
          waiters.splice(i, 1);
        }
      }
    });

    const client = {
      ws,
      label,
      frames,
      get closedInfo() {
        return closedInfo;
      },
      mark() {
        return frames.length;
      },
      send(obj) {
        log(`  [${label}] -> ${JSON.stringify(obj)}`);
        ws.send(JSON.stringify(obj));
      },
      waitFor(pred, { timeoutMs = 5000, sinceMark = 0 } = {}) {
        const existing = frames.slice(sinceMark).find(pred);
        if (existing) return Promise.resolve(existing);
        return new Promise((res, rej) => {
          const timer = setTimeout(() => {
            const i = waiters.findIndex((w) => w.resolve === res);
            if (i !== -1) waiters.splice(i, 1);
            rej(new Error(`[${label}] timed out waiting for frame matching predicate`));
          }, timeoutMs);
          waiters.push({
            pred,
            sinceMark,
            resolve: (msg) => {
              clearTimeout(timer);
              res(msg);
            },
          });
        });
      },
      close() {
        try {
          ws.close();
        } catch {
          // ignore
        }
      },
    };
  });
}

// -- fish-and-slips-specific helpers ---------------------------------------

async function createRoom() {
  const res = await fetch(`${BASE}/room`, { method: "POST" });
  const body = await res.json();
  return body.code;
}

/** Creates a room, connects a display and N named controllers, starts
 *  fish-and-slips, and waits for the first 'bidding' display frame. */
async function newGame(names) {
  const code = await createRoom();
  const display = await connect(`${WS_BASE}/room/${code}/ws?role=display`, `${code}:display`);
  await display.waitFor((m) => m.t === "hello");

  const controllers = {};
  for (const name of names) {
    const c = await connect(`${WS_BASE}/room/${code}/ws?role=controller&name=${encodeURIComponent(name)}`, `${code}:${name}`);
    const hello = await c.waitFor((m) => m.t === "hello");
    c.playerId = hello.playerId;
    c.rt = hello.reconnectToken;
    controllers[name] = c;
  }

  await display.waitFor((m) => m.t === "room" && m.players.length === names.length);

  const dMark = display.mark();
  display.send({ t: "start", gameId: "fish-and-slips" });
  const started = await display.waitFor((m) => m.t === "display" || m.t === "error", { sinceMark: dMark });
  assert(started.t === "display" && started.view === "bidding", `[${code}] fish-and-slips starts into the 'bidding' view`);

  return { code, display, controllers };
}

function bid(client, value, slip = false) {
  client.send({ t: "action", action: "bid", value, slip });
}
function duelVote(client, candidateId) {
  client.send({ t: "action", action: "duelVote", candidateId });
}
function duelRace(client) {
  client.send({ t: "action", action: "duelRace" });
}

/** Collects every 'display' and 'controller' frame received by ANY of the
 *  given clients from `sinceMark` (per-client) onward, for a raw-frame
 *  secrecy audit -- deliberately bypasses any UI/view-shape assumptions. */
function allFramesSince(clients, marks) {
  const out = [];
  for (const c of clients) {
    const from = marks.get(c) ?? 0;
    for (const f of c.frames.slice(from)) out.push({ from: c.label, frame: f });
  }
  return out;
}

async function main() {
  log(`=== Fish and Slips integration run against ${BASE} ===`);
  log(`Started: ${new Date().toISOString()}`);

  // ======================================================================
  // 1. Secrecy: no bid value ever appears in ANY frame to ANY client
  //    before reveal (raw frame audit, not UI).
  // ======================================================================
  log("\n-- 1. bid secrecy before reveal --");
  {
    const names = ["Alice", "Bob", "Carol", "Dave"];
    const { display, controllers } = await newGame(names);
    const all = [display, ...Object.values(controllers)];
    const marks = new Map(all.map((c) => [c, c.mark()]));

    // Distinct, small, deliberately affordable values (everyone starts
    // with a 10-fish Stash; keeping the spread inside that keeps this a
    // clean single-winner round with no Bust cascade, which is a separate
    // check done in section 4). The leak check below matches the precise
    // `"value":<n>` JSON shape a serialized bid takes, not a raw substring
    // search, specifically so small numbers like these can't produce a
    // false match against an unrelated field (a round counter, a UUID
    // player id, etc).
    const values = { Alice: 2, Bob: 4, Carol: 6, Dave: 9 };

    bid(controllers.Alice, values.Alice, false);
    await display.waitFor((m) => m.t === "display" && m.data.submittedCount === 1);
    bid(controllers.Bob, values.Bob, false);
    await display.waitFor((m) => m.t === "display" && m.data.submittedCount === 2);
    bid(controllers.Carol, values.Carol, false);
    await display.waitFor((m) => m.t === "display" && m.data.submittedCount === 3);

    // Audit every frame sent to every client SO FAR (all 4 bids not yet
    // in -- Dave hasn't bid, so the round has not revealed).
    const preReveal = allFramesSince(all, marks);
    let leaked = false;
    for (const { from, frame } of preReveal) {
      const json = JSON.stringify(frame);
      for (const [name, value] of Object.entries(values)) {
        if (!json.includes(`"value":${value}`)) continue;
        // A player's OWN controller frame is allowed to contain their OWN
        // bid value (myBid) -- that's not a leak. Anything else is.
        const owner = controllers[name];
        const isOwnFrame = frame.t === "controller" && from === owner.label;
        if (!isOwnFrame) leaked = true;
      }
    }
    assert(!leaked, "no bid value leaked into any frame (display or another player's controller) before reveal");

    const dMark = display.mark();
    bid(controllers.Dave, values.Dave, false);
    const revealed = await display.waitFor((m) => m.t === "display" && m.view === "revealed", { sinceMark: dMark });
    assert(revealed.data.bids.length === 4, "all 4 bids are present in the display frame AFTER reveal");
    assert(
      revealed.data.bids.every((b) => Object.values(values).includes(b.value)),
      "revealed values match exactly what was submitted"
    );
    assert(revealed.data.resolution.winnerName === "Dave", "highest bidder (Dave) wins the round");
    assert(revealed.data.resolution.tariff === values.Dave - values.Carol, "tariff = highest - second highest");

    display.send({ t: "endgame" });
  }

  // ======================================================================
  // 2. Forged / late bid rejected server-side.
  // ======================================================================
  log("\n-- 2. forged/late bid rejected --");
  {
    const { display, controllers } = await newGame(["Alice", "Bob", "Carol"]);

    // Invalid payloads: server must not crash, must not count them as a
    // submitted bid, and (per PROTOCOL.md, "validate hard; ignore anything
    // illegal") must not advance the round.
    const dMark0 = display.mark();
    controllers.Alice.send({ t: "action", action: "bid", value: "banana", slip: false });
    controllers.Alice.send({ t: "action", action: "bid", value: -5, slip: false });
    controllers.Alice.send({ t: "action", action: "bid", value: 3.7, slip: false });
    await sleep(300);
    const afterGarbage = display.frames.slice(dMark0).filter((m) => m.t === "display");
    assert(
      afterGarbage.every((m) => m.data.submittedCount === 0),
      "garbage/negative/non-integer bids never count as submitted"
    );

    bid(controllers.Alice, 5, false);
    bid(controllers.Bob, 3, false);
    const dMark = display.mark();
    bid(controllers.Carol, 1, false);
    const revealed = await display.waitFor((m) => m.t === "display" && m.view === "revealed", { sinceMark: dMark });
    assert(revealed.data.resolution.winnerName === "Alice", "clean round resolves normally after garbage bids were rejected");

    // Now the round is over (phase 'revealed') -- a late bid from someone
    // who missed the window must be silently ignored, not resurrect a bid.
    const dMark2 = display.mark();
    controllers.Bob.send({ t: "action", action: "bid", value: 999, slip: false });
    await sleep(300);
    const noLateChange = display.frames.slice(dMark2);
    assert(
      noLateChange.every((m) => !(m.t === "display" && m.view === "bidding")),
      "a late bid after reveal does not reopen bidding or otherwise change round state"
    );

    display.send({ t: "endgame" });
  }

  // ======================================================================
  // 3. Slip: solo auto-win, and 2-Slip collision.
  // ======================================================================
  log("\n-- 3. Slip resolution --");
  {
    const { display, controllers } = await newGame(["Alice", "Bob", "Carol"]);
    bid(controllers.Alice, 2, true); // Slip, low number
    bid(controllers.Bob, 50, false);
    const dMark = display.mark();
    bid(controllers.Carol, 40, false);
    const revealed = await display.waitFor((m) => m.t === "display" && m.view === "revealed", { sinceMark: dMark });
    assert(revealed.data.resolution.winnerName === "Alice", "a solo Slip auto-wins despite the lowest number");
    assert(revealed.data.resolution.tariff === 2 - 50, "Slip tariff = own bid - highest non-Slip bid (got " + revealed.data.resolution.tariff + ")");
    display.send({ t: "endgame" });
  }
  {
    const { display, controllers } = await newGame(["Alice", "Bob", "Carol", "Dave"]);
    bid(controllers.Alice, 9, true); // Slip
    bid(controllers.Bob, 9, true); // Slip -- collides with Alice
    bid(controllers.Carol, 6, false);
    const dMark = display.mark();
    bid(controllers.Dave, 3, false);
    const revealed = await display.waitFor((m) => m.t === "display" && m.view === "revealed", { sinceMark: dMark });
    assert(revealed.data.resolution.winnerName === "Carol", "two collided Slips cascade down to the plain highest bidder");
    const aliceRow = revealed.data.standings.find((p) => p.name === "Alice");
    const bobRow = revealed.data.standings.find((p) => p.name === "Bob");
    assert(aliceRow.stash === 10 && bobRow.stash === 10, "both colliding Slip players reset to a 10-fish Stash");
    display.send({ t: "endgame" });
  }

  // ======================================================================
  // 4. Cascading Bust resolves through the whole chain.
  // ======================================================================
  log("\n-- 4. cascading Bust --");
  {
    // 5 players; Alice and Bob both bust in turn, Carol finally pays.
    // Stashes start at 10 -- Alice's tariff (100-85=15) exceeds her Stash,
    // busting her (note: Bust is "can't pay", i.e. tariff strictly greater
    // than Stash -- 15 > 10 busts, whereas an exact 10 would not have).
    // Bob's stash is also left at the 10 default so his tariff (85-9=76)
    // busts him too; Carol can afford 9-4=5.
    const { display, controllers } = await newGame(["Alice", "Bob", "Carol", "Dave", "Eve"]);
    bid(controllers.Alice, 100, false);
    bid(controllers.Bob, 85, false);
    bid(controllers.Carol, 9, false);
    bid(controllers.Dave, 4, false);
    const dMark = display.mark();
    bid(controllers.Eve, 1, false);
    const revealed = await display.waitFor((m) => m.t === "display" && m.view === "revealed", { sinceMark: dMark });
    assert(revealed.data.resolution.kind === "win" && revealed.data.resolution.winnerName === "Carol", "cascade lands on Carol after two Busts (got " + JSON.stringify(revealed.data.resolution.winnerName) + ")");
    assert(revealed.data.resolution.tariff === 9 - 4, "final tariff computed against the next bid down (4)");
    const aliceRow = revealed.data.standings.find((p) => p.name === "Alice");
    const bobRow = revealed.data.standings.find((p) => p.name === "Bob");
    assert(aliceRow.stash === 10 && bobRow.stash === 10, "both busted leaders reset to 10 through the cascade");
    display.send({ t: "endgame" });
  }

  // ======================================================================
  // 5. DUEL on a tie (vote mode), and a NESTED DUEL that terminates.
  // ======================================================================
  log("\n-- 5. DUEL! tie + nested DUEL --");
  {
    const { display, controllers } = await newGame(["Alice", "Bob", "Carol", "Dave"]);
    bid(controllers.Alice, 7, false);
    const dMark = display.mark();
    bid(controllers.Bob, 7, false); // ties Alice for highest
    bid(controllers.Carol, 3, false);
    bid(controllers.Dave, 1, false);
    const duelFrame = await display.waitFor((m) => m.t === "display" && m.view === "duel-vote", { sinceMark: dMark });
    assert(duelFrame.data.duel.mode === "vote" && duelFrame.data.duel.reason === "highest", "tie for highest triggers a vote-mode DUEL!");
    assert(
      duelFrame.data.duel.candidates.map((c) => c.name).sort().join(",") === "Alice,Bob",
      "DUEL! candidates are exactly the tied players"
    );

    // Candidate voting on their OWN matchup must be rejected server-side.
    const aliceCtrlView = await controllers.Alice.waitFor((m) => m.t === "controller" && m.view === "duel-vote");
    assert(aliceCtrlView.data.isCandidate === true && aliceCtrlView.data.isVoter === false, "a DUEL! candidate is marked isCandidate, not isVoter");
    const carolCtrlView = await controllers.Carol.waitFor((m) => m.t === "controller" && m.view === "duel-vote");
    assert(carolCtrlView.data.isVoter === true, "a non-candidate is marked isVoter");

    duelVote(controllers.Alice, controllers.Alice.playerId); // candidate tries to vote for themselves -- must be ignored
    await sleep(250);
    const stillDuel1 = display.frames[display.frames.length - 1];
    assert(stillDuel1.view === "duel-vote" && stillDuel1.data.duel.votesIn === 0, "a candidate's vote on their own matchup is rejected (votesIn still 0)");

    // Force a NESTED duel: exactly 2 eligible voters (Carol, Dave), split
    // evenly -> the vote ties -> the server must re-run the SAME DUEL!
    // (recursed) rather than hang or crash.
    const dMarkNest = display.mark();
    duelVote(controllers.Carol, controllers.Alice.playerId);
    duelVote(controllers.Dave, controllers.Bob.playerId);
    const nested = await display.waitFor(
      (m) => m.t === "display" && m.view === "duel-vote" && m.data.duel.voteRound >= 1,
      { sinceMark: dMarkNest }
    );
    assert(nested.data.duel.voteRound >= 1, "a tied vote recurses into a NESTED DUEL! (voteRound incremented)");
    assert(nested.data.duel.votesIn === 0, "the nested DUEL! starts with a fresh, empty ballot");

    // Break the tie this time -- both voters agree on Alice.
    const dMarkResolve = display.mark();
    duelVote(controllers.Carol, controllers.Alice.playerId);
    duelVote(controllers.Dave, controllers.Alice.playerId);
    const resolved = await display.waitFor((m) => m.t === "display" && m.view === "revealed", { sinceMark: dMarkResolve });
    assert(resolved.data.resolution.winnerName === "Alice", "the nested DUEL! terminates and resolves to the actual winner");

    display.send({ t: "endgame" });
  }

  // ======================================================================
  // 6. 2-player race DUEL!: server decides by receipt order, and an
  //    unclaimed race resolves (voids the round) instead of hanging.
  // ======================================================================
  log("\n-- 6. 2-player race DUEL! --");
  {
    const { display, controllers } = await newGame(["Alice", "Bob"]);
    const dMark = display.mark();
    bid(controllers.Alice, 6, false);
    bid(controllers.Bob, 6, false);
    const raceFrame = await display.waitFor((m) => m.t === "display" && m.view === "duel-race", { sinceMark: dMark });
    assert(raceFrame.data.duel.mode === "race", "a 2-player game's tie triggers race mode, not a vote");
    assert(typeof raceFrame.data.duel.endsAt === "number", "the race carries a server-issued endsAt (client never decides time)");

    // Bob claims, then Alice claims a moment later -- server receipt order
    // decides; the second claim must be a no-op, not a double-resolution.
    duelRace(controllers.Bob);
    const resolved = await display.waitFor((m) => m.t === "display" && m.view === "revealed");
    assert(resolved.data.resolution.winnerName === "Bob", "the first claim the server receives wins the race");
    duelRace(controllers.Alice); // late claim, duel already resolved
    await sleep(250);
    assert(display.frames[display.frames.length - 1].view === "revealed", "a late/second race claim after resolution is a no-op, not a crash or re-resolution");

    display.send({ t: "endgame" });
  }
  {
    log("  (waiting out the full 10s race timer -- this is the real, unshortened production value)");
    const { display, controllers } = await newGame(["Alice", "Bob"]);
    const dMark = display.mark();
    bid(controllers.Alice, 6, false);
    bid(controllers.Bob, 6, false);
    await display.waitFor((m) => m.t === "display" && m.view === "duel-race", { sinceMark: dMark });
    // Nobody claims. Must resolve on its own within a bit after 10s, not hang.
    const timedOut = await display.waitFor((m) => m.t === "display" && m.view === "revealed", { timeoutMs: 14000 });
    assert(timedOut.data.resolution.kind === "duelUnclaimed", "an unclaimed 10s race resolves on its own (voids the round) instead of hanging forever");
    const aliceRow = timedOut.data.standings.find((p) => p.name === "Alice");
    const bobRow = timedOut.data.standings.find((p) => p.name === "Bob");
    assert(aliceRow.stash === 10 && bobRow.stash === 10, "both tied players reset to 10 when the race goes unclaimed");
    display.send({ t: "endgame" });
  }

  // ======================================================================
  // 7. Mid-round newcomer join: seated correctly, and can steal a DUEL!.
  // ======================================================================
  log("\n-- 7. Fresh Catch / Poach --");
  {
    const { code, display, controllers } = await newGame(["Alice", "Bob", "Carol"]);
    const dMark = display.mark();
    bid(controllers.Alice, 5, false); // Bob/Carol haven't bid -- round is genuinely in progress
    await display.waitFor((m) => m.t === "display" && m.data.submittedCount === 1, { sinceMark: dMark });

    const dMarkJoin = display.mark();
    const newcomer = await connect(`${WS_BASE}/room/${code}/ws?role=controller&name=Newbie`, `${code}:Newbie`);
    const hello = await newcomer.waitFor((m) => m.t === "hello");
    newcomer.playerId = hello.playerId;

    const poachFrame = await display.waitFor((m) => m.t === "display" && m.view === "poach", { sinceMark: dMarkJoin });
    assert(poachFrame.data.candidates.some((c) => c.name === "Newbie"), "a mid-round newcomer is seated and shown as a Poach candidate immediately");

    const dMarkResolve = display.mark();
    const resolved = await display.waitFor((m) => m.t === "display" && m.view === "bidding", { sinceMark: dMarkResolve, timeoutMs: 6000 });
    assert(resolved.data.submittedCount === 0, "the interrupted round is fully voided -- fresh bidding round starts with 0 submitted");
    assert(resolved.data.roundsPlayed === 0, "a Fresh Catch round does not count against the round limit");

    display.send({ t: "endgame" });
  }
  {
    // Newcomer stealing an in-progress existing-player DUEL!.
    const { code, display, controllers } = await newGame(["Alice", "Bob", "Carol", "Dave"]);
    const dMark = display.mark();
    bid(controllers.Alice, 7, false);
    bid(controllers.Bob, 7, false); // ties -> DUEL!
    bid(controllers.Carol, 3, false);
    bid(controllers.Dave, 2, false);
    await display.waitFor((m) => m.t === "display" && m.view === "duel-vote", { sinceMark: dMark });

    const dMarkJoin = display.mark();
    const poacher = await connect(`${WS_BASE}/room/${code}/ws?role=controller&name=Poacher`, `${code}:Poacher`);
    await poacher.waitFor((m) => m.t === "hello");
    const poachFrame = await display.waitFor((m) => m.t === "display" && m.view === "poach", { sinceMark: dMarkJoin });
    assert(poachFrame.data.candidates.some((c) => c.name === "Poacher"), "a newcomer joining mid-DUEL! bypasses the vote and opens a Poach instead");

    const resolved = await display.waitFor((m) => m.t === "display" && m.view === "bidding", { timeoutMs: 6000 });
    assert(resolved.data.roundsPlayed === 0, "stealing a DUEL! also voids the round outright (no winner, no tariff for the original tie)");

    display.send({ t: "endgame" });
  }

  // ======================================================================
  // 8. Disconnect mid-bid does not deadlock the round.
  // ======================================================================
  log("\n-- 8. disconnect mid-bid --");
  {
    const { display, controllers } = await newGame(["Alice", "Bob", "Carol"]);
    bid(controllers.Alice, 5, false);
    const dMark = display.mark();
    controllers.Bob.close(); // Bob vanishes before ever bidding
    await display.waitFor((m) => m.t === "room" && m.players.find((p) => p.name === "Bob")?.connected === false, { sinceMark: dMark });

    const dMark2 = display.mark();
    bid(controllers.Carol, 3, false);
    const revealed = await display.waitFor((m) => m.t === "display" && m.view === "revealed", { sinceMark: dMark2, timeoutMs: 4000 });
    assert(revealed.data.resolution.winnerName === "Alice", "the round resolves using only connected players -- no deadlock waiting on Bob");

    display.send({ t: "endgame" });
  }

  // ======================================================================
  // 9. Final awards total correctly at game end.
  // ======================================================================
  log("\n-- 9. final BR awards --");
  {
    // DEFAULT_ROUND_LIMIT is 5 (see build report: no wire path for the
    // Display to configure 3/5/10 before start, so the note's own
    // "standard/playtest" default is what ships). Play exactly 5 rounds
    // with a clean, always-unique highest bidder each round (never a tie)
    // so the game ends cleanly at the round limit with no Overtime.
    const { display, controllers } = await newGame(["Alice", "Bob", "Carol"]);
    const roundBids = [
      { Alice: 5, Bob: 3, Carol: 1 },
      { Alice: 4, Bob: 8, Carol: 2 },
      { Alice: 6, Bob: 5, Carol: 9 },
      { Alice: 3, Bob: 2, Carol: 7 },
      { Alice: 9, Bob: 1, Carol: 4 },
    ];
    let lastRevealed = null;
    for (let i = 0; i < roundBids.length; i++) {
      const round = roundBids[i];
      const dMark = display.mark();
      bid(controllers.Alice, round.Alice, false);
      bid(controllers.Bob, round.Bob, false);
      bid(controllers.Carol, round.Carol, false);
      lastRevealed = await display.waitFor((m) => m.t === "display" && m.view === "revealed", { sinceMark: dMark, timeoutMs: 5000 });
      assert(lastRevealed.data.resolution.kind === "win", `round ${i + 1} resolves cleanly with a winner (no accidental tie)`);
      const dMarkAdvance = display.mark();
      display.send({ t: "advance" });
      if (i < roundBids.length - 1) {
        await display.waitFor((m) => m.t === "display" && m.view === "bidding", { sinceMark: dMarkAdvance, timeoutMs: 4000 });
      }
    }
    assert(lastRevealed.data.gameEnding === true, "the 5th round's results screen flags gameEnding");

    const dMarkEnd = display.mark();
    display.send({ t: "advance" }); // final advance triggers ctx.end()
    const endedRoom = await display.waitFor((m) => m.t === "room" && m.state === "lobby", { sinceMark: dMarkEnd, timeoutMs: 4000 });

    const totalBR = endedRoom.players.reduce((sum, p) => sum + p.brTotal, 0);
    assert(totalBR === 1, `exactly 1 BR point total was awarded at game end (got ${totalBR})`);
    const brWinner = endedRoom.players.find((p) => p.brTotal === 1);
    // Cross-check against the actual highest Stash from the last round's
    // standings (captured before ctx.end() returned to lobby), not just
    // "whoever has brTotal===1" -- a real, independent check that the BR
    // point landed on the correct player, not merely that exactly one
    // point was handed out to someone.
    const stashLeaderName = lastRevealed.data.standings[0].name;
    assert(
      !!brWinner && brWinner.name === stashLeaderName,
      `the 1 BR point went to the actual highest-Stash player (${stashLeaderName}), got ${brWinner && brWinner.name}`
    );

    display.send({ t: "endroom" });
  }

  // ======================================================================
  log(`\n=== ${passCount} passed, ${failCount} failed ===`);
  log(`Finished: ${new Date().toISOString()}`);
  // Open WebSocket connections (display/controllers from every section
  // above) keep the Node event loop alive indefinitely otherwise -- force
  // a clean exit now that every assertion has run.
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("INTEGRATION SCRIPT CRASHED:", err);
  process.exit(1);
});
