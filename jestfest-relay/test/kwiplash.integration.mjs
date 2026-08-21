// Kwiplash — live integration script. NOT a node:test unit test, same
// pattern as test/integration.mjs: connects real WebSocket clients to a
// running `wrangler dev --local` instance and drives a FULL game with 4
// simulated players, printing PASS/FAIL per check so the output can be
// pasted verbatim as evidence (see /tmp/build-notes/kwiplash.md).
//
// Usage: node test/kwiplash.integration.mjs [http://localhost:8787]
//
// Run with a short RECONNECT_GRACE_MS (this script assumes ~3s, matching
// the wrangler --var override used elsewhere in this repo's build notes)
// so the disconnect/grace-expiry scenario below doesn't need a real 180s
// wait. The writing-timer scenario intentionally uses the REAL production
// timer value (60s, the floor of Kwiplash.md's "60-90s" range) -- that one
// check is not shortened, because the whole point is proving the actual
// server-owned deadline forces the round forward.

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

// -- WebSocket client harness, copied from test/integration.mjs's connect() --
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
      log(`  [${label}] closed: code=${e.code} reason=${e.reason}`);
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

/** Every frame received BEFORE `cutoffIdx` (exclusive) on this client must
 *  not contain any of `forbiddenTexts` anywhere, checked by raw JSON
 *  substring search -- the bluntest, hardest-to-fool way to prove a
 *  secret never appeared on the wire before it should have. */
function assertNoLeakBefore(client, cutoffIdx, forbiddenTexts, label) {
  const early = client.frames.slice(0, cutoffIdx);
  const blob = JSON.stringify(early);
  for (const t of forbiddenTexts) {
    assert(!blob.includes(t), `${label}: "${t}" absent from ${client.label}'s ${early.length} frames before its reveal step`);
  }
}

