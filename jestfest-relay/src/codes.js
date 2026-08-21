// Room code generation.
//
// PROTOCOL.md §4 / spec §4.1: 4 characters, drawn from an alphabet that
// excludes visually-confusable characters (0/O and 1/I) so a code is easy to
// read out loud or off a screen across a room.

export const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 4;

/**
 * Cryptographically-strong default randomness source, returning a float in
 * [0, 1) the same shape as Math.random(). Room *codes* are not game outcomes
 * (nothing about fairness or reproducibility depends on them), so this does
 * not need to be the seeded, room-scoped ctx.random() PRNG that game modules
 * use -- that one is seeded and stored per-room specifically so game logic
 * survives hibernation reproducibly (PROTOCOL.md §5). Codes are generated
 * once, before any room/DO state exists, so crypto randomness is the right
 * (and simpler) choice here.
 */
function defaultRandom() {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / 0x100000000;
}

/**
 * Generate one 4-character room code. Pass a custom `randomFn` (returning a
 * float in [0, 1)) for deterministic testing.
 */
export function generateCode(randomFn = defaultRandom) {
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    const idx = Math.floor(randomFn() * CODE_ALPHABET.length) % CODE_ALPHABET.length;
    out += CODE_ALPHABET[idx];
  }
  return out;
}

/** True if `code` is a syntactically valid Jest Fest room code. */
export function isValidCodeShape(code) {
  if (typeof code !== "string" || code.length !== CODE_LENGTH) return false;
  for (const ch of code.toUpperCase()) {
    if (!CODE_ALPHABET.includes(ch)) return false;
  }
  return true;
}
