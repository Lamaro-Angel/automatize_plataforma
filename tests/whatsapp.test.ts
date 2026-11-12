import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { assinaturaValida, enviarTexto, lerMensagens, verificarWebhook } from "../src/whatsapp.js";

describe("whatsapp", () => {
  it("verifica o webhook só com o token certo", () => {
    const q = new URLSearchParams({ "hub.mode": "subscribe", "hub.verify_token": "segredo", "hub.challenge": "123" });
    expect(verificarWebhook(q, "segredo")).toBe("123");
    expect(verificarWebhook(q, "outro")).toBeNull();
    expect(verificarWebhook(q, undefined)).toBeNull();
  });
  it("valida a assinatura da Meta", () => {
    const corpo = '{"a":1}';
    const sig = "sha256=" + createHmac("sha256", "app").update(corpo).digest("hex");
    expect(assinaturaValida(corpo, sig, "app")).toBe(true);
    expect(assinaturaValida(corpo, sig, "errado")).toBe(false);
    expect(assinaturaValida(corpo, undefined, "app")).toBe(false);
  });
  it("lê mensagens de texto e ignora estados", () => {
    const evento = {
      entry: [{ changes: [
        { value: { metadata: { phone_number_id: "PN" }, contacts: [{ wa_id: "244900", profile: { name: "Ana" } }],
          messages: [{ id: "m1", from: "244900", type: "text", text: { body: "Olá" } }, { id: "m2", from: "244900", type: "image" }] } },
        { value: { statuses: [{ id: "s1" }] } },
      ] }],
    };
    expect(lerMensagens(evento)).toEqual([{ id: "m1", de: "244900", nome: "Ana", texto: "Olá", phoneNumberId: "PN" }]);
  });
  it("envia texto pela Graph API", async () => {
    const f = vi.fn(async () => new Response("{}", { status: 200 }));
    await enviarTexto({ token: "T", phoneNumberId: "PN", para: "244900", texto: "Oi" }, f as any);
    const [url, init] = f.mock.calls[0] as any;
    expect(url).toContain("/PN/messages");
    expect(JSON.parse(init.body)).toMatchObject({ to: "244900", text: { body: "Oi" } });
  });
});
