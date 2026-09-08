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

import { el, clear, captureFocus } from './el.js';
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

// -- host tools: Display-only score correction + bug report (PROTOCOL.md
// v1.1). None of this is game state -- it's UI-only scratch, same spirit as
// `selectedGameId` above -- so it's fine as plain module-level variables.
let hostPanelOpen = false;
let bugNote = '';
let bugReportText = null; // set only if clipboard copy fails, so the host can select-all by hand

// render() clears and rebuilds the entire tree, which destroys whatever the
// host is typing into the bug-note box (and the caret with it) -- and the
// relay pushes `room`/`display` frames constantly, most of which change
// nothing on screen. Same fix as controller.js: fingerprint exactly what
// render() reads and skip the rebuild when none of it moved. `bugNote` is
// deliberately NOT in the key -- it's read only when the textarea is built,
// so keystrokes must not trigger a re-render at all.
let lastRenderKey = null;

function renderKey() {
  return JSON.stringify([
    relayError ? String(relayError.message || relayError) : null,
    endedReason, room.code, connStatus, room.state, room.currentGame,
    room.players, selectedGameId, lastDisplayFrame,
    hostPanelOpen, bugReportText,
  ]);
}

boot();

async function boot() {
  render({ force: true });
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

function render({ force = false } = {}) {
  const key = renderKey();
  if (!force && key === lastRenderKey) return;
  lastRenderKey = key;

  // Carry the focused field (currently the host tools' bug note) and its
  // caret across the rebuilds that genuinely are needed.
  const restore = captureFocus(app);
  clear(app);
  if (relayError) { app.appendChild(relayUnreachableScreen()); restore(); return; }
  if (endedReason) { app.appendChild(endedScreen()); restore(); return; }
  if (!room.code) { app.appendChild(loadingScreen('Creating your room…')); restore(); return; }
  if (connStatus === 'lost') { app.appendChild(lostScreen()); restore(); return; }

  app.appendChild(shellChrome(
    room.state === 'in-game' ? inGamePanel() : lobbyPanel()
  ));
  restore();
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
      el('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
        connBannerMount(),
        hostToolsButton()
      )
    ),
    el('main', { class: 'jf-display-main' }, mainContent),
    hostPanelOverlay()
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
    renderGameFrame(mount, lastDisplayFrame, 'display', api, room.currentGame);
  } else {
    mount.appendChild(loadingScreen('Starting the game…'));
  }
  return mount;
}

// ---------------------------------------------------------------------
// Host tools (PROTOCOL.md v1.1): Display-only score correction + bug
// report. Deliberately independent of which game (if any) is running —
// this lives in the shared shell, not a per-game renderer, so every
// current and future game gets it for free per PROTOCOL.md §5's optional
// onHostAction() hook.
// ---------------------------------------------------------------------

/** Best-effort read of "this game's own score" out of the last frame the
 *  Display actually received. There's no protocol-wide guarantee every
 *  view's `data` carries a per-player score (Kwiplash's writing/voting
 *  screens don't), so this returns null rather than showing stale or
 *  invented numbers — the panel falls back to an explanatory line instead. */
function extractGameScores(gameId, frame) {
  if (!frame || !frame.data) return null;
  if (gameId === 'fish-and-slips' && Array.isArray(frame.data.standings)) {
    return { label: 'Stash', rows: frame.data.standings.map((p) => ({ id: p.id, name: p.name, value: p.stash })) };
  }
  if (gameId === 'kwiplash') {
    const rows = frame.data.rows || frame.data.overall;
    if (Array.isArray(rows)) {
      return { label: 'Points', rows: rows.map((p) => ({ id: p.id, name: p.name, value: p.score })) };
    }
  }
  return null;
}

function hostToolsButton() {
  return el('button', {
    class: 'jf-btn jf-btn-ghost',
    style: { padding: '6px 10px', fontSize: '11.5px' },
    onClick: () => { hostPanelOpen = !hostPanelOpen; bugReportText = null; render(); },
  }, hostPanelOpen ? 'Close host tools' : 'Host tools');
}

