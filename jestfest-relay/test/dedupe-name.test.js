// Unit tests for the display-name de-duplication rule (PROTOCOL.md §4:
// "Duplicate name -> append ' (2)', ' (3)'... Never reject a join for a
// name clash.").
//
// `Room.prototype.dedupeName` only reads `this.players` (an array of
// `{name}`), so it can be exercised directly against a bare fake `this`
// without spinning up a real Durable Object / storage / WebSocket.

import { test } from "node:test";
import assert from "node:assert/strict";
import { Room } from "../src/room.js";

function dedupe(existingNames, candidate) {
  const fakeRoom = { players: existingNames.map((name) => ({ name })) };
  return Room.prototype.dedupeName.call(fakeRoom, candidate);
}

test("no clash -> name is returned unchanged", () => {
  assert.equal(dedupe([], "Alex"), "Alex");
  assert.equal(dedupe(["Sam", "Jordan"], "Alex"), "Alex");
});

test("one clash -> ' (2)' suffix", () => {
  assert.equal(dedupe(["Alex"], "Alex"), "Alex (2)");
});

test("clash with the (2) variant already taken -> ' (3)'", () => {
  assert.equal(dedupe(["Alex", "Alex (2)"], "Alex"), "Alex (3)");
});

test("skips over gaps and finds the first free suffix", () => {
  // "Alex (2)" is free even though "Alex" and "Alex (3)" are taken --
  // dedupeName should still find the lowest free number, not just append
  // blindly at the end.
  assert.equal(dedupe(["Alex", "Alex (3)"], "Alex"), "Alex (2)");
});

test("many repeats keep incrementing", () => {
  const taken = ["Alex", "Alex (2)", "Alex (3)", "Alex (4)"];
  assert.equal(dedupe(taken, "Alex"), "Alex (5)");
});

test("is case-sensitive and does not conflate different names", () => {
  assert.equal(dedupe(["alex"], "Alex"), "Alex", "different case is a different name");
  assert.equal(dedupe(["Alexander"], "Alex"), "Alex", "prefix match is not a clash");
});

test("does not mutate the players array it reads", () => {
  const players = [{ name: "Alex" }];
  const fakeRoom = { players };
  Room.prototype.dedupeName.call(fakeRoom, "Alex");
  assert.equal(players.length, 1);
  assert.equal(players[0].name, "Alex");
});
