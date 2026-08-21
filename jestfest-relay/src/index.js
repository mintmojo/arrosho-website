// Jest Fest relay -- Worker entry point.
//
// Routes (PROTOCOL.md §1):
//   POST /room                      -> 201 {"code":"K4M9"}
//   GET  /room/:code/exists         -> 200 {"exists":true,"state":"lobby"} | 404
//   GET  /room/:code/ws?role=...    -> WebSocket upgrade, forwarded to the room's DO
//
// This file is intentionally thin: it only resolves a code to a Durable
// Object and forwards. All room/game logic lives in src/room.js.

import { idForCode, roomStatus, pickUnusedCode } from "./registry.js";
import { isValidCodeShape } from "./codes.js";

export { Room } from "./room.js";

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type",
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", ...CORS_HEADERS },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method === "POST" && pathname === "/room") {
      const code = await pickUnusedCode(env);
      const stub = env.ROOM.get(idForCode(env, code));
      const initResp = await stub.fetch("https://internal/__init", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!initResp.ok) {
        return json({ error: "failed_to_create_room" }, 500);
      }
      return json({ code }, 201);
    }

    const roomMatch = pathname.match(/^\/room\/([A-Za-z0-9]{4})\/(exists|ws)$/);
    if (roomMatch) {
      const code = roomMatch[1].toUpperCase();
      const kind = roomMatch[2];

      if (!isValidCodeShape(code)) {
        return kind === "exists" ? json({ exists: false }, 404) : new Response("bad room code", { status: 404 });
      }

      if (kind === "exists" && request.method === "GET") {
        const { open, state } = await roomStatus(env, code);
        if (!open) return json({ exists: false }, 404);
        return json({ exists: true, state }, 200);
      }

      if (kind === "ws") {
        if (request.headers.get("Upgrade") !== "websocket") {
          return new Response("expected websocket upgrade", { status: 426 });
        }
        const stub = env.ROOM.get(idForCode(env, code));
        // Forward the original request (path + query string carry role/name/rt)
        // straight to the room's Durable Object, which owns the actual
        // acceptWebSocket() call. The Worker itself never touches the socket.
        return stub.fetch(request);
      }
    }

    return json({ error: "not_found" }, 404);
  },
};
