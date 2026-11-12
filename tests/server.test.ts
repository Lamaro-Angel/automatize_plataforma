import { createHmac } from "node:crypto";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { criarApp } from "../src/server.js";
import { MemoryStore, NEGOCIO_DEMO } from "../src/store.js";

const enviados: any[] = [];
const app = criarApp({
  config: { port: 0, verifyToken: "vt", appSecret: "sec", whatsappToken: "tok", phoneNumberId: "PN", anthropicKey: "k" },
  store: new MemoryStore([NEGOCIO_DEMO]),
  claude: { beta: { messages: { create: async () => ({ stop_reason: "end_turn", content: [{ type: "text", text: "Olá! Em que posso ajudar?" }] }) as any } } },
  enviar: async (o) => { enviados.push(o); },
});
const srv = createServer((q, r) => void app(q, r));
let base = "";
beforeAll(() => new Promise<void>((ok) => srv.listen(0, () => { base = `http://127.0.0.1:${(srv.address() as AddressInfo).port}`; ok(); })));
afterAll(() => new Promise<void>((ok) => srv.close(() => ok())));

describe("servidor", () => {
  it("health mostra o que falta", async () => {
    expect(await (await fetch(`${base}/health`)).json()).toEqual({ ok: true, faltam: [] });
  });
  it("verificação do webhook", async () => {
    const r = await fetch(`${base}/webhook?hub.mode=subscribe&hub.verify_token=vt&hub.challenge=42`);
    expect(await r.text()).toBe("42");
  });
  it("rejeita pedidos sem assinatura", async () => {
    expect((await fetch(`${base}/webhook`, { method: "POST", body: "{}" })).status).toBe(401);
  });
  it("responde no WhatsApp e ignora mensagens repetidas", async () => {
    const corpo = JSON.stringify({ entry: [{ changes: [{ value: { metadata: { phone_number_id: "PN" }, messages: [{ id: "m1", from: "244900", type: "text", text: { body: "Olá" } }] } }] }] });
    const sig = "sha256=" + createHmac("sha256", "sec").update(corpo).digest("hex");
    for (let i = 0; i < 2; i++) {
      const r = await fetch(`${base}/webhook`, { method: "POST", body: corpo, headers: { "x-hub-signature-256": sig } });
      expect(r.status).toBe(200);
    }
    await new Promise((ok) => setTimeout(ok, 50));
    expect(enviados).toEqual([{ token: "tok", phoneNumberId: "PN", para: "244900", texto: "Olá! Em que posso ajudar?" }]);
  });
});
