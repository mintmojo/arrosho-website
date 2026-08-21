import { test } from "node:test";
import assert from "node:assert/strict";
import { generateCode, isValidCodeShape, CODE_ALPHABET, CODE_LENGTH } from "../src/codes.js";

test("CODE_ALPHABET excludes visually-confusable characters", () => {
  for (const ch of ["0", "O", "1", "I"]) {
    assert.equal(CODE_ALPHABET.includes(ch), false, `alphabet must not include "${ch}"`);
  }
});

test("CODE_ALPHABET has no duplicate characters", () => {
  assert.equal(new Set(CODE_ALPHABET).size, CODE_ALPHABET.length);
});

test("generateCode returns CODE_LENGTH characters, all from the alphabet", () => {
  const code = generateCode();
  assert.equal(code.length, CODE_LENGTH);
  for (const ch of code) {
    assert.ok(CODE_ALPHABET.includes(ch), `"${ch}" should be in the alphabet`);
  }
});

test("generateCode is deterministic given a deterministic randomFn", () => {
  // Always pick index 0 of the alphabet -> all 4 chars are CODE_ALPHABET[0].
  const zero = () => 0;
  const code = generateCode(zero);
  assert.equal(code, CODE_ALPHABET[0].repeat(CODE_LENGTH));
});

test("generateCode maps randomFn() just under 1 to the last alphabet character", () => {
  const almostOne = () => 0.9999999;
  const code = generateCode(almostOne);
  assert.equal(code, CODE_ALPHABET[CODE_ALPHABET.length - 1].repeat(CODE_LENGTH));
});

test("generateCode uses a different randomFn call per character (not one draw repeated)", () => {
  let n = 0;
  // Cycle through indices 0,1,2,3 (scaled into [0,1)) so each of the 4
  // characters comes from a different alphabet position.
  const sequence = () => {
    const v = (n % CODE_ALPHABET.length) / CODE_ALPHABET.length;
    n++;
    return v;
  };
  const code = generateCode(sequence);
  assert.equal(code, CODE_ALPHABET[0] + CODE_ALPHABET[1] + CODE_ALPHABET[2] + CODE_ALPHABET[3]);
});

test("isValidCodeShape accepts a well-formed code", () => {
  assert.equal(isValidCodeShape("K4M9"), true);
  assert.equal(isValidCodeShape("k4m9"), true, "case-insensitive");
});

test("isValidCodeShape rejects wrong length", () => {
  assert.equal(isValidCodeShape("K4M"), false);
  assert.equal(isValidCodeShape("K4M99"), false);
  assert.equal(isValidCodeShape(""), false);
});

test("isValidCodeShape rejects excluded characters (0, O, 1, I)", () => {
  assert.equal(isValidCodeShape("K0M9"), false);
  assert.equal(isValidCodeShape("KOM9"), false);
  assert.equal(isValidCodeShape("K1M9"), false);
  assert.equal(isValidCodeShape("KIM9"), false);
});

test("isValidCodeShape rejects non-string input", () => {
  assert.equal(isValidCodeShape(1234), false);
  assert.equal(isValidCodeShape(null), false);
  assert.equal(isValidCodeShape(undefined), false);
});

test("generateCode never produces an excluded character across many draws", () => {
  for (let i = 0; i < 2000; i++) {
    const code = generateCode();
    assert.equal(isValidCodeShape(code), true, `"${code}" should be a valid shape`);
  }
});
