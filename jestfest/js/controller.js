// Jest Fest — Controller bootstrap (controller.html).
//
// The Controller is one player's phone: join a room by code + name, wait
// for the host to start something, then render that game's controller view
// (delegated to the shell/game-module router). Reconnect-with-backoff is
// spec §3.4's core requirement, not a stretch goal — see net.js's
// RoomSocket, which does the actual retrying; this file just reflects its
// 'status' events as a calm "Reconnecting…" banner instead of anything
// alarming.

import { el, clear, icon } from './el.js';
import {
  RoomSocket, sanitizeRoomCode, isCompleteRoomCode, CODE_LENGTH,
  loadReconnect, clearReconnect, buildRoomCodeInput,
} from './net.js';
import { renderGameFrame, makeApi, showToast, renderConnBanner } from './shell.js';

const app = document.getElementById('app');
const params = new URLSearchParams(location.search);

/** @type {import('./net.js').RoomSocket|null} */
let socket = null;
let code = sanitizeRoomCode(params.get('code') || '');
let name = (params.get('name') || '').slice(0, 40);
let joinError = '';
let connStatus = 'connecting';
let room = { code: '', state: 'lobby', currentGame: null, players: [] };
let me = null; // {id, name, brTotal} — filled in from `hello` + kept in sync via `room`
let endedReason = null;
let lastControllerFrame = null;

// A stored reconnectToken for this exact code means a page reload mid-game
// can rejoin without asking again — sessionStorage is what makes that
// possible across a reload, not just a live socket drop.
const stored = code ? loadReconnect(code) : { reconnectToken: '', name: '' };

render();
if (code && stored.reconnectToken && stored.name) {
  // Reload mid-game: resume the existing seat without asking anything.
  name = stored.name;
  connect();
} else if (isCompleteRoomCode(code) && name.trim()) {
  // Arrived from the landing page (or a shared link) already carrying both a
  // room code and a name -- there is nothing left to ask, so connect straight
  // away instead of re-rendering the same two fields and making the player
  // tap Join a second time.
  name = name.trim();
  // Drop the name back out of the address bar so a copied/shared link is just
  // the room code, and nobody inherits someone else's name.
  try {
    const clean = new URL(location.href);
    clean.searchParams.delete('name');
    history.replaceState(null, '', clean.toString());
  } catch { /* non-fatal: the join already worked */ }
  connect();
}

// ---------------------------------------------------------------------
// Connect
// ---------------------------------------------------------------------

function connect() {
  joinError = '';
  connStatus = 'connecting';
  me = null;
  endedReason = null;
  render();

  socket = new RoomSocket({ role: 'controller', code, name });
  socket.addEventListener('status', (e) => { connStatus = e.detail; render(); });
  socket.addEventListener('hello', (e) => {
    me = { id: e.detail.playerId, name: e.detail.name, brTotal: 0 };
    render();
  });
  socket.addEventListener('room', (e) => {
    room = { ...room, ...e.detail };
    const mine = room.players.find((p) => p.id === (me && me.id));
    if (mine) me = { ...me, name: mine.name, brTotal: mine.brTotal };
    render();
  });
  socket.addEventListener('controller', (e) => { lastControllerFrame = e.detail; render(); });
  socket.addEventListener('toast', (e) => showToast(e.detail));
  socket.addEventListener('error', (e) => {
    const detail = e.detail || {};
    if (detail.code === 'room_not_found' || detail.code === 'room_full' || detail.code === 'not_allowed') {
      joinError = describeJoinError(detail.code);
      clearReconnect(code);
      render();
    } else if (detail.code) {
      showToast({ level: 'error', text: detail.message || detail.code });
    }
  });
  socket.addEventListener('ended', (e) => {
    endedReason = (e.detail && e.detail.reason) || 'explicit';
    clearReconnect(code);
    render();
  });
}

function describeJoinError(errCode) {
  switch (errCode) {
    case 'room_not_found': return "That room code doesn't exist. Check with your host.";
    case 'room_full': return 'This room is full.';
    default: return "Couldn't join that room.";
  }
}

// ---------------------------------------------------------------------
// Top-level render dispatch
// ---------------------------------------------------------------------

function render() {
  clear(app);
  document.body.classList.add('jf-controller');

  if (!socket) { app.appendChild(joinScreen()); return; }
  if (endedReason) { app.appendChild(shell(endedBody())); return; }
  if (connStatus === 'lost') { app.appendChild(shell(lostBody())); return; }
  if (!me) { app.appendChild(shell(centerState('spinner', 'Joining…', ''))); return; }
  if (room.state === 'in-game' && lastControllerFrame) { app.appendChild(shell(inGameBody())); return; }
  app.appendChild(shell(waitingBody()));
}

