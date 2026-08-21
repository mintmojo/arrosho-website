// Code -> Durable Object mapping, and collision checks against open rooms.
//
// A room code is not stored in a lookup table anywhere -- `env.ROOM.idFromName(code)`
// deterministically derives the same DO id for the same code every time, so the
// "registry" is really just: (a) that deterministic mapping, plus (b) asking the
// target DO itself whether it is currently hosting an open room, so codes.js can
// regenerate on collision (PROTOCOL.md §4).
//
// Because room-end explicitly wipes DO storage (`state.storage.deleteAll()`,
// see room.js), a DO that has never been initialized and a DO whose room already
// ended look identical from the outside: no `meta` in storage. Both read as
// "code is free to reuse."

import { generateCode } from "./codes.js";

const MAX_CODE_ATTEMPTS = 40;

/** The Durable Object id for a given room code. */
export function idForCode(env, code) {
  return env.ROOM.idFromName(code.toUpperCase());
}

/** The Durable Object stub for a given room code. */
export function stubForCode(env, code) {
  return env.ROOM.get(idForCode(env, code));
}

/**
 * Ask a room's DO whether it is currently hosting an open (non-ended) room.
 * Returns `{ open: boolean, state: string|null }`.
 */
export async function roomStatus(env, code) {
  const stub = stubForCode(env, code);
  const resp = await stub.fetch("https://internal/__status");
  if (!resp.ok) return { open: false, state: null };
  return resp.json();
}

/**
 * Pick a room code that isn't currently in use by an open room, retrying on
 * collision. Throws if the code space is exhausted after MAX_CODE_ATTEMPTS
 * tries (astronomically unlikely at 32^4 = 1,048,576 possible codes).
 */
export async function pickUnusedCode(env, randomFn) {
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const code = generateCode(randomFn);
    const { open } = await roomStatus(env, code);
    if (!open) return code;
  }
  throw new Error("jestfest-relay: exhausted room code attempts, all collided with open rooms");
}
