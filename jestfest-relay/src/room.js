// The Jest Fest room Durable Object -- one instance per room code.
//
// Design constraints this file exists to satisfy (see PROTOCOL.md + the
// build brief):
//   1. WebSocket Hibernation API only (`state.acceptWebSocket` +
//      webSocketMessage/webSocketClose/webSocketError + alarm()), never a
//      bare `addEventListener('message')`. An idle room must not burn
//      compute duration.
//   2. Hibernation evicts *all* in-memory fields between events. Every
//      handler therefore starts with `ensureLoaded()`, which lazily
//      populates in-memory fields from `state.storage` (a write-through
//      cache, not the source of truth), and ends by calling `flush()`,
//      which persists the cache back to storage. Nothing is trusted to
//      survive in memory across an await boundary once hibernation is in
//      play, which is why every mutating path re-derives the alarm.
//   3. Room end explicitly calls `state.storage.deleteAll()` -- nothing
//      outlives the game night, and SQLite-backed DO storage does not wipe
//      itself.
//   4/5/6/7/8/9/10/11: see inline comments at the relevant handler.

import GAME_REGISTRY from "./games/index.js";

const DEFAULT_RECONNECT_GRACE_MS = 180_000; // 180s, PROTOCOL.md §4
const DEFAULT_ROOM_TTL_MS = 6 * 60 * 60 * 1000; // 6h, PROTOCOL.md §4
const MAX_NAME_LENGTH = 24;
// PROTOCOL.md defines a `room_full` error code but never states a cap.
// Kwiplash/Fish and Slips have no documented hard maximum either (spec
// §5.2: "no hard maximum ... a playtesting question"). This is a generous,
// arbitrary safety valve, not a game-design decision.
const MAX_PLAYERS = 32;

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function publicPlayer(p) {
  return { id: p.id, name: p.name, connected: p.connected, brTotal: p.brTotal };
}

function safeAttachment(ws) {
  try {
    return ws.deserializeAttachment();
  } catch {
    return null;
  }
}

function decodeMessage(message) {
  return typeof message === "string" ? message : new TextDecoder().decode(message);
}

// --- seeded PRNG (mulberry32) ------------------------------------------
// A single deterministic step function: given a 32-bit state, returns
// [value in [0,1), nextState]. Room state stores only `prngState` (a plain
// number), so it round-trips through JSON / DO storage / hibernation with
// no special serialization, and replaying the same call sequence against
// the same seed always reproduces the same values.
function stepPRNG(state) {
  let a = state | 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [value, a >>> 0];
}

