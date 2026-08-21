// Jest Fest — Display bootstrap (display.html).
//
// The Display is the shared screen: it creates the room, shows the code +
// QR + roster + BR scoreboard while the room is in the lobby, and hands
// in-game frames to the shell's game-module router. It never plays —
// there are no answer inputs anywhere in this file (spec §2, PROTOCOL.md §0).
//
// Per Jest fest-spec.md §4, the game menu is part of the *lobby* state, not
// a separate screen before a room code exists (that's how the Claude Design
// prototype had it, back when the code was fake demo data — see
// /tmp/build-notes/client.md for the full note on this). So "Host: game
// library" and "Host: lobby (TV)" from the design file are combined into
// one lobby panel here: code/QR/roster always visible, game picker below it.

import { el, clear } from './el.js';
import { createRoom, RoomSocket, joinUrl } from './net.js';
import { renderQR } from './qr.js';
import { renderGameFrame, makeApi, showToast, renderConnBanner } from './shell.js';

// Exactly two games ship in the library (build brief: "must list exactly
// two games"). Fish and Slips and Kwiplash are milestones M3/M4 in the spec
// and their jestfest/games/*.js renderers aren't built yet — picking one
// here will show shell.js's "isn't wired up yet" fallback instead of a game,
// which is the honest state of this build, not a bug.
const GAME_LIBRARY = [
  {
    id: 'kwiplash',
    title: 'Kwiplash',
    blurb: 'One prompt, two answers, everyone else votes on the funnier one.',
    minPlayers: 3,
  },
  {
    id: 'fish-and-slips',
    title: 'Fish and Slips',
    blurb: 'Secret bids on a shared pot — one Slip can steal it outright.',
    minPlayers: 2,
  },
];

const AVATAR_COLORS = ['var(--jf-avatar-1)', 'var(--jf-avatar-2)', 'var(--jf-avatar-3)', 'var(--jf-avatar-4)'];

const app = document.getElementById('app');

/** @type {import('./net.js').RoomSocket|null} */
let socket = null;
let room = { code: '', state: 'lobby', currentGame: null, players: [] };
let connStatus = 'connecting';
let endedReason = null;
let relayError = null;
let selectedGameId = null;
let lastDisplayFrame = null;

boot();

async function boot() {
  render();
  let code;
  try {
    code = await createRoom();
  } catch (err) {
    relayError = err;
    render();
    return;
  }
  room = { ...room, code };
  socket = new RoomSocket({ role: 'display', code });
  socket.addEventListener('status', (e) => { connStatus = e.detail; render(); });
  socket.addEventListener('room', (e) => { room = { ...room, ...e.detail }; render(); });
  socket.addEventListener('display', (e) => { lastDisplayFrame = e.detail; render(); });
  socket.addEventListener('toast', (e) => showToast(e.detail));
  socket.addEventListener('error', (e) => {
    if (e.detail && e.detail.code) showToast({ level: 'error', text: describeError(e.detail.code) });
  });
  socket.addEventListener('ended', (e) => { endedReason = (e.detail && e.detail.reason) || 'explicit'; render(); });
  render();
  // Deliberately not preloading jestfest/games/<id>.js here: those modules
  // don't exist yet in this build (Kwiplash/Fish and Slips are milestones
  // M3/M4), and importing them speculatively would just 404 in the console
  // on every lobby load. shell.js still lazily imports on demand, the one
  // time it's actually needed — see renderGameFrame() in inGamePanel().
}

function describeError(code) {
  switch (code) {
    case 'too_few_players': return 'Not enough players yet for that game.';
    case 'display_taken': return 'Another screen is already hosting this room.';
    case 'room_not_found': return 'This room no longer exists.';
    default: return code;
  }
}

// ---------------------------------------------------------------------
// Top-level render dispatch
// ---------------------------------------------------------------------

