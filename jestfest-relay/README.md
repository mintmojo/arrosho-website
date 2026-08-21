# Jest Fest relay

A Cloudflare Worker + one SQLite-backed Durable Object per room. Implements
the wire protocol and game module contract in `PROTOCOL.md` exactly (see
that file for the frozen spec three other builds depend on). Game rules
live in `src/games/*.js`; this repo is only the room shell / relay.

## Layout

```
wrangler.jsonc      Worker + DO binding + SQLite migration
package.json         wrangler devDependency only
src/index.js         Worker entry: POST /room, GET /room/:code/exists, WS upgrade routing
src/room.js           the Durable Object (room state machine, hibernation, timers)
src/codes.js          4-char room code generation
src/registry.js       code -> DO id mapping + collision checks
src/games/index.js    game module registry
src/games/_smoke.js   trivial 2-player test game (see below)
test/                 node:test unit tests + a live integration script
```

## Run it locally

```sh
npm install
npm run dev          # wrangler dev --local, serves http://localhost:8787
```

`wrangler dev --local` runs the Worker + Durable Object entirely on your
machine (Miniflare), no Cloudflare account needed, storage in `.wrangler/`
(gitignored).

Quick manual smoke check:

```sh
curl -X POST http://localhost:8787/room
# => {"code":"K4M9"}
curl http://localhost:8787/room/K4M9/exists
# => {"exists":true,"state":"lobby"}
```

Then connect a WebSocket client to `ws://localhost:8787/room/K4M9/ws?role=display`
and another to `.../ws?role=controller&name=Alex`.

### Unit tests

```sh
npm test              # node --test test/*.test.js
```

Covers `src/codes.js` (alphabet, shape validation, determinism given an
injected `randomFn`) and the display-name de-duplication rule in
`src/room.js` (`Room.prototype.dedupeName`).

### Live integration script

`test/integration.mjs` is **not** a `node:test` file -- it's a standalone
script that connects real WebSocket clients to a running `wrangler dev`
instance and exercises the full room lifecycle end to end (create room,
display connect, three controllers, duplicate-name suffixing, the `_smoke`
game start/action/score/end, reconnect-within-grace, drop-past-grace seat
loss, display-drop room-end, `endroom` storage wipe, plus a few protocol
edge cases: `too_few_players`, `not_allowed`, unknown frame types, ping/pong).

Run it against a local dev server with a short reconnect grace so the test
doesn't have to sit through the real 180s window:

```sh
npm run dev -- --var RECONNECT_GRACE_MS:3000 --var ROOM_TTL_MS:60000 &
node test/integration.mjs http://localhost:8787
```

`RECONNECT_GRACE_MS` / `ROOM_TTL_MS` are read from Worker vars (see
`wrangler.jsonc`) with the PROTOCOL.md-mandated defaults (180s / 6h) baked
in; overriding them via `--var` only affects that dev run, never
production, since production reads `wrangler.jsonc`'s `vars` block as-is.

## Deploy to your own Cloudflare account

```sh
npx wrangler login          # opens a browser, authorizes wrangler against your account
npm install                 # if you haven't already
npx wrangler deploy
```

That's it -- `wrangler.jsonc` already declares the Durable Object binding
and the SQLite migration (`new_sqlite_classes: ["Room"]`, required for the
Workers **free** plan; the older KV-backed DO storage class needs Workers
Paid). First deploy creates the `jestfest-relay` Worker under your account's
`*.workers.dev` subdomain; note that URL down, the client shell needs it
baked in / configured as the relay origin.

To redeploy after changes: `npx wrangler deploy` again. `wrangler.jsonc`'s
`migrations` array only ever needs a new entry if `Room`'s storage shape
changes in a way that needs a real migration tag bump -- adding fields to
the JSON blobs stored under `meta`/`players`/`gameState` does not require
one.

## The `_smoke` game

`src/games/_smoke.js` is a throwaway 2-player game (not a real Jest Fest
game) used to prove the room/game lifecycle end to end without waiting on
Kwiplash or Fish and Slips: both players send `{t:"action",action:"tap"}`,
first tapper gets 2 BR, second gets 1, then `ctx.end()` returns the room to
lobby. It exists purely for `test/integration.mjs`; there's no reason a
real client would ever offer it in a game menu.

## kwiplash.js / fish-and-slips.js

`src/games/index.js` imports both by path, per PROTOCOL.md §5's module
contract. **The two files currently in this repo are placeholder stubs**
(clearly marked at the top of each file) -- they exist only so the Worker
bundle resolves while the real implementations are being built elsewhere.
Cloudflare's bundler (esbuild, via wrangler) resolves `import`/`import()`
of local files at build time regardless of static-vs-dynamic syntax, so a
genuinely missing file is a hard bundle failure, not a runtime-only
concern -- that's why placeholders exist rather than leaving the imports
dangling. Whoever lands the real game should simply overwrite the
matching filename with the same default-export-class shape; nothing else
in the relay needs to change.

An unknown `gameId` (or a module that throws during construction/`start()`)
never crashes the room -- the display gets `error/not_allowed` and the room
stays in `lobby`.
