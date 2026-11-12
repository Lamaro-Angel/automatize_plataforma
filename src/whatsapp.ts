import { createHmac, timingSafeEqual } from "node:crypto";

const GRAPH = "https://graph.facebook.com/v23.0";

/** GET /webhook: a Meta envia um desafio e só aceita se devolvermos o mesmo valor. */
export function verificarWebhook(q: URLSearchParams, verifyToken?: string): string | null {
  if (!verifyToken) return null;
  if (q.get("hub.mode") === "subscribe" && q.get("hub.verify_token") === verifyToken) {
    return q.get("hub.challenge");
  }
  return null;
}

/** Confirma que o pedido veio mesmo da Meta (cabeçalho X-Hub-Signature-256). */
export function assinaturaValida(corpo: string | Buffer, cabecalho: string | undefined, appSecret?: string): boolean {
  if (!appSecret || !cabecalho?.startsWith("sha256=")) return false;
  const esperado = Buffer.from(createHmac("sha256", appSecret).update(corpo).digest("hex"));
  const recebido = Buffer.from(cabecalho.slice(7));
  return esperado.length === recebido.length && timingSafeEqual(esperado, recebido);
}

export interface MensagemRecebida {
  id: string;
  de: string;
  nome?: string;
  texto: string;
  phoneNumberId: string;
}

/** Extrai as mensagens de texto de um evento da WhatsApp Cloud API. */
export function lerMensagens(evento: unknown): MensagemRecebida[] {
  const out: MensagemRecebida[] = [];
  const e = evento as any;
  for (const entry of e?.entry ?? []) {
    for (const change of entry?.changes ?? []) {
      const v = change?.value;
      if (!v?.messages) continue;
      const nomes = new Map<string, string>(
        (v.contacts ?? []).map((c: any) => [c.wa_id, c.profile?.name]),
      );
      for (const m of v.messages) {
        let texto: string | undefined;
        if (m.type === "text") texto = m.text?.body;
        else if (m.type === "button") texto = m.button?.text;
        else if (m.type === "interactive") texto = m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title;
        if (!texto) continue;
        out.push({ id: m.id, de: m.from, nome: nomes.get(m.from), texto, phoneNumberId: v.metadata?.phone_number_id });
      }
    }
  }
  return out;
}

/** Envia uma mensagem de texto pelo número da empresa. */
export async function enviarTexto(
  opts: { token: string; phoneNumberId: string; para: string; texto: string },
  fetchFn: typeof fetch = fetch,
): Promise<void> {
  const r = await fetchFn(`${GRAPH}/${opts.phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${opts.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: opts.para,
      type: "text",
      text: { body: opts.texto.slice(0, 4096) },
    }),
  });
  if (!r.ok) throw new Error(`WhatsApp respondeu ${r.status}: ${await r.text()}`);
}
