// Prompt Giver API — Cloudflare Worker + one Durable Object per lobby.
//
//   POST /lobby                         {password}                 -> {code}
//   POST /lobby/:code/player            {number}                   -> {prompt}
//   POST /lobby/:code/submit            {text}                     -> {ok}
//   POST /lobby/:code/host              {password, action, ...}    -> full lobby state
//        actions: "get" | "add" {text} | "set" {id, status}
//                 | "edit" {id, text} | "assign" {count} | "clear"
//
// Prompt statuses: "active" (in the pool), "unused" (kept, not handed out),
// "pending" (submitted by someone, waiting for the host). Nothing is ever deleted.

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O/0/I/1
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST,OPTIONS",
  "access-control-allow-headers": "content-type",
};
const json = (o, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", ...CORS } });
const fail = (msg, s = 400) => json({ error: msg }, s);

function randCode() {
  const b = crypto.getRandomValues(new Uint8Array(4));
  return [...b].map((x) => ALPHABET[x % ALPHABET.length]).join("");
}
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
async function hashPw(pw, salt) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: new TextEncoder().encode(salt), iterations: 100000 }, key, 256);
  return hex(bits);
}
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const clean = (t) => String(t || "").trim().slice(0, 500);

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
    if (req.method !== "POST") return fail("POST only", 405);
    const parts = new URL(req.url).pathname.split("/").filter(Boolean);
    let body = {};
    try { body = await req.json(); } catch {}

    if (parts.length === 1 && parts[0] === "lobby") {
      const pw = String(body.password || "");
      if (pw.length < 4) return fail("Password must be at least 4 characters");
      for (let i = 0; i < 8; i++) {
        const code = randCode();
        const stub = env.LOBBY.get(env.LOBBY.idFromName(code));
        const r = await stub.fetch("https://do/init", { method: "POST", body: JSON.stringify({ code, password: pw }) });
        if (r.status === 201) return json({ code }, 201);
      }
      return fail("Could not create a lobby, try again", 500);
    }

    if (parts.length === 3 && parts[0] === "lobby") {
      const code = parts[1].toUpperCase();
      if (!/^[A-Z0-9]{4}$/.test(code)) return fail("Bad code", 404);
      const stub = env.LOBBY.get(env.LOBBY.idFromName(code));
      const r = await stub.fetch("https://do/" + parts[2], { method: "POST", body: JSON.stringify(body) });
      return new Response(r.body, { status: r.status, headers: { "content-type": "application/json", ...CORS } });
    }
    return fail("Not found", 404);
  },
};

const IDLE_TTL = 60 * 24 * 60 * 60 * 1000; // lobby wiped after 60 days untouched

export class Lobby {
  constructor(ctx) { this.ctx = ctx; this.s = ctx.storage; }

  async load() { return (await this.s.get("lobby")) || null; }
  async save(l) {
    l.touched = Date.now();
    await this.s.put("lobby", l);
    await this.s.setAlarm(Date.now() + IDLE_TTL);
  }
  async alarm() { await this.s.deleteAll(); }

  async fetch(req) {
    const op = new URL(req.url).pathname.slice(1);
    const b = await req.json().catch(() => ({}));
    let l = await this.load();

    if (op === "init") {
      if (l) return fail("taken", 409);
      const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
      l = { code: b.code, salt, hash: await hashPw(b.password, salt), prompts: [], players: {}, count: 0, round: 0, nextId: 1 };
      await this.save(l);
      return json({ ok: true }, 201);
    }
    if (!l) return fail("No lobby with that code", 404);

    if (op === "player") {
      const n = parseInt(b.number, 10);
      if (!l.count) return fail("The host hasn't handed out prompts yet", 409);
      const pid = l.players[n];
      if (!pid) return fail(`Number ${n} isn't in this round (1–${l.count})`, 404);
      const p = l.prompts.find((x) => x.id === pid);
      return json({ number: n, prompt: p ? p.text : "", round: l.round });
    }

    if (op === "submit") {
      const text = clean(b.text);
      if (!text) return fail("Prompt is empty");
      if (l.prompts.filter((p) => p.status === "pending").length >= 200) return fail("Too many pending submissions", 429);
      l.prompts.push({ id: l.nextId++, text, status: "pending", from: "submitted", at: Date.now() });
      await this.save(l);
      return json({ ok: true });
    }

    if (op === "host") {
      if ((await hashPw(String(b.password || ""), l.salt)) !== l.hash) return fail("Wrong password", 401);
      const find = () => l.prompts.find((p) => p.id === Number(b.id));
      switch (b.action) {
        case "get": break;
        case "add": {
          const lines = String(b.text || "").split("\n").map(clean).filter(Boolean);
          if (!lines.length) return fail("Prompt is empty");
          for (const text of lines) l.prompts.push({ id: l.nextId++, text, status: "active", from: "host", at: Date.now() });
          break;
        }
        case "set": {
          const p = find(); if (!p) return fail("No such prompt", 404);
          if (!["active", "unused", "pending"].includes(b.status)) return fail("Bad status");
          p.status = b.status; break;
        }
        case "edit": {
          const p = find(); if (!p) return fail("No such prompt", 404);
          const t = clean(b.text); if (!t) return fail("Prompt is empty");
          p.text = t; break;
        }
        case "assign": {
          const count = parseInt(b.count, 10);
          if (!(count >= 1 && count <= 500)) return fail("Number of people must be 1–500");
          const pool = l.prompts.filter((p) => p.status === "active").map((p) => p.id);
          if (!pool.length) return fail("No active prompts to hand out");
          // Every prompt gets used before any repeats; extras share prompts.
          let deck = [];
          while (deck.length < count) deck = deck.concat(shuffle(pool.slice()));
          deck = shuffle(deck.slice(0, count));
          l.players = {};
          deck.forEach((id, i) => (l.players[i + 1] = id));
          l.count = count; l.round++;
          break;
        }
        case "clear": l.players = {}; l.count = 0; break;
        default: return fail("Unknown action");
      }
      if (b.action !== "get") await this.save(l);
      return json({ code: l.code, prompts: l.prompts, players: l.players, count: l.count, round: l.round });
    }
    return fail("Not found", 404);
  }
}