function render() {
  clear(app);
  if (relayError) { app.appendChild(relayUnreachableScreen()); return; }
  if (endedReason) { app.appendChild(endedScreen()); return; }
  if (!room.code) { app.appendChild(loadingScreen('Creating your room…')); return; }
  if (connStatus === 'lost') { app.appendChild(lostScreen()); return; }

  app.appendChild(shellChrome(
    room.state === 'in-game' ? inGamePanel() : lobbyPanel()
  ));
}

// ---------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------

function loadingScreen(text) {
  return el('div', { class: 'jf-state-screen' },
    el('div', { class: 'jf-spinner' }),
    el('p', {}, text)
  );
}

function relayUnreachableScreen() {
  return el('div', { class: 'jf-state-screen' },
    el('h2', { style: { fontFamily: 'var(--font-display)', fontWeight: '400', fontSize: '28px', textTransform: 'uppercase' } },
      "Can't reach the relay"),
    el('p', { style: { maxWidth: '440px', color: 'var(--text-muted)' } },
      'Jest Fest needs its relay server running to host a game. Make sure it\'s up, then try again.'),
    el('details', { style: { fontSize: '13px', color: 'var(--text-muted)' } },
      el('summary', {}, 'Technical details'),
      el('p', {}, String(relayError && relayError.message || relayError || ''))
    ),
    el('button', { class: 'jf-btn jf-btn-primary', onClick: () => { relayError = null; boot(); } }, 'Try again'),
    el('a', { href: './index.html', class: 'jf-btn jf-btn-ghost' }, 'Back to Jest Fest')
  );
}

function lostScreen() {
  return el('div', { class: 'jf-state-screen' },
    el('h2', { style: { fontFamily: 'var(--font-display)', fontWeight: '400', fontSize: '28px', textTransform: 'uppercase' } },
      'Connection lost'),
    el('p', { style: { maxWidth: '420px', color: 'var(--text-muted)' } },
      'This screen dropped its connection to the relay, so the room has ended (a Display can\'t reconnect into a room that\'s already gone — see the README).'),
    el('a', { href: './index.html', class: 'jf-btn jf-btn-primary' }, 'Host a new game')
  );
}

function endedScreen() {
  const messages = {
    display_left: 'The host screen disconnected.',
    timeout: 'This room timed out from inactivity.',
    explicit: 'The room was closed.',
  };
  return el('div', { class: 'jf-state-screen' },
    el('h2', { style: { fontFamily: 'var(--font-display)', fontWeight: '400', fontSize: '28px', textTransform: 'uppercase' } },
      'Room closed'),
    el('p', { style: { maxWidth: '420px', color: 'var(--text-muted)' } }, messages[endedReason] || messages.explicit),
    el('a', { href: './index.html', class: 'jf-btn jf-btn-primary' }, 'Host a new game')
  );
}

function shellChrome(mainContent) {
  return el('div', { class: 'jf-display-shell' },
    el('header', { class: 'jf-display-header' },
      el('span', { class: 'jf-wordmark' }, 'Jest Fest'),
      connBannerMount()
    ),
    el('main', { class: 'jf-display-main' }, mainContent)
  );
}

function connBannerMount() {
  const mount = el('div', { class: 'jf-conn-banner-mount' });
  renderConnBanner(mount, connStatus === 'open' ? null : connStatus);
  return mount;
}

// ---------------------------------------------------------------------
// Lobby (code + QR + roster + BR scoreboard + game library)
// ---------------------------------------------------------------------

function lobbyPanel() {
  const url = joinUrl(room.code);
  return el('div', { class: 'jf-lobby-panel' },
    el('div', { class: 'jf-eyebrow', style: { marginBottom: '18px' } }, 'Jest Fest · lobby'),
    el('div', { class: 'jf-lobby-columns' },
      el('div', {},
        codePanel(url),
        el('div', { style: { marginTop: '28px' } },
          el('div', { class: 'jf-section-title' }, `Players in the room · ${room.players.length}`),
          rosterList()
        )
      ),
      el('div', {},
        scoreboard()
      )
    ),
    el('div', { style: { marginTop: '40px' } },
      el('div', { class: 'jf-section-title' }, 'Pick what\'s running tonight'),
      gameLibrary()
    )
  );
}