function shell(bodyNode) {
  return el('div', { class: 'jf-controller-shell' },
    el('header', { class: 'jf-controller-header' },
      el('span', { class: 'jf-wordmark' }, 'Jest Fest'),
      el('span', { class: 'jf-room-tag' }, code ? `Room ${code}` : '')
    ),
    el('div', { class: 'jf-controller-body' }, bodyNode),
    el('div', { class: 'jf-controller-footer' }, connBanner())
  );
}

function connBanner() {
  const mount = el('div', { class: 'jf-conn-banner-mount' });
  renderConnBanner(mount, connStatus === 'open' ? null : connStatus);
  return mount;
}

// ---------------------------------------------------------------------
// Join form
// ---------------------------------------------------------------------

function joinScreen() {
  let localName = name;
  let localCode = code;

  const nameInput = el('input', {
    class: 'jf-field', placeholder: 'Your name', maxlength: '40', value: localName,
    autocomplete: 'off', autocapitalize: 'words',
    onInput: (e) => { localName = e.target.value; updateJoinButton(); },
    onKeydown: (e) => { if (e.key === 'Enter') tryJoin(); },
  });

  const codeInputs = buildRoomCodeInput(localCode, (newCode) => {
    localCode = newCode;
    updateJoinButton();
    if (newCode.length === CODE_LENGTH) nameInput.focus();
  });

  const errorEl = el('p', { class: 'jf-join-error' }, joinError);

  const joinBtn = el('button', { class: 'jf-btn jf-btn-primary jf-btn-block', disabled: true, onClick: tryJoin },
    'Join');

  function updateJoinButton() {
    joinBtn.disabled = !(isCompleteRoomCode(localCode) && localName.trim().length > 0);
  }
  function tryJoin() {
    if (joinBtn.disabled) return;
    code = localCode;
    name = localName.trim().slice(0, 40);
    connect();
  }
  updateJoinButton();

  return el('div', { class: 'jf-controller-shell' },
    el('header', { class: 'jf-controller-header' },
      el('span', { class: 'jf-wordmark' }, 'Jest Fest'), el('span')),
    el('div', { class: 'jf-controller-body' },
      el('div', { class: 'jf-join-form' },
        el('h1', { class: 'jf-headline' }, 'Enter code'),
        el('div', {},
          el('label', { class: 'jf-label' }, 'Room code'),
          codeInputs
        ),
        el('div', {},
          el('label', { class: 'jf-label' }, 'Your name'),
          nameInput
        ),
        errorEl,
        joinBtn
      )
    )
  );
}

// ---------------------------------------------------------------------
// Waiting / ended / lost / in-game bodies
// ---------------------------------------------------------------------

function centerState(kind, heading, sub) {
  return el('div', { class: 'jf-center-state' },
    kind === 'spinner' ? el('div', { class: 'jf-spinner' }) : checkBadge(),
    el('h2', {}, heading),
    sub ? el('p', {}, sub) : null
  );
}

function checkBadge() {
  return el('div', { class: 'jf-check-badge' }, icon('check', { size: 26, color: 'var(--arr-black)' }));
}

function waitingBody() {
  const gameTitle = room.currentGame;
  return centerState(
    'check',
    me ? `You're in, ${me.name}` : "You're in",
    gameTitle ? `Waiting for the host to start ${gameTitle}…` : 'Waiting for the host to start a game…'
  );
}

function endedBody() {
  const messages = {
    display_left: 'The host screen disconnected, so the room ended.',
    timeout: 'This room timed out from inactivity.',
    explicit: 'The host closed the room.',
  };
  return el('div', { class: 'jf-center-state' },
    el('h2', {}, 'Room closed'),
    el('p', {}, messages[endedReason] || messages.explicit),
    el('a', { href: './index.html', class: 'jf-btn jf-btn-primary' }, 'Back to Jest Fest')
  );
}

function lostBody() {
  return el('div', { class: 'jf-center-state' },
    el('h2', {}, "Couldn't reconnect"),
    el('p', {}, "We kept trying but couldn't get your seat back in time. The room may still be going — you can rejoin with the same code."),
    el('button', { class: 'jf-btn jf-btn-primary', onClick: () => { socket = null; render(); } }, 'Rejoin')
  );
}

function inGameBody() {
  const mount = el('div', {});
  const api = makeApi(socket, () => room, () => me);
  renderGameFrame(mount, lastControllerFrame, 'controller', api, room.currentGame);
  return mount;
}
