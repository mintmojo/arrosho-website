# Jest Fest — wire protocol & game module contract (v1, FROZEN)

Authority: `Jest fest-spec.md` §3.2 — the relay is the referee. Clients render, never decide.
Any parallel build MUST conform to this file exactly. Do not "improve" it mid-build.

## 0. Roles
- **Display** — one per room. The shared screen. Picks games, advances the room. Never plays.
- **Controller** — one per player phone. Sends actions, sees only its own secret info.

## 1. Transport

HTTP (relay origin):
- `POST /room` -> `201 {"code":"K4M9"}` — creates room, Durable Object spun up.
- `GET  /room/:code/exists` -> `200 {"exists":true,"state":"lobby"}` | `404`

WebSocket:
- Display:    `wss://<relay>/room/:code/ws?role=display`
- Controller: `wss://<relay>/room/:code/ws?role=controller&name=<urlenc>&rt=<reconnectToken|empty>`

All frames are JSON objects with a `t` (type) field. Unknown `t` MUST be ignored, not errored.

## 2. Server -> client

| `t` | Payload | To | Meaning |
| --- | --- | --- | --- |
| `hello` | `{role, playerId, name, reconnectToken}` | both | First frame after accept. Controller MUST persist `reconnectToken` in sessionStorage. |
| `room` | `{code, state, currentGame, players:[{id,name,connected,brTotal}]}` | both | Full room snapshot. Sent on join, on any roster change, on game end. `state`: `lobby`\|`in-game`\|`ended`. |
| `display` | `{gameId, view, data}` | display | Display's render payload for the current game state. |
| `controller` | `{gameId, view, data}` | controller | That player's scoped render payload. Never contains another player's secret. |
| `toast` | `{level, text}` | both | Transient message. `level`: `info`\|`warn`\|`error`. |
| `error` | `{code, message}` | both | `code`: `room_not_found`\|`room_full`\|`bad_role`\|`display_taken`\|`too_few_players`\|`not_allowed`. |
| `ended` | `{reason}` | both | Room is over. `reason`: `display_left`\|`timeout`\|`explicit`. Socket closes after. |

## 3. Client -> server

| `t` | Payload | From | Meaning |
| --- | --- | --- | --- |
| `start` | `{gameId}` | display | Begin a game. Server validates min players; replies `error/too_few_players` if short. |
| `action` | `{action, ...fields}` | controller | A move. `action` is game-defined. Server validates EVERYTHING. |
| `advance` | `{}` | display | Display-driven "next" (e.g. leave a results screen). Games may ignore. |
| `endgame` | `{}` | display | Abandon current game, return to lobby, award nothing. |
| `endroom` | `{}` | display | Close the room. Server deletes all state, sends `ended/explicit`. |
| `ping` | `{}` | both | Keepalive. Server replies `{"t":"pong"}`. Client sends every 25s. |

## 4. Room rules (relay-enforced, not client)
- Code: 4 chars from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no O/0/I/1). Regenerate on collision with an open room.
- Duplicate name -> append ` (2)`, ` (3)`… Never reject a join for a name clash.
- Second `role=display` connection while one is live -> `error/display_taken`, close.
- Display disconnect -> room ends immediately (`ended/display_left`). v1 non-goal: host migration.
- Controller disconnect -> `connected:false`, seat held **180s** (`RECONNECT_GRACE_MS`). Rejoin with matching `rt` OR same name restores the same `playerId` and `brTotal`.
- Room inactivity timeout **6h** (`ROOM_TTL_MS`). On end, DO storage is **explicitly deleted** — see spec §10, hibernation means state lives in SQLite, so it must be removed on purpose.
- Use the **WebSocket Hibernation API** (`state.acceptWebSocket`), not a bare `addEventListener` — an idle room must not burn compute.

## 5. Server-side game module contract

Each game is one ES module in `src/games/<id>.js` with a default export class:

```js
export default class Game {
  static id = 'kwiplash';
  static title = 'Kwiplash';
  static minPlayers = 3;
  static maxPlayers = null;          // null = unbounded
  static allowsMidGameJoin = false;  // Fish and Slips sets true

  constructor(ctx) { this.ctx = ctx; }

  start() {}                          // room state is now 'in-game'
  onAction(playerId, action) {}       // validate hard; ignore anything illegal
  onAdvance() {}                      // display pressed next
  onPlayerJoin(player) {}             // only called if allowsMidGameJoin
  onPlayerLeave(playerId) {}          // dropped past grace, or left
  onPlayerReconnect(player) {}        // seat resumed; re-push their controller view
  onTimer(name) {}                    // fires from ctx.setTimer

  displayView() { return { view: 'x', data: {} }; }      // room stamps gameId
  controllerView(playerId) { return { view: 'x', data: {} }; }  // room stamps gameId

  serialize() { return {}; }          // survive hibernation
  restore(saved) {}
}
```

`ctx` provides:

```
ctx.players            -> [{id, name, connected, brTotal}]  (live snapshot)
ctx.push()             -> recompute + send display/controller views to everyone
ctx.pushTo(playerId)   -> send just that player's controller view
ctx.toast(playerId|null, level, text)
ctx.setTimer(name, ms) -> single named timer; setting an existing name replaces it
ctx.clearTimer(name)
ctx.now()              -> ms epoch, server clock ONLY (never trust client time)
ctx.end(awards)        -> awards: [{playerId, points}]; adds to brTotal, returns room to lobby
ctx.random()           -> seeded PRNG; use this, not Math.random, so state is reproducible
```

## 6. Rules that are not negotiable
1. Timers: the **client renders a countdown from a server-sent `endsAt`**; only the server decides time is up. Never accept a client "I finished" as authoritative timing.
2. Secrets (bids, unrevealed answers) NEVER appear in `displayView()` or in another player's `controllerView()` before the server's reveal step.
3. Votes are validated server-side against who is *allowed* to vote — an author cannot vote on their own matchup, and the check happens on the relay.
4. All scoring math happens on the relay.

## 7. Client-side game renderer contract

Each game also ships one browser module at `jestfest/games/<id>.js`, loaded lazily by the shell.
No framework, no build step, ES module, default export:

```js
export default {
  id: 'kwiplash',
  title: 'Kwiplash',
  blurb: 'One prompt, two answers, everyone else picks.',   // shown in the game library
  display: {
    // key MUST match the `view` string the server sends in {t:'display'}
    writing: (data, api) => HTMLElement,
    voting:  (data, api) => HTMLElement,
  },
  controller: {
    writing: (data, api) => HTMLElement,
    voting:  (data, api) => HTMLElement,
  },
};
```

`api` provides:

```
api.send(action, fields)  -> sends {t:'action', action, ...fields}
api.advance()             -> display only; sends {t:'advance'}
api.countdown(el, endsAt) -> renders a live countdown into el from a SERVER endsAt; returns stop()
api.me                    -> {id, name, brTotal}  (controller only; null on display)
api.players               -> latest room roster
api.code                  -> room code
api.el(tag, props, ...kids) -> tiny DOM helper the shell exposes; use it instead of innerHTML
```

Rules:
- A renderer is a **pure function of `data`**. It must never hold game state, never call setTimeout
  to advance the game, and never decide an outcome. If a renderer needs to know something,
  the server must send it.
- Renderers must be safe to call repeatedly; the shell re-renders on every server push.
- Never use `innerHTML` with server- or player-supplied text (player names and answers are
  attacker-controlled). Use `api.el` / `textContent`.
