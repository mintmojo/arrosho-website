// Jest Fest — shell: the shared plumbing between display.js and controller.js.
//
// Two jobs, both defined by PROTOCOL.md §7:
//   1. Given a `{t:'display'|'controller', gameId, view, data}` push from the
//      relay, lazily import `jestfest/games/<gameId>.js` and hand the frame's
//      `data` to that module's matching `[side][view]` renderer, then mount
//      whatever HTMLElement it returns.
//   2. Build the `api` object every renderer receives.
//
// Nothing here knows any game's rules — it's just the router. As of this
// build, `jestfest/games/*.js` renderer modules don't exist yet (Kwiplash
// and Fish and Slips are milestones M3/M4 in Jest fest-spec.md §9); the
// "missing renderer" fallback below is what a room sees in the meantime
// instead of a crash.

import { el, clear } from './el.js';

const moduleCache = new Map();

function loadGame(gameId) {
  if (!moduleCache.has(gameId)) {
    moduleCache.set(
      gameId,
      import(`../games/${gameId}.js`)
        .then((m) => m.default)
        .catch((err) => {
          console.warn(`[shell] no client renderer module for game "${gameId}" yet`, err);
          return null;
        })
    );
  }
  return moduleCache.get(gameId);
}

/** Warm the import cache (e.g. as soon as the lobby's game library renders, so
 *  the module is likely already loaded by the time `start` actually fires). */
export function preloadGame(gameId) {
  return loadGame(gameId);
}

/**
 * Renders one display/controller game frame into `mount`.
 * @param {HTMLElement} mount
 * @param {{gameId: string, view: string, data: any}} frame
 * @param {'display'|'controller'} side
 * @param {object} api  see makeApi() below
 */
export async function renderGameFrame(mount, frame, side, api) {
  const { gameId, view, data } = frame || {};
  const game = await loadGame(gameId);
  clear(mount);

  const renderer = game && game[side] && game[side][view];
  if (typeof renderer !== 'function') {
    mount.appendChild(missingRendererNode(game, gameId, side, view));
    return;
  }

  let node;
  try {
    node = renderer(data, api);
  } catch (err) {
    console.error(`[shell] renderer threw for ${gameId}/${side}/${view}`, err);
    node = el('div', { class: 'jf-game-missing' },
      el('p', {}, 'Something went wrong rendering this screen.'));
  }
  if (node instanceof Node) mount.appendChild(node);
}

function missingRendererNode(game, gameId, side, view) {
  const title = game && game.title ? game.title : gameId;
  return el('div', { class: 'jf-game-missing' },
    el('p', {}, `"${title}" isn't wired up in this client yet.`),
    el('p', { class: 'jf-sr-only' }, `missing ${side} renderer for view "${view}"`)
  );
}

/**
 * Builds the `api` object PROTOCOL.md §7 promises every game renderer:
 *   api.send(action, fields) / api.advance() / api.countdown(el, endsAt) /
 *   api.me / api.players / api.code / api.el
 *
 * @param {import('./net.js').RoomSocket} socket
 * @param {() => {code: string, players: any[]}} getRoom  latest room snapshot
 * @param {() => ({id, name, brTotal}|null)} [getMe]  omit on the display side
 */
export function makeApi(socket, getRoom, getMe) {
  return {
    send: (action, fields = {}) => socket.action(action, fields),
    advance: () => socket.advance(),
    countdown: (node, endsAt) => startCountdown(node, endsAt),
    get me() { return getMe ? getMe() : null; },
    get players() { return getRoom().players || []; },
    get code() { return getRoom().code; },
    el,
  };
}

/** Renders a live "seconds remaining" countdown into `node` from a
 *  server-issued endsAt (ms epoch). Returns a stop() function. Purely a
 *  render loop — never decides anything (PROTOCOL.md §6.1: only the server
 *  decides time is up). */
function startCountdown(node, endsAt) {
  let raf = null;
  const tick = () => {
    const msLeft = Math.max(0, endsAt - Date.now());
    node.textContent = String(Math.ceil(msLeft / 1000));
    if (msLeft > 0) raf = requestAnimationFrame(tick);
  };
  tick();
  return () => { if (raf != null) cancelAnimationFrame(raf); };
}

// ---------------------------------------------------------------------
// Small UI bits shared verbatim between display.html and controller.html.
// ---------------------------------------------------------------------

/** Creates (once) and returns the fixed toast stack at the bottom of the page. */
export function toastStack() {
  let stack = document.querySelector('.jf-toast-stack');
  if (!stack) {
    stack = el('div', { class: 'jf-toast-stack', 'aria-live': 'polite' });
    document.body.appendChild(stack);
  }
  return stack;
}

/** Shows one transient toast (PROTOCOL.md §2 `toast` frame: level info|warn|error). */
export function showToast({ level = 'info', text = '' }) {
  const stack = toastStack();
  const node = el('div', { class: 'jf-toast', dataset: { level } }, text);
  stack.appendChild(node);
  const life = level === 'error' ? 5000 : 3200;
  setTimeout(() => node.remove(), life);
}

/** Renders (idempotently, into `mount`) the small "reconnecting…" banner
 *  driven by RoomSocket's 'status' events. Non-alarming per spec §3.4:
 *  no red, no modal, just a quiet pulse. Hidden entirely once open/closed. */
export function renderConnBanner(mount, state) {
  clear(mount);
  if (state === 'open' || state === 'closed' || !state) return;
  const label = state === 'connecting' ? 'Connecting…'
    : state === 'reconnecting' ? 'Reconnecting…'
    : state === 'lost' ? 'Connection lost'
    : state;
  mount.appendChild(
    el('div', { class: 'jf-conn-banner', dataset: { state } },
      el('span', { class: 'jf-conn-dot' }),
      label
    )
  );
}