function hostPanelOverlay() {
  if (!hostPanelOpen) return null;
  const gameScores = room.state === 'in-game' ? extractGameScores(room.currentGame, lastDisplayFrame) : null;
  return el('div', {
    class: 'jf-host-overlay',
    style: {
      position: 'fixed', inset: '0', background: 'rgba(18,20,10,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: '60', padding: '20px',
    },
    onClick: (e) => { if (e.target === e.currentTarget) { hostPanelOpen = false; render(); } },
  },
    el('div', {
      style: {
        width: '100%', maxWidth: '480px', maxHeight: '86vh', overflow: 'auto',
        background: 'var(--gradient-dark)', color: 'var(--text-on-dark)',
        border: '1px solid var(--border-inset)', borderRadius: 'var(--radius-card)', padding: '28px',
      },
    },
      el('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' } },
        el('h2', { style: { fontFamily: 'var(--font-display)', fontWeight: '400', fontSize: '22px', textTransform: 'uppercase' } }, 'Host tools'),
        el('button', { class: 'jf-btn jf-btn-ghost', onClick: () => { hostPanelOpen = false; render(); } }, 'Close')
      ),
      el('p', { style: { fontSize: '12.5px', color: 'var(--text-on-dark-muted)', marginTop: '-10px', marginBottom: '20px' } },
        'Only visible on this screen — players never see this panel.'),

      el('div', { class: 'jf-section-title' }, 'Bragging Rights'),
      brEditorRows(),

      el('div', { style: { marginTop: '22px' } },
        el('div', { class: 'jf-section-title' }, gameScores ? `This game (${gameScores.label})` : "This game's score"),
        gameScores
          ? gameScoreEditorRows(gameScores)
          : el('p', { style: { fontSize: '12.5px', color: 'var(--text-on-dark-muted)' } },
              room.state === 'in-game'
                ? 'Not visible on the current screen — check back during a results/standings screen.'
                : 'Start a game to correct its own score.')
      ),

      el('div', { style: { marginTop: '24px' } },
        el('div', { class: 'jf-section-title' }, 'Report a bug'),
        el('textarea', {
          class: 'jf-field', rows: 3, placeholder: 'What went wrong? (optional)',
          value: bugNote, onInput: (e) => { bugNote = e.target.value; },
          dataset: { jfFocus: 'host-bug-note' },
          style: { width: '100%', resize: 'vertical', boxSizing: 'border-box' },
        }),
        el('button', { class: 'jf-btn jf-btn-primary', style: { marginTop: '10px' }, onClick: copyBugReport },
          'Copy bug report'),
        bugReportText
          ? el('div', { style: { marginTop: '10px' } },
              el('p', { style: { fontSize: '12px', color: 'var(--text-on-dark-muted)', marginBottom: '6px' } },
                "Clipboard copy didn't work here — select all the text below and copy it by hand."),
              el('textarea', {
                class: 'jf-field', rows: 6, readOnly: true, value: bugReportText,
                style: { width: '100%', fontSize: '11px', fontFamily: 'monospace', boxSizing: 'border-box' },
                onClick: (e) => e.target.select(),
              })
            )
          : null
      )
    )
  );
}

function brEditorRows() {
  if (!room.players.length) {
    return el('p', { style: { fontSize: '12.5px', color: 'var(--text-on-dark-muted)' } }, 'No players in the room yet.');
  }
  return el('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
    room.players.map((p) => scoreEditRow(p.name, p.brTotal || 0, (value) => {
      socket && socket.hostAction('editBrTotal', { playerId: p.id, value });
    }, `br-${p.id}`))
  );
}

function gameScoreEditorRows(gameScores) {
  return el('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
    gameScores.rows.map((p) => scoreEditRow(p.name, p.value ?? 0, (value) => {
      socket && socket.hostAction('setGameScore', { playerId: p.id, value });
    }, `game-${p.id}`))
  );
}

/** One "name [number field] [Save]" row. Keeps its own draft in a plain DOM
 *  input (uncontrolled) rather than module state — this panel re-renders
 *  on every server push, and a controlled input here would fight the host
 *  mid-keystroke every time a `room`/`display` frame arrives. */
function scoreEditRow(name, currentValue, onSave, focusKey) {
  const input = el('input', {
    class: 'jf-field', type: 'number', step: '1', value: String(currentValue),
    style: { width: '90px', padding: '8px 10px', fontSize: '14px' },
    // Keyed per player so a rebuild mid-correction keeps the host's cursor
    // and half-typed number in the right row (captureFocus in el.js).
    dataset: { jfFocus: `score-${focusKey}` },
  });
  return el('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
    el('span', { style: { flex: '1', fontSize: '13.5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, name),
    input,
    el('button', {
      class: 'jf-btn jf-btn-ghost', style: { padding: '8px 12px', fontSize: '12px' },
      onClick: () => {
        const v = Math.round(Number(input.value));
        if (!Number.isFinite(v)) return;
        onSave(v);
        showToast({ level: 'info', text: `${name} set to ${v}.` });
      },
    }, 'Save')
  );
}

async function copyBugReport() {
  const payload = {
    createdAt: new Date().toISOString(),
    roomCode: room.code,
    currentGame: room.currentGame,
    roomState: room.state,
    note: bugNote,
    players: room.players,
    lastDisplayFrame,
  };
  const text = JSON.stringify(payload, null, 2);
  try {
    if (!navigator.clipboard) throw new Error('no clipboard API');
    await navigator.clipboard.writeText(text);
    bugReportText = null;
    showToast({ level: 'info', text: 'Copied — paste it into a chat with Claude next time.' });
  } catch {
    // Clipboard blocked (no permission, insecure context, older browser) —
    // fall back to a selectable textarea instead of silently failing.
    bugReportText = text;
    showToast({ level: 'warn', text: "Couldn't copy automatically — select the text below by hand." });
  }
  render();
}
