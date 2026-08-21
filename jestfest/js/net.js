// Jest Fest — relay transport.
//
// Implements PROTOCOL.md §1-§3 (create room / connect / frames) and
// Jest fest-spec.md §3.4's reconnect requirement: a dropped controller
// retries with exponential backoff (1s, 2s, 4s, 8s, capped 15s) for the
// full 180s server-side grace window (PROTOCOL.md §4, RECONNECT_GRACE_MS),
// persisting `reconnectToken` + name in sessionStorage so a page reload
// mid-game can still resume the same seat.
//
// The relay is the referee (spec §3.2) — nothing in this file decides
// anything about a game. It only carries frames back and forth and manages
// the socket's own lifecycle.

import { RELAY_URL } from './config.js';
import { el } from './el.js';

// ---------------------------------------------------------------------
// Room code helpers (PROTOCOL.md §4: 4 chars, no O/0/I/1)
// ---------------------------------------------------------------------

export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 4;

/** Upper-cases and strips anything not in CODE_ALPHABET, capped at 4 chars. */
export function sanitizeRoomCode(raw) {
  let out = '';
  for (const ch of String(raw || '').toUpperCase()) {
    if (CODE_ALPHABET.includes(ch)) out += ch;
    if (out.length === CODE_LENGTH) break;
  }
  return out;
}

export function isCompleteRoomCode(code) {
  return typeof code === 'string' && code.length === CODE_LENGTH &&
    [...code].every((ch) => CODE_ALPHABET.includes(ch));
}

/**
 * Builds a row of CODE_LENGTH single-character boxes implementing the shared
 * room-code UX (build brief): auto-uppercase, invalid characters stripped,
 * advance on typing and on paste. Shared by index.html's "Enter code" card
 * and controller.js's join form so the behaviour (and the fix, if it ever
 * needs one) lives in exactly one place.
 *
 * @param {string} initial   starting value, already sanitized
 * @param {(code: string) => void} onChange  called with the full current code on every edit
 * @returns {HTMLElement}
 */
export function buildRoomCodeInput(initial, onChange) {
  const boxes = [];
  const wrap = el('div', { class: 'jf-code-input' });
  const currentValue = () => boxes.map((b) => b.value).join('');

  for (let i = 0; i < CODE_LENGTH; i++) {
    const box = el('input', {
      maxlength: '1', inputmode: 'text', autocapitalize: 'characters',
      autocomplete: 'off', value: initial[i] || '',
      onInput: (e) => {
        const clean = sanitizeRoomCode(e.target.value).slice(-1);
        e.target.value = clean;
        if (clean && i < CODE_LENGTH - 1) boxes[i + 1].focus();
        onChange(currentValue());
      },
      onKeydown: (e) => {
        if (e.key === 'Backspace' && !e.target.value && i > 0) {
          boxes[i - 1].focus();
          boxes[i - 1].value = '';
          onChange(currentValue());
        }
      },
      onPaste: (e) => {
        e.preventDefault();
        const clean = sanitizeRoomCode((e.clipboardData || window.clipboardData).getData('text'));
        for (let j = 0; j < CODE_LENGTH; j++) boxes[j].value = clean[j] || '';
        (boxes[Math.min(clean.length, CODE_LENGTH - 1)] || boxes[CODE_LENGTH - 1]).focus();
        onChange(currentValue());
      },
    });
    boxes.push(box);
    wrap.appendChild(box);
  }
  return wrap;
}

/** The join URL for a room, resolved against wherever this app is actually
 *  hosted — resolves to `/jestfest/controller.html?code=XXXX` in production,
 *  but also works unmodified when served from any other root during local
 *  testing (python3 -m http.server, a different GitHub Pages path, etc). */
export function joinUrl(code) {
  const url = new URL('controller.html', location.href);
  url.search = '';
  url.searchParams.set('code', code);
  return url.toString();
}

// ---------------------------------------------------------------------
// HTTP: create / check rooms (PROTOCOL.md §1)
// ---------------------------------------------------------------------

function httpBase() {
  return RELAY_URL.replace(/^ws/, 'http').replace(/\/$/, '');
}

