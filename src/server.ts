import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { pathToFileURL } from "node:url";
import { criarCliente, responder, type ClaudeClient } from "./agent.js";
import { loadConfig, missingKeys, type Config } from "./config.js";
import { MemoryStore, NEGOCIO_DEMO, type Store } from "./store.js";
import { assinaturaValida, enviarTexto, lerMensagens, verificarWebhook } from "./whatsapp.js";

export const hojeEmLuanda = (d = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Luanda" }).format(d);

const lerCorpo = (req: IncomingMessage) =>
  new Promise<Buffer>((ok, falha) => {
    const partes: Buffer[] = [];
    req.on("data", (c) => partes.push(c));
    req.on("end", () => ok(Buffer.concat(partes)));
    req.on("error", falha);
  });

export interface Dependencias {
  config: Config;
  store: Store;
  claude?: ClaudeClient;
  enviar?: typeof enviarTexto;
}

export function criarApp(dep: Dependencias) {
  const { config, store } = dep;
  const enviar = dep.enviar ?? enviarTexto;
  const vistas = new Set<string>(); // a Meta pode repetir a mesma mensagem

  async function tratar(corpo: unknown) {
    for (const m of lerMensagens(corpo)) {
      if (vistas.has(m.id)) continue;
      vistas.add(m.id);
      if (!dep.claude || !config.whatsappToken) continue;
      // Fase 0: todos os números vão para o negócio de demonstração.
      const texto = await responder(dep.claude, { store, negocioId: NEGOCIO_DEMO.id, cliente: m.de }, m.texto, hojeEmLuanda());
      await enviar({ token: config.whatsappToken, phoneNumberId: m.phoneNumberId || config.phoneNumberId!, para: m.de, texto });
    }
  }

  return async function handler(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url ?? "/", "http://localhost");

    if (req.method === "GET" && url.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, faltam: missingKeys(config) }));
      return;
    }

    if (url.pathname === "/webhook" && req.method === "GET") {
      const desafio = verificarWebhook(url.searchParams, config.verifyToken);
      res.writeHead(desafio ? 200 : 403).end(desafio ?? "Proibido");
      return;
    }

    if (url.pathname === "/webhook" && req.method === "POST") {
      const corpo = await lerCorpo(req);
      if (!assinaturaValida(corpo, req.headers["x-hub-signature-256"] as string | undefined, config.appSecret)) {
        res.writeHead(401).end("Assinatura inválida");
        return;
      }
      // Responde já à Meta (ela exige resposta rápida) e trata a mensagem a seguir.
      res.writeHead(200).end("ok");
      let json: unknown;
      try {
        json = JSON.parse(corpo.toString("utf8"));
      } catch {
        return;
      }
      tratar(json).catch((e) => console.error("Erro ao tratar mensagem:", e));
      return;
    }

    res.writeHead(404).end("Não encontrado");
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const config = loadConfig();
  const faltam = missingKeys(config);
  if (faltam.length) console.warn(`Ainda faltam chaves: ${faltam.join(", ")}. O servidor arranca, mas não responde no WhatsApp.`);
  const app = criarApp({
    config,
    store: new MemoryStore([NEGOCIO_DEMO]),
    claude: config.anthropicKey ? criarCliente(config.anthropicKey) : undefined,
  });
  createServer((req, res) => {
    app(req, res).catch((e) => {
      console.error(e);
      if (!res.headersSent) res.writeHead(500).end("Erro");
    });
  }).listen(config.port, () => console.log(`Automatize a ouvir na porta ${config.port}`));
}
