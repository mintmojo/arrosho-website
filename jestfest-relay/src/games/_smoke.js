// Trivial end-to-end smoke test game. NOT a real Jest Fest game -- exists so
// the relay's room/game lifecycle (start, action, scoring, serialize/restore,
// reconnect) can be proven out without waiting on kwiplash.js or
// fish-and-slips.js. Two players, one action, immediate awards.
//
// Flow: display sends `start` -> both controllers send
// `{t:'action', action:'tap'}` -> once both have tapped, the room ends the
// game and awards 2 BR to whoever tapped first, 1 BR to the other, and
// returns to lobby.

export default class SmokeGame {
  static id = "_smoke";
  static title = "Smoke Test";
  static minPlayers = 2;
  static maxPlayers = 2;
  static allowsMidGameJoin = false;

  constructor(ctx) {
    this.ctx = ctx;
    this.tappedOrder = [];
  }

  start() {
    this.tappedOrder = [];
    this.ctx.push();
  }

  onAction(playerId, action) {
    if (!action || action.action !== "tap") return;
    if (this.tappedOrder.includes(playerId)) return;

    this.tappedOrder.push(playerId);
    this.ctx.toast(playerId, "info", "Tap received.");

    // Win condition is based on currently-connected players, not the full
    // roster -- a seat held for someone who has dropped (still within their
    // 180s reconnect grace) should never block the game from resolving.
    const activeCount = this.ctx.players.filter((p) => p.connected).length;
    if (this.tappedOrder.length >= activeCount) {
      const awards = this.tappedOrder.map((playerId, i) => ({
        playerId,
        points: i === 0 ? 2 : 1,
      }));
      this.ctx.end(awards);
    } else {
      this.ctx.push();
    }
  }

  onAdvance() {
    // No intermediate screens in this smoke test; nothing to do.
  }

  onPlayerJoin() {
    // allowsMidGameJoin is false, so the room never calls this.
  }

  onPlayerLeave(playerId) {
    this.tappedOrder = this.tappedOrder.filter((id) => id !== playerId);
    this.ctx.push();
  }

  onPlayerReconnect(player) {
    this.ctx.pushTo(player.id);
  }

  onTimer() {
    // No timers used in this smoke test.
  }

  displayView() {
    return {
      view: "main",
      data: {
        tapped: this.tappedOrder.length,
        total: this.ctx.players.length,
      },
    };
  }

  controllerView(playerId) {
    return {
      view: "main",
      data: { tapped: this.tappedOrder.includes(playerId) },
    };
  }

  serialize() {
    return { tappedOrder: this.tappedOrder };
  }

  restore(saved) {
    this.tappedOrder = (saved && saved.tappedOrder) || [];
  }
}