/** POST /room -> the new room's code, or throws. */
export async function createRoom() {
  const res = await fetch(`${httpBase()}/room`, { method: 'POST' });
  if (!res.ok) throw new Error(`create_room_failed_${res.status}`);
  const body = await res.json();
  if (!body || typeof body.code !== 'string') throw new Error('create_room_bad_response');
  return body.code;
}

/** GET /room/:code/exists -> true/false, or null if the relay couldn't be reached. */
export async function roomExists(code) {
  try {
    const res = await fetch(`${httpBase()}/room/${encodeURIComponent(code)}/exists`);
    if (res.status === 404) return false;
    if (!res.ok) return null;
    const body = await res.json();
    return !!body.exists;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------
// sessionStorage: reconnectToken + name, scoped per room code
// ---------------------------------------------------------------------

const rtKey = (code) => `jestfest:${code}:rt`;
const nameKey = (code) => `jestfest:${code}:name`;

export function loadReconnect(code) {
  try {
    return {
      reconnectToken: sessionStorage.getItem(rtKey(code)) || '',
      name: sessionStorage.getItem(nameKey(code)) || '',
    };
  } catch {
    return { reconnectToken: '', name: '' }; // sessionStorage unavailable (private mode etc.)
  }
}

export function saveReconnect(code, { reconnectToken, name } = {}) {
  try {
    if (reconnectToken) sessionStorage.setItem(rtKey(code), reconnectToken);
    if (name) sessionStorage.setItem(nameKey(code), name);
  } catch { /* ignore — reconnect just won't survive a reload */ }
}

export function clearReconnect(code) {
  try {
    sessionStorage.removeItem(rtKey(code));
    sessionStorage.removeItem(nameKey(code));
  } catch { /* ignore */ }
}

// ---------------------------------------------------------------------
// RoomSocket
// ---------------------------------------------------------------------

const BACKOFF_STEPS_MS = [1000, 2000, 4000, 8000];
const BACKOFF_CAP_MS = 15000;
const RECONNECT_GRACE_MS = 180000; // spec §4 / PROTOCOL.md §4
const PING_MS = 25000; // PROTOCOL.md §3

const FATAL_ERROR_CODES = new Set([
  'room_not_found', 'bad_role', 'room_full', 'display_taken', 'not_allowed',
]);

function backoffDelay(attempt) {
  return attempt < BACKOFF_STEPS_MS.length ? BACKOFF_STEPS_MS[attempt] : BACKOFF_CAP_MS;
}

/**
 * Wraps one WebSocket connection to a room, plus (for controllers) the
 * reconnect-with-backoff behaviour above.
 *
 * Events dispatched on this (it's an EventTarget):
 *   'status'  detail: 'connecting' | 'open' | 'reconnecting' | 'lost' | 'closed'
 *   'hello' | 'room' | 'display' | 'controller' | 'toast' | 'error' | 'ended'
 *             detail: the frame's payload (PROTOCOL.md §2)
 *
 * 'lost' means: give up, this socket will not reconnect itself again
 * (grace window expired, a fatal server error arrived, or — for the display
 * role — the connection dropped at all, since the relay ends the room the
 * instant a display disconnects; PROTOCOL.md §4).
 */
export class RoomSocket extends EventTarget {
  constructor({ role, code, name = '' }) {
    super();
    if (role !== 'display' && role !== 'controller') throw new Error(`bad role: ${role}`);
    this.role = role;
    this.code = code;
    this.name = name;
    this.playerId = null;
    this.reconnectToken = role === 'controller' ? loadReconnect(code).reconnectToken : '';

    this.ws = null;
    this._pingTimer = null;
    this._reconnectTimer = null;
    this._attempt = 0;
    this._disconnectedAt = null;
    this._everOpened = false;
    this._explicitlyClosed = false;
    this._fatalCode = null;

    this._open();
  }

  _wsUrl() {
    const base = RELAY_URL.replace(/\/$/, '');
    if (this.role === 'display') {
      return `${base}/room/${this.code}/ws?role=display`;
    }
    const rt = encodeURIComponent(this.reconnectToken || '');
    const name = encodeURIComponent(this.name || '');
    return `${base}/room/${this.code}/ws?role=controller&name=${name}&rt=${rt}`;
  }

  _open() {
    this._status(this._attempt > 0 ? 'reconnecting' : 'connecting');
    let ws;
    try {
      ws = new WebSocket(this._wsUrl());
    } catch (err) {
      this._afterDrop();
      return;
    }
    this.ws = ws;
    ws.addEventListener('open', () => this._onOpen());
    ws.addEventListener('message', (ev) => this._onMessage(ev));
    ws.addEventListener('close', () => this._onClose());
    ws.addEventListener('error', () => { /* the close event that follows drives recovery */ });
  }

  _onOpen() {
    this._attempt = 0;
    this._disconnectedAt = null;
    this._everOpened = true;
    this._status('open');
    clearInterval(this._pingTimer);
    this._pingTimer = setInterval(() => this.send('ping', {}), PING_MS);
  }

  _onMessage(ev) {
    let frame;
    try { frame = JSON.parse(ev.data); } catch { return; }
    if (!frame || typeof frame.t !== 'string') return; // ignore malformed frames

    if (frame.t === 'hello') {
      this.playerId = frame.playerId ?? this.playerId;
      if (typeof frame.name === 'string') this.name = frame.name;
      if (this.role === 'controller' && frame.reconnectToken) {
        this.reconnectToken = frame.reconnectToken;
        saveReconnect(this.code, { reconnectToken: frame.reconnectToken, name: this.name });
      }
    }

    if (frame.t === 'error' && FATAL_ERROR_CODES.has(frame.code)) {
      this._fatalCode = frame.code;
    }

    if (frame.t === 'pong') return; // nothing to render

    this.dispatchEvent(new CustomEvent(frame.t, { detail: frame }));
    this.dispatchEvent(new CustomEvent('frame', { detail: frame }));
  }

  _onClose() {
    clearInterval(this._pingTimer);
    this._pingTimer = null;
    this.ws = null;
    if (this._explicitlyClosed) { this._status('closed'); return; }
    this._afterDrop();
  }

  _afterDrop() {
    if (this._fatalCode) { this._status('closed'); return; }

    if (this.role !== 'controller') {
      // Display: the relay ends the room the instant the display socket
      // drops (PROTOCOL.md §4), so reconnecting a socket that WAS open
      // wouldn't recover a room that no longer exists. The one exception is
      // a transient failure on the very first connect attempt (e.g. a cold
      // Durable Object) — give that a few short retries before giving up.
      if (!this._everOpened && this._attempt < 3) {
        this._status('reconnecting');
        const delay = backoffDelay(this._attempt++);
        this._reconnectTimer = setTimeout(() => this._open(), delay);
        return;
      }
      this._status('lost');
      return;
    }

    // Controller: retry with backoff for the full reconnect grace window.
    if (this._disconnectedAt == null) this._disconnectedAt = Date.now();
    const elapsed = Date.now() - this._disconnectedAt;
    if (elapsed >= RECONNECT_GRACE_MS) {
      this._status('lost');
      return;
    }
    this._status('reconnecting');
    const delay = Math.min(backoffDelay(this._attempt++), RECONNECT_GRACE_MS - elapsed);
    this._reconnectTimer = setTimeout(() => this._open(), delay);
  }

  _status(state) {
    this.dispatchEvent(new CustomEvent('status', { detail: state }));
  }

  send(t, fields = {}) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
    this.ws.send(JSON.stringify({ t, ...fields }));
    return true;
  }

  /** Manually kick a reconnect attempt right now (e.g. a "try again" button after grace expired). */
  retryNow() {
    clearTimeout(this._reconnectTimer);
    this._attempt = 0;
    this._disconnectedAt = null;
    this._fatalCode = null;
    this._explicitlyClosed = false;
    this._open();
  }

  action(action, fields = {}) { return this.send('action', { action, ...fields }); }
  advance() { return this.send('advance', {}); }
  start(gameId) { return this.send('start', { gameId }); }
  endGame() { return this.send('endgame', {}); }
  endRoom() { return this.send('endroom', {}); }

  close() {
    this._explicitlyClosed = true;
    clearTimeout(this._reconnectTimer);
    clearInterval(this._pingTimer);
    if (this.ws) this.ws.close();
  }
}