function codePanel(url) {
  return el('div', { class: 'jf-code-panel' },
    el('div', { class: 'jf-code-hint' }, 'Players join at arrosho.com/jestfest with this code'),
    el('div', { class: 'jf-code-value' }, room.code),
    el('div', { class: 'jf-qr-wrap' }, renderQR(url))
  );
}

function rosterList() {
  if (!room.players.length) {
    return el('p', { class: 'jf-muted', style: { fontSize: '14px' } }, 'Waiting for players to scan the code…');
  }
  return el('div', { class: 'jf-roster' },
    room.players.map((p, i) => el('div', { class: 'jf-roster-item', dataset: { connected: String(p.connected) } },
      el('div', { class: 'jf-avatar', style: { background: AVATAR_COLORS[i % AVATAR_COLORS.length] } },
        (p.name || '?').slice(0, 1).toUpperCase()),
      el('span', { class: 'jf-roster-name' }, p.name),
      el('span', { class: 'jf-roster-dot' })
    ))
  );
}

function scoreboard() {
  const sorted = [...room.players].sort((a, b) => (b.brTotal || 0) - (a.brTotal || 0));
  return el('div', {},
    el('div', { class: 'jf-section-title' }, 'Bragging Rights'),
    sorted.length
      ? el('div', { class: 'jf-scoreboard' },
          sorted.map((p, i) => el('div', { class: 'jf-scoreboard-row', dataset: { rank: String(i + 1) } },
            el('span', { class: 'jf-scoreboard-rank' }, String(i + 1)),
            el('span', { class: 'jf-scoreboard-name' }, p.name),
            el('span', { class: 'jf-scoreboard-score' }, String(p.brTotal || 0))
          ))
        )
      : el('p', { class: 'jf-muted', style: { fontSize: '14px' } }, 'Scores appear here once a game finishes.')
  );
}

function gameLibrary() {
  return el('div', {},
    el('div', { class: 'jf-library-grid' },
      GAME_LIBRARY.map((g) => gameCard(g))
    ),
    selectedGameId ? startRow() : null
  );
}

function gameCard(g) {
  const selected = g.id === selectedGameId;
  const enough = room.players.length >= g.minPlayers;
  return el('button', {
    class: 'jf-game-card',
    'aria-pressed': String(selected),
    onClick: () => { selectedGameId = g.id; render(); },
  },
    el('h3', {}, g.title),
    el('p', {}, g.blurb),
    el('span', { class: 'jf-game-min' },
      enough ? `Needs ${g.minPlayers}+ players` : `Needs ${g.minPlayers}+ players — ${room.players.length} here so far`)
  );
}

function startRow() {
  const game = GAME_LIBRARY.find((g) => g.id === selectedGameId);
  const enough = room.players.length >= (game ? game.minPlayers : 1);
  return el('div', { class: 'jf-start-row' },
    el('button', {
      class: 'jf-btn jf-btn-primary jf-btn-block',
      disabled: !enough,
      onClick: () => socket && socket.start(selectedGameId),
    }, enough ? `Start ${game.title}` : `Need ${game.minPlayers}+ players to start ${game.title}`)
  );
}

// ---------------------------------------------------------------------
// In-game (delegates to the game module via shell.js)
// ---------------------------------------------------------------------

function inGamePanel() {
  const mount = el('div', { class: 'jf-ingame-mount' });
  if (lastDisplayFrame) {
    const api = makeApi(socket, () => room);
    renderGameFrame(mount, lastDisplayFrame, 'display', api);
  } else {
    mount.appendChild(loadingScreen('Starting the game…'));
  }
  return mount;
}
