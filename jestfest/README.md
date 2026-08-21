# Jest Fest — client

The static half of Jest Fest. Lives at `arrosho.com/jestfest`, deployed the
same way as every other Arrosho app: these files sit in the repo, GitHub Pages
serves them, there is no build step and no framework.

The other half is `../jestfest-relay` (a Cloudflare Worker). Gameplay does not
work without it — see `../jestfest-relay/PROTOCOL.md`.

## THE ONE THING TO CHANGE AFTER DEPLOYING THE RELAY

`js/config.js` → `RELAY_URL_PROD`. Set it to the deployed Worker's `wss://`
origin. Nothing else in the client needs touching; every module imports
`RELAY_URL` from that file.

While the page is served from `localhost`, the client automatically talks to
`ws://localhost:8787` instead, so the whole thing can be exercised locally
before anything is deployed.

## Layout

```
index.html        landing: hero, Host Game, Enter Code, offline section
display.html      the shared screen (the "Display" role)
controller.html   a player's phone (the "Controller" role)
manifest.webmanifest, sw.js, icons/    PWA shell
css/     tokens.css (ported Arrosho design system), base.css, landing.css,
         display.css, controller.css
js/      config.js  RELAY_URL — the one line to edit after deploying
         net.js     WebSocket client: reconnect w/ backoff, token, 25s ping
         el.js      DOM helper; used instead of innerHTML everywhere
         shell.js   view router; lazily imports games/<id>.js
         display.js Display bootstrap: room creation, code, QR, lobby, library
         controller.js  Controller bootstrap: join form, per-player views
         qr.js      dependency-free QR generator for the join link
games/   kwiplash.js, fish-and-slips.js  — pure renderers, no game logic
```

## Two rules worth keeping

**Renderers never decide anything.** `games/*.js` are pure functions of the
data the relay sends. All rules, timing, scoring and reveals happen on the
server (`Jest fest-spec.md` §3.2). A renderer that starts holding state is a
bug.

**Never `innerHTML` player-supplied text.** Names and answers are typed by
whoever is in the room. Use `el()` / `textContent`.

## Run it locally

```sh
# terminal 1 — the relay
cd ../jestfest-relay && npm install && npm run dev

# terminal 2 — the client, served from the REPO ROOT so /mahjong and
# /stopwatch resolve the way they will in production
cd .. && python3 -m http.server 8081
# then open http://localhost:8081/jestfest/
```

## The offline section

`index.html` links out to `/mahjong` and `/stopwatch`. Those are separate,
already-deployed, fully-offline apps. Jest Fest links to them and does not
rebuild, embed, or absorb them (`Jest fest-spec.md` §3.6, §7). The e2e test
asserts there are no iframes, specifically to keep that from drifting.