export class Room {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    // Configurable via wrangler vars (RECONNECT_GRACE_MS / ROOM_TTL_MS) so
    // integration tests don't need to block on a real 180s/6h wait; the
    // defaults shipped in wrangler.jsonc match PROTOCOL.md §4 exactly.
    this.reconnectGraceMs = Number(env?.RECONNECT_GRACE_MS) || DEFAULT_RECONNECT_GRACE_MS;
    this.roomTtlMs = Number(env?.ROOM_TTL_MS) || DEFAULT_ROOM_TTL_MS;
    this.loaded = false;
    this.meta = null; // { code, createdAt, lastActivityAt, state, currentGame, prngState }
    this.players = []; // [{id, name, connected, brTotal, rt, disconnectAt}]
    this.timers = {}; // { 'grace:<playerId>': deadlineMs, 'game:<name>': deadlineMs }
    this.game = null; // live game module instance, lazily (re)built via ensureGameLoaded()
    this._savedGameState = null; // { gameId, data } read from storage, consumed by ensureGameLoaded()
  }

  // -- persistence -------------------------------------------------------

  async ensureLoaded() {
    if (this.loaded) return;
    const stored = await this.state.storage.get(["meta", "players", "timers", "gameState"]);
    this.meta = stored.get("meta") || null;
    this.players = stored.get("players") || [];
    this.timers = stored.get("timers") || {};
    this._savedGameState = stored.get("gameState") || null;
    this.game = null;
    this.loaded = true;
  }

  /** Write the in-memory cache back to storage and reschedule the alarm. */
  async flush() {
    if (!this.meta) return; // room ended/never existed this tick; nothing to persist
    const toWrite = { meta: this.meta, players: this.players, timers: this.timers };
    if (this.game) {
      try {
        toWrite.gameState = { gameId: this.meta.currentGame, data: this.game.serialize() };
      } catch (e) {
        this.logGameError("serialize", e);
      }
    }
    await this.state.storage.put(toWrite);

    let nextAlarm = this.meta.lastActivityAt + this.roomTtlMs;
    for (const deadline of Object.values(this.timers)) {
      if (deadline < nextAlarm) nextAlarm = deadline;
    }
    await this.state.storage.setAlarm(nextAlarm);
  }

  now() {
    return Date.now();
  }

  touchActivity() {
    if (this.meta) this.meta.lastActivityAt = this.now();
  }

  random() {
    const [value, nextState] = stepPRNG(this.meta.prngState);
    this.meta.prngState = nextState;
    return value;
  }

  // -- HTTP entry (internal routes + WS upgrade) --------------------------

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/__init" && request.method === "POST") {
      return this.handleInit(request);
    }
    if (url.pathname === "/__status" && request.method === "GET") {
      return this.handleStatus();
    }
    if (url.pathname.endsWith("/ws")) {
      return this.handleWsUpgrade(request, url);
    }
    return new Response("not found", { status: 404 });
  }

  async handleInit(request) {
    await this.ensureLoaded();
    let body = {};
    try {
      body = await request.json();
    } catch {
      // no body is fine; code falls back below
    }
    const code = (body.code || "").toUpperCase();
    const seedBuf = new Uint32Array(1);
    crypto.getRandomValues(seedBuf);
    const now = this.now();

    this.meta = {
      code,
      createdAt: now,
      lastActivityAt: now,
      state: "lobby",
      currentGame: null,
      prngState: seedBuf[0] >>> 0,
    };
    this.players = [];
    this.timers = {};
    this.game = null;
    this._savedGameState = null;

    await this.flush();
    return jsonResponse({ ok: true, code });
  }

  async handleStatus() {
    await this.ensureLoaded();
    if (!this.meta) return jsonResponse({ open: false, state: null });
    return jsonResponse({ open: this.meta.state !== "ended", state: this.meta.state });
  }

  async handleWsUpgrade(request, url) {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("expected websocket upgrade", { status: 426 });
    }
    const role = (url.searchParams.get("role") || "").toLowerCase();
    const name = url.searchParams.get("name") || "";
    const rt = url.searchParams.get("rt") || "";

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // WebSocket Hibernation API: this registers the socket with the runtime
    // so the DO can be evicted from memory between messages without losing
    // the connection. Tags are a coarse index; per-connection identity is
    // carried on the socket itself via serializeAttachment (see below),
    // which is what actually survives hibernation.
    this.state.acceptWebSocket(server, [role === "display" ? "display" : "controller"]);

    await this.handleNewConnection(server, { role, name, rt });

    return new Response(null, { status: 101, webSocket: client });
  }

  // -- connection lifecycle ------------------------------------------------

  liveSockets() {
    return this.state.getWebSockets();
  }

  displaySockets() {
    return this.liveSockets().filter((ws) => safeAttachment(ws)?.role === "display");
  }

  controllerSockets() {
    return this.liveSockets().filter((ws) => safeAttachment(ws)?.role === "controller");
  }

  socketsForPlayer(playerId) {
    return this.liveSockets().filter((ws) => {
      const att = safeAttachment(ws);
      return att && att.role === "controller" && att.playerId === playerId;
    });
  }

  sendFrame(ws, t, payload) {
    try {
      ws.send(JSON.stringify({ t, ...payload }));
    } catch {
      // socket already closed/closing; nothing to do
    }
  }

  sendToRole(role, t, payload) {
    const sockets = role === "display" ? this.displaySockets() : this.controllerSockets();
    for (const ws of sockets) this.sendFrame(ws, t, payload);
  }

  broadcastRoom() {
    if (!this.meta) return;
    const payload = {
      code: this.meta.code,
      state: this.meta.state,
      currentGame: this.meta.currentGame,
      players: this.players.map(publicPlayer),
    };
    for (const ws of this.liveSockets()) this.sendFrame(ws, "room", payload);
  }

  toast(playerId, level, text) {
    if (playerId === null || playerId === undefined) {
      for (const ws of this.liveSockets()) this.sendFrame(ws, "toast", { level, text });
    } else {
      for (const ws of this.socketsForPlayer(playerId)) this.sendFrame(ws, "toast", { level, text });
    }
  }

  dedupeName(base) {
    const taken = new Set(this.players.map((p) => p.name));
    if (!taken.has(base)) return base;
    let n = 2;
    while (taken.has(`${base} (${n})`)) n++;
    return `${base} (${n})`;
  }

  async handleNewConnection(ws, { role, name, rt }) {
    await this.ensureLoaded();

    if (!this.meta) {
      this.sendFrame(ws, "error", { code: "room_not_found", message: "Room not found." });
      ws.close(1008, "room_not_found");
      return;
    }

    if (role !== "display" && role !== "controller") {
      this.sendFrame(ws, "error", { code: "bad_role", message: "role must be display or controller." });
      ws.close(1008, "bad_role");
      return;
    }

    this.touchActivity();

    if (role === "display") {
      await this.handleDisplayJoin(ws);
    } else {
      await this.handleControllerJoin(ws, name, rt);
    }

    await this.flush();
  }

  async handleDisplayJoin(ws) {
    const others = this.displaySockets().filter((s) => s !== ws);
    if (others.length > 0) {
      // PROTOCOL.md §4: second display connection while one is live ->
      // error/display_taken, then close. The socket that just connected is
      // the one turned away; the existing display is left untouched.
      this.sendFrame(ws, "error", { code: "display_taken", message: "A display is already connected." });
      ws.close(1008, "display_taken");
      return;
    }

    ws.serializeAttachment({ role: "display" });
    this.sendFrame(ws, "hello", { role: "display", playerId: null, name: null, reconnectToken: null });
    this.broadcastRoom();

    if (this.meta.state === "in-game") {
      const game = await this.ensureGameLoaded();
      if (game) this.pushAll();
    }
  }

  async handleControllerJoin(ws, rawName, rt) {
    const trimmed = (rawName || "").trim().slice(0, MAX_NAME_LENGTH);
    const desiredName = trimmed || "Player";

    // Reconnect: prefer the reconnect token (survives a name re-type), fall
    // back to matching a currently-held (disconnected) seat by name.
    // PROTOCOL.md §4: "Rejoin with matching rt OR same name restores the
    // same playerId and brTotal." A name match only applies to a seat that
    // is currently disconnected -- if someone else is actively connected
    // under that name, a same-named newcomer is treated as a brand new
    // player (and gets the usual " (2)" suffix) rather than hijacking a
    // live seat. PROTOCOL.md doesn't spell out this edge case; this is the
    // resolution chosen here.
    let player = null;
    if (rt) player = this.players.find((p) => p.rt === rt);
    if (!player && desiredName) {
      player = this.players.find((p) => p.name === desiredName && !p.connected);
    }

    const isReconnect = !!player;

    if (player) {
      player.connected = true;
      player.disconnectAt = null;
      delete this.timers[`grace:${player.id}`];
    } else {
      if (this.players.length >= MAX_PLAYERS) {
        this.sendFrame(ws, "error", { code: "room_full", message: "Room is full." });
        ws.close(1008, "room_full");
        return;
      }
      player = {
        id: crypto.randomUUID(),
        name: this.dedupeName(desiredName),
        connected: true,
        brTotal: 0,
        rt: crypto.randomUUID(),
        disconnectAt: null,
      };
      this.players.push(player);
    }

    ws.serializeAttachment({ role: "controller", playerId: player.id, name: player.name });
    this.sendFrame(ws, "hello", {
      role: "controller",
      playerId: player.id,
      name: player.name,
      reconnectToken: player.rt,
    });
    this.broadcastRoom();

    if (this.meta.state === "in-game") {
      const game = await this.ensureGameLoaded();
      if (game) {
        try {
          if (isReconnect) {
            game.onPlayerReconnect(publicPlayer(player));
          } else if (game.constructor.allowsMidGameJoin) {
            game.onPlayerJoin(publicPlayer(player));
          }
        } catch (e) {
          this.logGameError(isReconnect ? "onPlayerReconnect" : "onPlayerJoin", e);
        }
        this.pushAll();
      }
    }
  }

  async webSocketMessage(ws, message) {
    await this.ensureLoaded();
    if (!this.meta) return; // room already gone; ignore stray messages

    let msg;
    try {
      msg = JSON.parse(decodeMessage(message));
    } catch {
      return; // malformed frame; ignore rather than error (unknown/bad frames are silently dropped)
    }
    if (!msg || typeof msg.t !== "string") return;

    const att = safeAttachment(ws);
    if (!att) return;

    this.touchActivity();

    switch (msg.t) {
      case "ping":
        this.sendFrame(ws, "pong", {});
        break;
      case "start":
        if (att.role === "display") await this.handleStart(msg.gameId);
        break;
      case "action":
        if (att.role === "controller") await this.handleAction(att.playerId, msg);
        break;
      case "advance":
        if (att.role === "display") await this.handleAdvance();
        break;
      case "endgame":
        if (att.role === "display") await this.handleEndGame();
        break;
      case "endroom":
        if (att.role === "display") {
          await this.endRoom("explicit");
          return; // endRoom already deleted storage; nothing left to flush
        }
        break;
      default:
        // Unknown `t` MUST be ignored, not errored (PROTOCOL.md §1).
        break;
    }

    await this.flush();
  }

  async webSocketClose(ws) {
    await this.handleSocketGone(ws);
  }

  async webSocketError(ws) {
    await this.handleSocketGone(ws);
  }

  async handleSocketGone(ws) {
    await this.ensureLoaded();
    if (!this.meta) return;

    const att = safeAttachment(ws);
    if (!att) return;

    if (att.role === "display") {
      // PROTOCOL.md §4: display disconnect ends the room immediately. No
      // host migration in v1.
      await this.endRoom("display_left");
      return;
    }

    if (att.role === "controller" && att.playerId) {
      const player = this.players.find((p) => p.id === att.playerId);
      // Guard against a stale/duplicate close event for a seat that has
      // already reconnected on a different socket.
      if (player && player.connected && this.socketsForPlayer(player.id).every((s) => s === ws)) {
        player.connected = false;
        player.disconnectAt = this.now();
        this.timers[`grace:${player.id}`] = this.now() + this.reconnectGraceMs;
        this.broadcastRoom();
        await this.flush();
      }
    }
  }

  // -- game lifecycle -------------------------------------------------------

  buildCtx() {
    const room = this;
    return {
      get players() {
        return room.players.map(publicPlayer);
      },
      push: () => room.pushAll(),
      pushTo: (playerId) => room.pushToPlayer(playerId),
      toast: (playerId, level, text) => room.toast(playerId, level, text),
      setTimer: (name, ms) => room.gameSetTimer(name, ms),
      clearTimer: (name) => room.gameClearTimer(name),
      now: () => room.now(),
      end: (awards) => room.gameEnd(awards),
      random: () => room.random(),
    };
  }

  async ensureGameLoaded() {
    await this.ensureLoaded();
    if (this.game) return this.game;
    if (!this.meta || this.meta.state !== "in-game" || !this.meta.currentGame) return null;

    const GameClass = GAME_REGISTRY[this.meta.currentGame];
    if (!GameClass) {
      this.logGameError("load", new Error(`no module registered for gameId "${this.meta.currentGame}"`));
      return null;
    }
    try {
      const game = new GameClass(this.buildCtx());
      if (this._savedGameState && this._savedGameState.gameId === this.meta.currentGame) {
        game.restore(this._savedGameState.data);
      }
      this.game = game;
      return game;
    } catch (e) {
      this.logGameError("restore", e);
      return null;
    }
  }

  pushAll() {
    if (!this.game) return;
    let dView = null;
    try {
      dView = this.game.displayView();
    } catch (e) {
      this.logGameError("displayView", e);
    }
    if (dView) this.sendToRole("display", "display", dView);

    for (const p of this.players) this.pushToPlayer(p.id);
  }

  pushToPlayer(playerId) {
    if (!this.game) return;
    let cView = null;
    try {
      cView = this.game.controllerView(playerId);
    } catch (e) {
      this.logGameError("controllerView", e);
    }
    if (!cView) return;
    for (const ws of this.socketsForPlayer(playerId)) this.sendFrame(ws, "controller", cView);
  }

  async handleStart(gameId) {
    if (!this.meta || this.meta.state === "in-game") return;

    const GameClass = GAME_REGISTRY[gameId];
    if (!GameClass) {
      // Missing/unregistered module (not built yet, or bad id from a
      // client) -> error/not_allowed, never crash the room.
      this.sendToRole("display", "error", { code: "not_allowed", message: `Unknown game "${gameId}".` });
      return;
    }

    const connectedCount = this.players.filter((p) => p.connected).length;
    const minPlayers = GameClass.minPlayers || 1;
    if (connectedCount < minPlayers) {
      this.sendToRole("display", "error", {
        code: "too_few_players",
        message: `${GameClass.title || gameId} needs at least ${minPlayers} players.`,
      });
      return;
    }

    try {
      const game = new GameClass(this.buildCtx());
      this.game = game;
      this.meta.currentGame = gameId;
      this.meta.state = "in-game";
      this._savedGameState = null;
      game.start();
      this.broadcastRoom();
      this.pushAll();
    } catch (e) {
      this.logGameError("start", e);
      this.game = null;
      this.meta.currentGame = null;
      this.meta.state = "lobby";
      this.sendToRole("display", "error", { code: "not_allowed", message: "That game failed to start." });
    }
  }

  async handleAction(playerId, msg) {
    if (!this.meta || this.meta.state !== "in-game") return;
    const player = this.players.find((p) => p.id === playerId);
    if (!player) return;

    const game = await this.ensureGameLoaded();
    if (!game) return;

    const { t, ...action } = msg;
    try {
      game.onAction(playerId, action);
    } catch (e) {
      this.logGameError("onAction", e);
      return;
    }
    // The game may have ended itself via ctx.end() inside onAction, in
    // which case this.game is now null -- pushAll() is a safe no-op then.
    this.pushAll();
  }

  async handleAdvance() {
    if (!this.meta || this.meta.state !== "in-game") return;
    const game = await this.ensureGameLoaded();
    if (!game) return;
    try {
      game.onAdvance();
    } catch (e) {
      this.logGameError("onAdvance", e);
      return;
    }
    this.pushAll();
  }

  async handleEndGame() {
    if (!this.meta || this.meta.state !== "in-game") return;
    this.game = null;
    this.meta.currentGame = null;
    this.meta.state = "lobby";
    this._savedGameState = null;
    this.clearAllGameTimers();
    await this.state.storage.delete("gameState");
    this.broadcastRoom();
  }

  /** ctx.end(awards) -- called synchronously by game code. */
  gameEnd(awards) {
    if (Array.isArray(awards)) {
      for (const a of awards) {
        if (!a || typeof a.playerId !== "string") continue;
        const player = this.players.find((p) => p.id === a.playerId);
        if (player) player.brTotal += Number(a.points) || 0;
      }
    }
    this.game = null;
    this.meta.currentGame = null;
    this.meta.state = "lobby";
    this._savedGameState = null;
    this.clearAllGameTimers();
    this.state.storage.delete("gameState"); // fire-and-forget; flush() also overwrites at handler end
    this.broadcastRoom();
  }

  gameSetTimer(name, ms) {
    this.timers[`game:${name}`] = this.now() + ms;
  }

  gameClearTimer(name) {
    delete this.timers[`game:${name}`];
  }

  clearAllGameTimers() {
    for (const key of Object.keys(this.timers)) {
      if (key.startsWith("game:")) delete this.timers[key];
    }
  }

  logGameError(where, err) {
    console.error(`[jestfest-relay] game module error in ${where}:`, (err && err.stack) || err);
  }

  // -- room end / timers ----------------------------------------------------

  async endRoom(reason) {
    await this.ensureLoaded();
    if (!this.meta) return;

    const sockets = this.liveSockets();
    for (const ws of sockets) this.sendFrame(ws, "ended", { reason });
    for (const ws of sockets) {
      try {
        ws.close(1000, reason);
      } catch {
        // already closed/closing
      }
    }

    // Requirement #3: nothing outlives the game night. SQLite-backed DO
    // storage does not evaporate on its own -- delete it explicitly.
    await this.state.storage.deleteAll();
    await this.state.storage.deleteAlarm();

    this.meta = null;
    this.players = [];
    this.timers = {};
    this.game = null;
    this._savedGameState = null;
    this.loaded = true; // storage is authoritatively empty; no need to re-read it
  }

  async alarm() {
    await this.ensureLoaded();
    if (!this.meta) return; // room already ended

    const now = this.now();

    if (now >= this.meta.lastActivityAt + this.roomTtlMs) {
      await this.endRoom("timeout");
      return;
    }

    const fired = Object.entries(this.timers)
      .filter(([, deadline]) => deadline <= now)
      .map(([name]) => name);

    for (const name of fired) {
      delete this.timers[name];
      if (name.startsWith("grace:")) {
        await this.expireGrace(name.slice("grace:".length));
      } else if (name.startsWith("game:")) {
        const game = await this.ensureGameLoaded();
        if (game) {
          try {
            game.onTimer(name.slice("game:".length));
          } catch (e) {
            this.logGameError("onTimer", e);
          }
          this.pushAll();
        }
      }
    }

    await this.flush();
  }

  async expireGrace(playerId) {
    const idx = this.players.findIndex((p) => p.id === playerId);
    if (idx === -1) return;
    const player = this.players[idx];
    if (player.connected) return; // reconnected in the meantime; nothing to do

    this.players.splice(idx, 1);

    if (this.meta.state === "in-game") {
      const game = await this.ensureGameLoaded();
      if (game) {
        try {
          game.onPlayerLeave(playerId);
        } catch (e) {
          this.logGameError("onPlayerLeave", e);
        }
      }
    }

    this.broadcastRoom();
    if (this.game) this.pushAll();
  }
}

export default Room;