async function main() {
  log(`=== Kwiplash integration run against ${BASE} ===`);
  log(`Started: ${new Date().toISOString()}`);

  // --- room + connections ---------------------------------------------
  log("\n-- room setup: display + 4 controllers --");
  const createResp = await fetch(`${BASE}/room`, { method: "POST" });
  const { code } = await createResp.json();
  log(`  room code: ${code}`);

  const display = await connect(`${WS_BASE}/room/${code}/ws?role=display`, "display");
  await display.waitFor((m) => m.t === "hello");

  const NAMES = ["Alice", "Bob", "Carol", "Dave"];
  const players = {};
  for (const name of NAMES) {
    const c = await connect(`${WS_BASE}/room/${code}/ws?role=controller&name=${name}`, name);
    const hello = await c.waitFor((m) => m.t === "hello");
    players[name] = { client: c, id: hello.playerId, name };
  }
  await display.waitFor((m) => m.t === "room" && m.players.length === 4);
  assert(true, "room created, display + 4 controllers connected");

  // --- start the game ----------------------------------------------------
  log("\n-- start kwiplash --");
  const dMark0 = display.mark();
  display.send({ t: "start", gameId: "kwiplash" });
  const startFrame = await display.waitFor((m) => m.t === "display" || m.t === "error", { sinceMark: dMark0 });
  assert(startFrame.t === "display" && startFrame.view === "writing", `kwiplash starts into a 'writing' display view (got ${JSON.stringify(startFrame)})`);
  assert(startFrame.data.round === "Round 1", `display's first view is labeled "Round 1" (got "${startFrame.data.round}")`);
  assert(
    !("answers" in startFrame.data) && !("prompts" in startFrame.data),
    "display's writing view carries no answer/prompt text fields at all"
  );

  // --- discover round 1 pairing from each player's OWN controller view ---
  log("\n-- round 1: discover pairing --");
  const authorsOf = {}; // matchupId -> [name, name]
  const textOf = {}; // `${matchupId}:${name}` -> submitted text (once sent)
  const round1PromptOf = {}; // name -> {promptId, text}
  for (const name of NAMES) {
    const p = players[name];
    const frame = await p.client.waitFor((m) => m.t === "controller" && m.view === "writing");
    assert(frame.data.prompts.length === 2, `${name} writes exactly 2 prompts in Round 1 (got ${frame.data.prompts.length})`);
    // cycle pairing: each player authors TWO matchups, so record them all
    round1PromptOf[name] = frame.data.prompts;
    for (const pr of frame.data.prompts) {
      authorsOf[pr.promptId] = authorsOf[pr.promptId] || [];
      authorsOf[pr.promptId].push(name);
    }
  }
  const round1MatchupIds = Object.keys(authorsOf);
  assert(round1MatchupIds.length === 4, `Round 1 has exactly 4 matchups for 4 players -- cycle pairing, nobody benched (got ${round1MatchupIds.length})`);
  for (const mid of round1MatchupIds) {
    assert(authorsOf[mid].length === 2, `matchup ${mid} has exactly 2 authors (got ${JSON.stringify(authorsOf[mid])})`);
  }
  const allAuthors = round1MatchupIds.flatMap((mid) => authorsOf[mid]);
  assert(
    new Set(allAuthors).size === 4 && allAuthors.length === 8,
    `all 4 players author exactly 2 Round 1 matchups each = 8 author slots (got ${JSON.stringify(allAuthors)})`
  );
  {
    // nobody is benched, and nobody draws the same partner twice
    const benched = NAMES.filter((n) => !allAuthors.includes(n));
    assert(benched.length === 0, `nobody sits out a round (benched: ${JSON.stringify(benched)})`);
    const repeats = NAMES.filter((n) => {
      const partners = round1MatchupIds
        .filter((mid) => authorsOf[mid].includes(n))
        .map((mid) => authorsOf[mid].find((a) => a !== n));
      return new Set(partners).size !== partners.length;
    });
    assert(repeats.length === 0, `each player gets two DIFFERENT partners (repeats: ${JSON.stringify(repeats)})`);
  }

  // Dave deliberately never submits and stays CONNECTED -- this is what
  // forces the writing-timer scenario below (a connected non-submitter
  // blocks the early-completion path; only the server-owned deadline can
  // move the round forward).
  const submitters = NAMES.filter((n) => n !== "Dave");
  for (const name of submitters) {
    for (const pr of round1PromptOf[name]) {
      const text = `${name}:${pr.promptId}`;
      textOf[`${pr.promptId}:${name}`] = text;
      players[name].client.send({ t: "action", action: "submit", promptId: pr.promptId, text });
    }
  }
  await sleep(500);
  const midWait = await display.waitFor((m) => m.t === "display" && m.view === "writing", { sinceMark: 0, timeoutMs: 3000 }).catch(() => null);
  // (best-effort re-check -- not asserted; just confirms we're still mid-writing)
  void midWait;

  // Mark every client's frame position right now (before anyone has seen
  // any matchup revealed) -- used below for the no-leak check.
  const preRevealMarks = { display: display.mark() };
  for (const name of NAMES) preRevealMarks[name] = players[name].client.mark();

  // --- writing timer must force the round forward on its own -------------
  log("\n-- writing timer forces the round forward even though Dave never submitted (real ~60s wait) --");
  const dMarkTimer = display.mark();
  const votingFrame = await display.waitFor((m) => m.t === "display" && m.view === "voting", { sinceMark: dMarkTimer, timeoutMs: 70000 });
  assert(votingFrame.t === "display" && votingFrame.view === "voting", "writing phase advanced to voting on its own (server timer, not a client 'done')");
  assert(votingFrame.data.matchupCount === 4, `voting phase reports matchupCount === 4 (got ${votingFrame.data.matchupCount})`);

  // --- play round 1's matchups --------------------------------------------
  log("\n-- round 1: matchups --");
  let dMark = dMarkTimer;
  let leakCheckDone = false;
  const round1Score = {}; // name -> points earned this round

  // one iteration per matchup the server actually built (cycle pairing => n
  // matchups for n players), taking each matchup from the server's own frame
  // rather than assuming the order our authorsOf map happens to be keyed in.
  for (let i = 0; i < round1MatchupIds.length; i++) {
    const dv = await display.waitFor((m) => m.t === "display" && m.view === "voting", { sinceMark: dMark });
    const controllerVoteMarks = {};
    for (const name of NAMES) controllerVoteMarks[name] = players[name].client.mark();
    dMark = display.mark();
    const mid = dv.data.matchupId;
    const authors = authorsOf[mid];
    const involvesDave = authors.includes("Dave");
    log(`  matchup ${i}: ${mid}, authors=${JSON.stringify(authors)}, involvesDave=${involvesDave}`);

    assert(!("authors" in dv.data), `display voting view for ${mid} does not reveal author identity before reveal`);

    // Identify which visible slot (A/B) belongs to which author, purely
    // from text we already know we sent -- the server itself never tells
    // any client which slot is whose during voting.
    const aText = dv.data.answers.A;
    const bText = dv.data.answers.B;
    const slotOf = {};
    for (const author of authors) {
      const known = textOf[`${mid}:${author}`];
      if (known === aText) slotOf[author] = "A";
      else if (known === bText) slotOf[author] = "B";
      else slotOf[author] = null; // Dave: never submitted -> placeholder text, no known match
    }
    // Whichever author has no known match is the one whose slot is the
    // "(no answer)" placeholder.
    for (const author of authors) {
      if (slotOf[author] == null) slotOf[author] = aText === "(no answer)" ? "A" : "B";
    }

    const eligible = NAMES.filter((n) => !authors.includes(n));
    assert(eligible.length === 2, `matchup ${mid} has exactly 2 eligible (non-author) voters for a 4-player room (got ${JSON.stringify(eligible)})`);

    // Forged vote from an author must be rejected server-side.
    const forgedAuthor = authors[0];
    const toastMark = players[forgedAuthor].client.mark();
    players[forgedAuthor].client.send({ t: "action", action: "vote", matchupId: mid, choice: "A" });
    const toast = await players[forgedAuthor].client.waitFor((m) => m.t === "toast" && m.level === "error", { sinceMark: toastMark, timeoutMs: 3000 }).catch(() => null);
    assert(toast !== null, `forged vote from author ${forgedAuthor} on their own matchup gets a rejection toast`);

    let expectLandslide = true;
    let realSideChoice = involvesDave ? (slotOf[authors.find((a) => a !== "Dave")]) : "A";
    if (!involvesDave && !leakCheckDone) {
      // This is the first non-Dave matchup: use it for the split-vote
      // (no landslide) check instead of unanimous.
      players[eligible[0]].client.send({ t: "action", action: "vote", matchupId: mid, choice: "A" });
      players[eligible[1]].client.send({ t: "action", action: "vote", matchupId: mid, choice: "B" });
      expectLandslide = false;
    } else {
      for (const voter of eligible) {
        players[voter].client.send({ t: "action", action: "vote", matchupId: mid, choice: realSideChoice });
      }
    }

    const dr = await display.waitFor((m) => m.t === "display" && m.view === "reveal", { sinceMark: dMark, timeoutMs: 8000 });
    dMark = display.mark();
    log("  reveal:", JSON.stringify(dr.data.entries));

    assert(
      dr.data.entries.every((e) => e.votes <= 2),
      "the forged author vote was never counted (each side has at most the 2 eligible voters' worth of votes)"
    );

    if (involvesDave) {
      const daveEntry = dr.data.entries.find((e) => e.key === slotOf.Dave);
      const realAuthor = authors.find((a) => a !== "Dave");
      const realEntry = dr.data.entries.find((e) => e.key === slotOf[realAuthor]);
      assert(daveEntry.points === 0, `Dave's no-answer placeholder in ${mid} earns 0 points regardless of votes (got ${daveEntry.points})`);
      assert(daveEntry.text === "(no answer)", `Dave's entry text is the no-answer placeholder (got "${daveEntry.text}")`);
      assert(realEntry.votes === 2 && realEntry.landslide === true && realEntry.points === 300, `${realAuthor}'s real answer against a no-answer wins unanimously with landslide bonus (2 votes, +300) (got votes=${realEntry.votes}, points=${realEntry.points}, landslide=${realEntry.landslide})`);
      round1Score[realAuthor] = (round1Score[realAuthor] || 0) + realEntry.points;
      round1Score.Dave = (round1Score.Dave || 0) + 0;
    } else if (expectLandslide === false) {
      assert(
        dr.data.entries.every((e) => e.votes === 1 && e.points === 100 && e.landslide === false),
        `split 1-1 vote on ${mid} gives each author 1 vote worth, 100 points, and NO landslide bonus (got ${JSON.stringify(dr.data.entries.map((e) => ({ votes: e.votes, points: e.points, landslide: e.landslide })))})`
      );
      for (const e of dr.data.entries) {
        const author = authors.find((a) => textOf[`${mid}:${a}`] === e.text);
        round1Score[author] = (round1Score[author] || 0) + e.points;
      }

      // --- no-leak-before-reveal check, using this matchup -----------------
      // An author legitimately sees their OWN answer echoed back in their
      // OWN controller "writing" frame (the `myAnswer` field, so the UI
      // can show "locked in: <what you typed>") -- that's not a leak, it's
      // the player reading back what they themselves submitted. Only the
      // OTHER author's text, and both texts on every OTHER client
      // (display + non-authors), must be absent before this matchup's own
      // reveal step.
      log("  running no-leak-before-reveal check against this matchup...");
      const forbidden = authors.map((a) => textOf[`${mid}:${a}`]);
      assertNoLeakBefore(display, preRevealMarks.display, forbidden, `matchup ${mid}`);
      for (const name of NAMES) {
        const own = textOf[`${mid}:${name}`]; // undefined if `name` isn't an author of this matchup
        const forbiddenForThisClient = forbidden.filter((t) => t !== own);
        assertNoLeakBefore(players[name].client, preRevealMarks[name], forbiddenForThisClient, `matchup ${mid}`);
      }
      leakCheckDone = true;
    } else {
      const winner = dr.data.entries.find((e) => e.landslide);
      assert(winner && winner.votes === 2 && winner.points === 300, `unanimous vote on ${mid} gives the winner 2 votes worth + landslide bonus = 300 (got ${JSON.stringify(dr.data.entries)})`);
      for (const e of dr.data.entries) {
        const author = authors.find((a) => textOf[`${mid}:${a}`] === e.text);
        round1Score[author] = (round1Score[author] || 0) + e.points;
      }
    }

    display.send({ t: "advance" });
  }
  assert(leakCheckDone, "the no-leak-before-reveal check actually ran against a real matchup");

  await display.waitFor((m) => m.t === "display" && m.view === "standings", { sinceMark: dMark, timeoutMs: 5000 });
  dMark = display.mark();
  log("round 1 complete, internal round1 tally:", JSON.stringify(round1Score));
  display.send({ t: "advance" });

  // --- round 2: Carol disconnects mid-round; game must not deadlock ------
  log("\n-- round 2: Carol disconnects before submitting; game must not deadlock --");
  const r2Writing = await display.waitFor((m) => m.t === "display" && m.view === "writing", { sinceMark: dMark, timeoutMs: 5000 });
  dMark = display.mark();
  assert(r2Writing.data.round === "Round 2", `round 2's display view is labeled "Round 2" (got "${r2Writing.data.round}")`);

  const round2PromptOf = {};
  for (const name of NAMES) {
    const frame = await players[name].client.waitFor((m) => m.t === "controller" && m.view === "writing" && m.data.prompts.some((pr) => pr.promptId.startsWith("r1-")));
    round2PromptOf[name] = frame.data.prompts;   // cycle pairing: two each
  }

  // Carol disconnects WITHOUT submitting -- proves a mid-round disconnect
  // doesn't deadlock the writing phase.
  players.Carol.client.close();
  await display.waitFor((m) => m.t === "room" && m.players.find((p) => p.name === "Carol")?.connected === false, { timeoutMs: 5000 });
  assert(true, "Carol's disconnect is reflected in the room roster (connected: false)");

  for (const name of ["Alice", "Bob", "Dave"]) {
    for (const pr of round2PromptOf[name]) {
      const text = `${name}:${pr.promptId}`;
      textOf[`${pr.promptId}:${name}`] = text;
      players[name].client.send({ t: "action", action: "submit", promptId: pr.promptId, text });
    }
  }

  const round2VoteStart = Date.now();
  const r2Voting = await display.waitFor((m) => m.t === "display" && m.view === "voting", { sinceMark: dMark, timeoutMs: 10000 });
  const round2ResolveMs = Date.now() - round2VoteStart;
  dMark = display.mark();
  assert(
    round2ResolveMs < 10000,
    `round 2 writing resolved quickly (${round2ResolveMs}ms) despite Carol's disconnect -- did not wait for the ~75s writing timer, proving the disconnect didn't deadlock the round`
  );

  const round2Authors = {};
  for (const mid of [r2Voting.data.matchupId]) round2Authors[mid] = null; // placeholder, filled below as we go
  const round2Score = {};
  const round2MatchupCount = r2Voting.data.matchupCount;
  for (let i = 0; i < round2MatchupCount; i++) {
    const dv = await display.waitFor((m) => m.t === "display" && m.view === "voting", { sinceMark: dMark, timeoutMs: 8000 });
    dMark = display.mark();
    const mid = dv.data.matchupId;
    // Figure out authors for this round-2 matchup from whoever holds a
    // prompt with this matchupId (each player holds two).
    const authors = Object.keys(round2PromptOf).filter((n) => round2PromptOf[n].some((pr) => pr.promptId === mid));
    log(`  round2 matchup ${i}: ${mid}, authors=${JSON.stringify(authors)}`);
    const involvesCarol = authors.includes("Carol");
    const eligible = NAMES.filter((n) => !authors.includes(n) && n !== "Carol");
    const realAuthor = involvesCarol ? authors.find((a) => a !== "Carol") : authors[0];
    for (const voter of eligible) {
      players[voter].client.send({ t: "action", action: "vote", matchupId: mid, choice: dv.data.answers.A === textOf[`${mid}:${realAuthor}`] ? "A" : "B" });
    }
    const dr = await display.waitFor((m) => m.t === "display" && m.view === "reveal", { sinceMark: dMark, timeoutMs: 8000 });
    dMark = display.mark();
    log("  round2 reveal:", JSON.stringify(dr.data.entries));
    if (involvesCarol) {
      const carolEntry = dr.data.entries.find((e) => e.text === "(no answer)");
      assert(carolEntry && carolEntry.points === 0, `Carol's no-answer placeholder in ${mid} earns 0 points (got ${carolEntry && carolEntry.points})`);
    }
    for (const e of dr.data.entries) {
      const author = e.text === "(no answer)" ? "Carol" : authors.find((a) => textOf[`${mid}:${a}`] === e.text);
      round2Score[author] = (round2Score[author] || 0) + e.points;
    }
    display.send({ t: "advance" });
  }
  await display.waitFor((m) => m.t === "display" && m.view === "standings", { sinceMark: dMark, timeoutMs: 5000 });
  dMark = display.mark();
  log("round 2 complete, internal round2 tally:", JSON.stringify(round2Score));
  display.send({ t: "advance" });

  // --- verify Carol's seat is fully released after grace expires ---------
  log("\n-- verifying Carol's seat is released after the reconnect grace window --");
  const carolGone = await display
    .waitFor((m) => m.t === "room" && !m.players.some((p) => p.name === "Carol"), { sinceMark: 0, timeoutMs: 8000 })
    .catch(() => null);
  assert(carolGone !== null, "Carol's seat is fully released (removed from the room roster) once her reconnect grace expires");

  // --- final round ---------------------------------------------------------
  log("\n-- final Kwiplash! round --");
  const finalWriting = await display.waitFor((m) => m.t === "display" && m.view === "writing", { sinceMark: dMark, timeoutMs: 5000 });
  dMark = display.mark();
  assert(finalWriting.data.round === "Kwiplash!", `final round is labeled "Kwiplash!" (got "${finalWriting.data.round}")`);
  assert(finalWriting.data.totalPlayers === 3, `final round's writing set has exactly 3 authors now that Carol has left (got ${finalWriting.data.totalPlayers})`);

  const remaining = ["Alice", "Bob", "Dave"];
  for (const name of remaining) {
    const frame = await players[name].client.waitFor((m) => m.t === "controller" && m.view === "writing" && m.data.prompts.some((pr) => pr.promptId === "final"));
    const pr = frame.data.prompts[0];
    players[name].client.send({ t: "action", action: "submit", promptId: pr.promptId, text: `${name}:final` });
  }

  const finalVoting = await display.waitFor((m) => m.t === "display" && m.view === "final-voting", { sinceMark: dMark, timeoutMs: 8000 });
  dMark = display.mark();
  assert(finalVoting.data.entries.length === 3, `final-voting display shows exactly 3 entries, Carol excluded (got ${finalVoting.data.entries.length})`);
  assert(!finalVoting.data.entries.some((e) => e.name === "Carol"), "Carol does not appear as a final-round candidate");

  // Self-vote-in-ballot forgery check: Bob tries to name himself gold.
  const bobFrame = await players.Bob.client.waitFor((m) => m.t === "controller" && m.view === "final-voting");
  const bobMarkBefore = players.Bob.client.mark();
  players.Bob.client.send({ t: "action", action: "ballot", gold: players.Bob.id, silver: null, bronze: null });
  await sleep(300);
  const bobAfterForgery = players.Bob.client.frames
    .slice(bobMarkBefore)
    .filter((m) => m.t === "controller" && m.view === "final-voting")
    .pop();
  assert(
    !bobAfterForgery || !bobAfterForgery.data.myBallot || bobAfterForgery.data.myBallot.gold !== players.Bob.id,
    "a self-vote ballot (gold = own playerId) is rejected server-side, not recorded"
  );
  void bobFrame;

  // Real ballots: everyone gives everyone else gold or silver (only 2
  // other candidates exist with 3 players, so bronze is left null).
  const ballotsSent = {};
  for (const name of remaining) {
    const others = remaining.filter((n) => n !== name);
    const gold = players[others[0]].id;
    const silver = players[others[1]].id;
    ballotsSent[name] = { gold: others[0], silver: others[1] };
    players[name].client.send({ t: "action", action: "ballot", gold, silver, bronze: null });
  }

  const finalReveal = await display.waitFor((m) => m.t === "display" && m.view === "final-reveal", { sinceMark: dMark, timeoutMs: 8000 });
  dMark = display.mark();
  log("final reveal rows:", JSON.stringify(finalReveal.data.rows));

  // Recompute expected gold/silver/bronze tallies from the ballots we sent
  // and check the server's math matches exactly.
  const expectedTally = {};
  for (const name of remaining) expectedTally[name] = { gold: 0, silver: 0, bronze: 0 };
  for (const voter of remaining) {
    const b = ballotsSent[voter];
    expectedTally[b.gold].gold++;
    expectedTally[b.silver].silver++;
  }
  const finalScore = {};
  let allTalliesMatch = true;
  for (const row of finalReveal.data.rows) {
    const exp = expectedTally[row.name];
    const expPoints = exp.gold * finalReveal.data.gold + exp.silver * finalReveal.data.silver + exp.bronze * finalReveal.data.bronze;
    if (row.gold !== exp.gold || row.silver !== exp.silver || row.bronze !== exp.bronze || row.points !== expPoints) {
      allTalliesMatch = false;
      log(`  MISMATCH for ${row.name}: server=${JSON.stringify(row)} expected=${JSON.stringify(exp)} expPoints=${expPoints}`);
    }
    finalScore[row.name] = row.points;
  }
  assert(allTalliesMatch, "final round gold/silver/bronze tallies and points match hand-computed expectations from the ballots actually sent");

  display.send({ t: "advance" });
  const endedRoom = await display.waitFor((m) => m.t === "room" && m.state === "lobby", { sinceMark: dMark, timeoutMs: 5000 });
  assert(endedRoom.currentGame === null, "room returns to lobby with currentGame === null after the final round ends");

  // --- sanity-check the BR awards ------------------------------------------
  log("\n-- BR award sanity check --");
  const totalScore = {};
  for (const name of remaining) {
    totalScore[name] = (round1Score[name] || 0) + (round2Score[name] || 0) + (finalScore[name] || 0);
  }
  log("independently-tallied total scores (present players):", JSON.stringify(totalScore));
  const maxScore = Math.max(...Object.values(totalScore));
  const expectedWinners = remaining.filter((n) => totalScore[n] === maxScore);
  log("expected winner(s) by independent tally:", JSON.stringify(expectedWinners));

  const brByName = {};
  for (const p of endedRoom.players) brByName[p.name] = p.brTotal;
  log("actual brTotal after game end:", JSON.stringify(brByName));

  const actualWinners = remaining.filter((n) => brByName[n] === 1);
  const actualLosers = remaining.filter((n) => brByName[n] === 0);
  assert(
    actualWinners.length + actualLosers.length === remaining.length,
    "every present player's brTotal delta from this game is either exactly 0 or exactly 1 (never anything else)"
  );
  assert(
    JSON.stringify([...actualWinners].sort()) === JSON.stringify([...expectedWinners].sort()),
    `ctx.end awarded BR to exactly the independently-computed top scorer(s) (expected ${JSON.stringify(expectedWinners)}, got ${JSON.stringify(actualWinners)})`
  );
  assert(actualWinners.length >= 1, "at least one player won a BR point from this game");

  display.close();

  // --- summary ---------------------------------------------------------
  log(`\n=== ${passCount} passed, ${failCount} failed ===`);
  log(`Finished: ${new Date().toISOString()}`);
  if (failCount > 0) process.exit(1);
}

main().catch((err) => {
  console.error("INTEGRATION SCRIPT CRASHED:", err);
  process.exit(1);
});
