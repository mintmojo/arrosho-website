// Game module registry.
//
// Every game is a default-exported class matching the contract in
// PROTOCOL.md §5 (static id/title/minPlayers/maxPlayers/allowsMidGameJoin,
// start/onAction/onAdvance/onPlayerJoin/onPlayerLeave/onPlayerReconnect/
// onTimer/displayView/controllerView/serialize/restore).
//
// kwiplash.js and fish-and-slips.js are being built by other agents against
// this same contract. They are imported by path here so the room picks them
// up the moment they land -- nothing else in this file needs to change.
//
// room.js NEVER assumes a module is present: an unknown gameId (module
// missing from this registry) or a module that throws is handled by
// returning `error/not_allowed` to the display rather than crashing the
// room (see handleStart / ensureGameLoaded in room.js).

import SmokeGame from "./_smoke.js";
import Kwiplash from "./kwiplash.js";
import FishAndSlips from "./fish-and-slips.js";

const registry = {};

for (const GameClass of [SmokeGame, Kwiplash, FishAndSlips]) {
  if (GameClass && GameClass.id) {
    registry[GameClass.id] = GameClass;
  }
}

export default registry;
