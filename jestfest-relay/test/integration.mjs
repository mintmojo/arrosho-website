// Live integration script -- NOT a node:test unit test. Run against a real
// `wrangler dev --local` instance (see README.md / build-notes for the
// exact command) and connects real WebSocket clients via the global
// `WebSocket` (Node 22+). Prints a running log of every assertion so the
// output can be pasted verbatim as evidence.
//
// Usage: node test/integration.mjs [http://localhost:8787]

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

/**
 * Minimal client: connects, records every frame it receives (in order), and
 * exposes `waitFor(predicate, {timeoutMs, sinceMark})`.
 *
 * IMPORTANT: `waitFor` without an explicit `sinceMark` searches the client's
 * *entire* history first, same as "has this ever happened". That's right for
 * one-shot frames (e.g. the `hello` right after connecting) but WRONG for
 * "wait for the next state change" -- a predicate like `players.length===2`
 * can spuriously match a frame from an earlier, unrelated point in the
 * conversation (e.g. before a third player had joined). Call `client.mark()`
 * before triggering the action you're waiting on, and pass it as `sinceMark`
 * to only consider frames received from that point forward.
 */
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
      /** Index cursor to pass as `sinceMark` to a later waitFor call. */
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
      // NOTE: `wrangler dev --local` (Miniflare) has been observed taking
      // up to ~10s to complete a server-initiated close() handshake for a
      // hibernatable WebSocket -- confirmed via a standalone repro (the
      // server sends the close frame immediately; the local runtime is
      // just slow to finish the handshake). The close code/reason are
      // correct once it lands. This is a local-dev-only latency quirk, not
      // a protocol bug, so the default timeout here is generous.
      async waitClosed(timeoutMs = 12000) {
        const start = Date.now();
        while (closedInfo === null && Date.now() - start < timeoutMs) {
          await sleep(50);
        }
        return closedInfo;
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

async function main() {
  log(`=== Jest Fest relay integration run against ${BASE} ===`);
  log(`Started: ${new Date().toISOString()}`);

  // --- 1. create room -----------------------------------------------------
  log("\n-- create room --");
  const createResp = await fetch(`${BASE}/room`, { method: "POST" });
  const createBody = await createResp.json();
  assert(createResp.status === 201, `POST /room returns 201 (got ${createResp.status})`);
  assert(/^[A-Z0-9]{4}$/.test(createBody.code), `code "${createBody.code}" is 4 chars from the expected alphabet`);
  const code = createBody.code;
  log(`  room code: ${code}`);

  const existsResp = await fetch(`${BASE}/room/${code}/exists`);
  const existsBody = await existsResp.json();
  assert(existsResp.status === 200 && existsBody.exists === true && existsBody.state === "lobby", `GET /room/${code}/exists reports open lobby`);

  // --- 2. display connects -------------------------------------------------
  log("\n-- display connects --");
  const display = await connect(`${WS_BASE}/room/${code}/ws?role=display`, "display");
  const displayHello = await display.waitFor((m) => m.t === "hello");
  assert(displayHello.role === "display", "display gets hello with role=display");
  const displayRoom1 = await display.waitFor((m) => m.t === "room");
  assert(displayRoom1.state === "lobby" && displayRoom1.players.length === 0, "display sees empty lobby room frame");

  // second display should be rejected
  const secondDisplay = await connect(`${WS_BASE}/room/${code}/ws?role=display`, "display2");
  const dupErr = await secondDisplay.waitFor((m) => m.t === "error");
  assert(dupErr.code === "display_taken", "second display connection gets error/display_taken");
  const secondDisplayClosed = await secondDisplay.waitClosed();
  assert(secondDisplayClosed !== null, "second display socket is closed by the server");

  // --- 3. three controllers join -------------------------------------------
  log("\n-- three controllers join --");
  const alice = await connect(`${WS_BASE}/room/${code}/ws?role=controller&name=${encodeURIComponent("Alice")}`, "alice");
  const aliceHello = await alice.waitFor((m) => m.t === "hello");
  assert(aliceHello.role === "controller" && aliceHello.name === "Alice", "Alice gets hello with her name");
  assert(typeof aliceHello.reconnectToken === "string" && aliceHello.reconnectToken.length > 0, "Alice gets a reconnectToken");

  const bob = await connect(`${WS_BASE}/room/${code}/ws?role=controller&name=${encodeURIComponent("Bob")}`, "bob");
  await bob.waitFor((m) => m.t === "hello");

  const displayMark3 = display.mark();
  const carol = await connect(`${WS_BASE}/room/${code}/ws?role=controller&name=${encodeURIComponent("Carol")}`, "carol");
  await carol.waitFor((m) => m.t === "hello");

  const roomAfterThree = await display.waitFor((m) => m.t === "room" && m.players.length === 3, { sinceMark: displayMark3 });
  assert(roomAfterThree.players.map((p) => p.name).sort().join(",") === "Alice,Bob,Carol", "display room roster has Alice, Bob, Carol");

  // --- 4. duplicate name gets (2) ------------------------------------------
  log("\n-- duplicate name --");
  const alice2 = await connect(`${WS_BASE}/room/${code}/ws?role=controller&name=${encodeURIComponent("Alice")}`, "alice2");
  const alice2Hello = await alice2.waitFor((m) => m.t === "hello");
  assert(alice2Hello.name === "Alice (2)", `duplicate "Alice" join gets renamed (got "${alice2Hello.name}")`);
  assert(alice2Hello.playerId !== aliceHello.playerId, "the duplicate name is a distinct playerId from the original Alice");

  // --- start the smoke game, prove BR scoring works end-to-end ------------
  log("\n-- start _smoke game (also proves start/action/ctx.end plumbing) --");
  // _smoke wants exactly 2 *connected* players; disconnect alice2/carol
  // (their seats stay held during grace, but SmokeGame's win condition
  // only counts currently-connected players -- see src/games/_smoke.js).
  const displayMarkDisc = display.mark();
  alice2.close();
  carol.close();
  await display.waitFor((m) => m.t === "room" && m.players.filter((p) => p.connected).length === 2, { sinceMark: displayMarkDisc });

  const displayMarkStart = display.mark();
  const aliceMarkStart = alice.mark();
  display.send({ t: "start", gameId: "_smoke" });
  const smokeStart = await display.waitFor((m) => m.t === "display" || m.t === "error", { sinceMark: displayMarkStart });
  assert(smokeStart.t === "display", `start _smoke succeeds (got ${JSON.stringify(smokeStart)})`);

  const aliceCtrl = await alice.waitFor((m) => m.t === "controller", { sinceMark: aliceMarkStart });
  assert(aliceCtrl.data.tapped === false, "Alice's controller view starts untapped");

  const displayMarkAliceTap = display.mark();
  const aliceMarkTap = alice.mark();
  alice.send({ t: "action", action: "tap" });
  await alice.waitFor((m) => m.t === "controller" && m.data.tapped === true, { sinceMark: aliceMarkTap });

  const displayMarkBobTap = display.mark();
  bob.send({ t: "action", action: "tap" });

  const endedRoom = await display.waitFor((m) => m.t === "room" && m.state === "lobby" && m.players.some((p) => p.brTotal > 0), {
    sinceMark: displayMarkBobTap,
    timeoutMs: 5000,
  });
  const aliceScore = endedRoom.players.find((p) => p.name === "Alice").brTotal;
  const bobScore = endedRoom.players.find((p) => p.name === "Bob").brTotal;
  assert(aliceScore === 2 && bobScore === 1, `BR awarded correctly (Alice=${aliceScore} expected 2, Bob=${bobScore} expected 1)`);
  assert(endedRoom.state === "lobby" && endedRoom.currentGame === null, "room returns to lobby after ctx.end()");
  void displayMarkAliceTap; // (kept for readability of the marks above; not asserted separately)

  // --- 5. controller drops and reconnects within grace ---------------------
  log("\n-- controller drop + reconnect within grace --");
  const aliceRt = aliceHello.reconnectToken;
  const aliceId = aliceHello.playerId;
  const displayMarkAliceDrop = display.mark();
  alice.close();
  await display.waitFor((m) => m.t === "room" && m.players.find((p) => p.id === aliceId)?.connected === false, { sinceMark: displayMarkAliceDrop });
  log("  Alice marked disconnected, seat held");

  await sleep(500); // well within the 3s test grace window (RECONNECT_GRACE_MS=3000 for this run)
  const displayMarkAliceBack = display.mark();
  const aliceBack = await connect(`${WS_BASE}/room/${code}/ws?role=controller&rt=${aliceRt}`, "alice-rejoin");
  const aliceBackHello = await aliceBack.waitFor((m) => m.t === "hello");
  assert(aliceBackHello.playerId === aliceId, "reconnect by rt token restores the same playerId");
  assert(aliceBackHello.name === "Alice", "reconnect restores the same name");

  const roomAfterReconnect = await display.waitFor((m) => m.t === "room" && m.players.find((p) => p.id === aliceId)?.connected === true, {
    sinceMark: displayMarkAliceBack,
  });
  const reconnectedAlice = roomAfterReconnect.players.find((p) => p.id === aliceId);
  assert(reconnectedAlice.brTotal === 2, `reconnect keeps brTotal (got ${reconnectedAlice.brTotal}, expected 2)`);

  // --- 6. controller dropped past grace loses seat -------------------------
  log("\n-- controller drop past grace (loses seat) --");
  const bobBefore = roomAfterReconnect.players.find((p) => p.name === "Bob");
  const displayMarkBobDrop = display.mark();
  bob.close();
  await display.waitFor((m) => m.t === "room" && m.players.find((p) => p.id === bobBefore.id)?.connected === false, { sinceMark: displayMarkBobDrop });
  log("  Bob marked disconnected, waiting out the 3s test grace window...");
  const displayMarkBobGrace = display.mark();
  const roomAfterGraceExpiry = await display.waitFor((m) => m.t === "room" && !m.players.some((p) => p.id === bobBefore.id), {
    sinceMark: displayMarkBobGrace,
    timeoutMs: 8000,
  });
  assert(!roomAfterGraceExpiry.players.some((p) => p.id === bobBefore.id), "Bob's seat is removed after grace expires");

  // Attempting to reconnect Bob by name now should be treated as a NEW
  // player (his old seat is gone), not a resurrection of the old one.
  const bobRejoin = await connect(`${WS_BASE}/room/${code}/ws?role=controller&name=Bob`, "bob-late-rejoin");
  const bobRejoinHello = await bobRejoin.waitFor((m) => m.t === "hello");
  assert(bobRejoinHello.playerId !== bobBefore.id, "post-grace rejoin under the same name gets a brand-new playerId");
  assert(bobRejoinHello.name === "Bob", "post-grace rejoin under a free name keeps the plain name (no suffix)");
  bobRejoin.close();

  // --- 7. display drop ends the room for everyone --------------------------
  log("\n-- display drop ends the room --");
  const aliceBackMarkEnd = aliceBack.mark();
  display.close();
  const aliceEnded = await aliceBack.waitFor((m) => m.t === "ended", { sinceMark: aliceBackMarkEnd, timeoutMs: 5000 });
  assert(aliceEnded.reason === "display_left", `remaining controller gets ended/display_left (got ${JSON.stringify(aliceEnded)})`);
  const aliceBackClosed = await aliceBack.waitClosed();
  assert(aliceBackClosed !== null, "controller socket is closed after ended frame");

  const existsAfterEnd = await fetch(`${BASE}/room/${code}/exists`);
  assert(existsAfterEnd.status === 404, `GET /room/${code}/exists is 404 after display-left end (storage wiped)`);

  // --- 8. endroom explicitly wipes storage ---------------------------------
  log("\n-- endroom wipes storage --");
  const createResp2 = await fetch(`${BASE}/room`, { method: "POST" });
  const { code: code2 } = await createResp2.json();
  log(`  second room code: ${code2}`);
  const display2 = await connect(`${WS_BASE}/room/${code2}/ws?role=display`, "display-b");
  await display2.waitFor((m) => m.t === "hello");
  const ctrlB = await connect(`${WS_BASE}/room/${code2}/ws?role=controller&name=Dee`, "dee");
  await ctrlB.waitFor((m) => m.t === "hello");

  // --- extra protocol edge cases, reusing this room before ending it ------
  log("\n-- ping/pong keepalive --");
  ctrlB.send({ t: "ping" });
  const pong = await ctrlB.waitFor((m) => m.t === "pong");
  assert(pong !== undefined, "server replies {t:'pong'} to a ping");

  log("\n-- too_few_players --");
  // _smoke.minPlayers=2, only Dee is connected in this room.
  const d2MarkFew = display2.mark();
  display2.send({ t: "start", gameId: "_smoke" });
  const tooFew = await display2.waitFor((m) => m.t === "error", { sinceMark: d2MarkFew });
  assert(tooFew.code === "too_few_players", `starting _smoke with 1 player gets error/too_few_players (got ${JSON.stringify(tooFew)})`);

  log("\n-- not_allowed (unknown / not-yet-built game id) --");
  const d2MarkUnknown = display2.mark();
  display2.send({ t: "start", gameId: "totally-not-a-real-game" });
  const notAllowed = await display2.waitFor((m) => m.t === "error", { sinceMark: d2MarkUnknown });
  assert(notAllowed.code === "not_allowed", `starting an unknown gameId gets error/not_allowed (got ${JSON.stringify(notAllowed)})`);

  log("\n-- unknown frame type t is ignored, not errored --");
  const d2MarkUnknownT = display2.mark();
  const ctrlBMarkSentinel = ctrlB.mark();
  display2.send({ t: "totally_made_up_frame_type", foo: "bar" });
  ctrlB.send({ t: "ping" }); // real frame as a sentinel that the connection is still alive & processing
  await ctrlB.waitFor((m) => m.t === "pong", { sinceMark: ctrlBMarkSentinel });
  const strayError = display2.frames.slice(d2MarkUnknownT).find((m) => m.t === "error");
  assert(strayError === undefined, "an unknown frame type produces no error/toast, per PROTOCOL.md §1");

  const ctrlBMarkEnd = ctrlB.mark();
  display2.send({ t: "endroom" });
  const ctrlEnded = await ctrlB.waitFor((m) => m.t === "ended", { sinceMark: ctrlBMarkEnd });
  assert(ctrlEnded.reason === "explicit", `endroom sends ended/explicit to controllers (got ${JSON.stringify(ctrlEnded)})`);

  const existsAfterExplicitEnd = await (async () => {
    // storage delete + close both happen inside endRoom before the frame is
    // sent, so this should already be consistent by the time the client
    // sees `ended`, but poll briefly to be robust to network jitter.
    for (let i = 0; i < 20; i++) {
      const r = await fetch(`${BASE}/room/${code2}/exists`);
      if (r.status === 404) return r;
      await sleep(100);
    }
    return fetch(`${BASE}/room/${code2}/exists`);
  })();
  assert(existsAfterExplicitEnd.status === 404, `GET /room/${code2}/exists is 404 after endroom (storage wiped)`);

  // A brand new room created right after should get issued a code without
  // any leftover state from the deleted room (proves the DO is genuinely
  // reusable post-wipe).
  const createResp3 = await fetch(`${BASE}/room`, { method: "POST" });
  assert(createResp3.status === 201, "a new room can be created immediately after a prior room ended");

  // --- summary ---------------------------------------------------------
  log(`\n=== ${passCount} passed, ${failCount} failed ===`);
  log(`Finished: ${new Date().toISOString()}`);
  if (failCount > 0) process.exit(1);
}

main().catch((err) => {
  console.error("INTEGRATION SCRIPT CRASHED:", err);
  process.exit(1);
});
