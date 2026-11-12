import Anthropic from "@anthropic-ai/sdk";
import type {
  BetaMessage,
  BetaMessageParam,
  BetaTool,
  BetaToolResultBlockParam,
  MessageCreateParamsNonStreaming,
} from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { vagasLivres } from "./agenda.js";
import { instrucoesDoAgente } from "./personas.js";
import type { Store } from "./store.js";

export const MODELO = "claude-opus-5-5";

/** O mínimo do cliente da Anthropic de que o agente precisa (permite testar sem rede). */
export interface ClaudeClient {
  beta: { messages: { create(p: MessageCreateParamsNonStreaming): Promise<BetaMessage> } };
}

export function criarCliente(apiKey: string): ClaudeClient {
  return new Anthropic({ apiKey }) as unknown as ClaudeClient;
}

const obj = (properties: Record<string, unknown>, required: string[]) => ({
  type: "object" as const,
  properties,
  required,
  additionalProperties: false,
});

export const FERRAMENTAS: BetaTool[] = [
  {
    name: "ver_vagas",
    description: "Lista as horas livres num dia para um serviço. Usa sempre antes de propor horários.",
    strict: true,
    input_schema: obj(
      { servico_id: { type: "string" }, data: { type: "string", description: "AAAA-MM-DD" } },
      ["servico_id", "data"],
    ),
  },
  {
    name: "marcar",
    description: "Marca um serviço para o cliente, depois de o cliente confirmar o dia, a hora e o nome.",
    strict: true,
    input_schema: obj(
      {
        servico_id: { type: "string" },
        data: { type: "string", description: "AAAA-MM-DD" },
        hora: { type: "string", description: "HH:MM" },
        nome_cliente: { type: "string" },
      },
      ["servico_id", "data", "hora", "nome_cliente"],
    ),
  },
  {
    name: "minhas_marcacoes",
    description: "Lista as marcações ativas deste cliente (para remarcar ou cancelar).",
    strict: true,
    input_schema: obj({}, []),
  },
  {
    name: "cancelar",
    description: "Cancela uma marcação deste cliente pelo id. Para remarcar: cancela e depois marca de novo.",
    strict: true,
    input_schema: obj({ marcacao_id: { type: "string" } }, ["marcacao_id"]),
  },
  {
    name: "passar_para_pessoa",
    description: "Passa a conversa para uma pessoa da equipa do negócio.",
    strict: true,
    input_schema: obj({ motivo: { type: "string" } }, ["motivo"]),
  },
];

export interface Contexto {
  store: Store;
  negocioId: string;
  cliente: string;
  /** Chamado quando o agente pede ajuda humana. */
  aoPassarParaPessoa?: (motivo: string) => Promise<void>;
}

/** Executa uma ferramenta e devolve o texto do resultado (lança erro se falhar). */
export async function executarFerramenta(nome: string, input: any, ctx: Contexto): Promise<string> {
  const n = await ctx.store.negocio(ctx.negocioId);
  if (!n) throw new Error("Negócio não encontrado.");
  const servico = (id: string) => {
    const s = n.servicos.find((x) => x.id === id);
    if (!s) throw new Error(`Serviço "${id}" não existe. Serviços: ${n.servicos.map((x) => x.id).join(", ")}`);
    return s;
  };

  switch (nome) {
    case "ver_vagas": {
      const s = servico(input.servico_id);
      const vagas = vagasLivres({
        data: input.data,
        duracaoMin: s.duracaoMin,
        horarios: n.horarios,
        marcacoes: await ctx.store.marcacoes(n.id, input.data),
      });
      return vagas.length ? `Vagas em ${input.data}: ${vagas.join(", ")}` : `Sem vagas em ${input.data}.`;
    }
    case "marcar": {
      const s = servico(input.servico_id);
      const livres = vagasLivres({
        data: input.data,
        duracaoMin: s.duracaoMin,
        horarios: n.horarios,
        marcacoes: await ctx.store.marcacoes(n.id, input.data),
      });
      if (!livres.includes(input.hora)) throw new Error(`A hora ${input.hora} já não está livre. Vagas: ${livres.join(", ") || "nenhuma"}`);
      const m = await ctx.store.criarMarcacao(n.id, {
        data: input.data,
        inicio: input.hora,
        duracaoMin: s.duracaoMin,
        cliente: ctx.cliente,
        servico: s.nome,
      });
      return `Marcado: ${s.nome}, ${m.data} às ${m.inicio}, em nome de ${input.nome_cliente}. Referência ${m.id}.`;
    }
    case "minhas_marcacoes": {
      const ms = await ctx.store.marcacoesDoCliente(n.id, ctx.cliente);
      return ms.length ? ms.map((m) => `${m.id}: ${m.servico}, ${m.data} às ${m.inicio}`).join("\n") : "Sem marcações ativas.";
    }
    case "cancelar": {
      const meu = (await ctx.store.marcacoesDoCliente(n.id, ctx.cliente)).some((m) => m.id === input.marcacao_id);
      if (!meu || !(await ctx.store.cancelarMarcacao(n.id, input.marcacao_id))) throw new Error("Marcação não encontrada.");
      return `Marcação ${input.marcacao_id} cancelada.`;
    }
    case "passar_para_pessoa": {
      await ctx.aoPassarParaPessoa?.(input.motivo);
      return "Pedido enviado à equipa. Diz ao cliente que uma pessoa vai responder em breve.";
    }
    default:
      throw new Error(`Ferramenta desconhecida: ${nome}`);
  }
}

const RESPOSTA_RECUSA =
  "Desculpe, não consigo ajudar com esse pedido por aqui. Posso passar a conversa a uma pessoa da equipa?";

/**
 * Responde a uma mensagem do cliente: chama o Claude, executa as ferramentas pedidas
 * e repete até haver uma resposta final em texto.
 */
export async function responder(
  client: ClaudeClient,
  ctx: Contexto,
  textoCliente: string,
  hoje: string,
  maxVoltas = 8,
): Promise<string> {
  const n = await ctx.store.negocio(ctx.negocioId);
  if (!n) throw new Error("Negócio não encontrado.");

  const anteriores = await ctx.store.historico(n.id, ctx.cliente);
  const messages: BetaMessageParam[] = [
    ...anteriores.map((h) => ({ role: h.role, content: h.text })),
    { role: "user", content: textoCliente },
  ];

  let resposta = "";
  for (let volta = 0; volta < maxVoltas; volta++) {
    const r = await client.beta.messages.create({
      model: MODELO,
      max_tokens: 16000,
      // Se o modelo principal recusar por política, a API tenta o modelo de reserva automaticamente.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium" },
      system: instrucoesDoAgente(n, hoje),
      tools: FERRAMENTAS,
      messages,
    });

    if (r.stop_reason === "refusal") {
      resposta = RESPOSTA_RECUSA;
      break;
    }

    messages.push({ role: "assistant", content: r.content });

    if (r.stop_reason === "pause_turn") continue;

    if (r.stop_reason !== "tool_use") {
      resposta = r.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { text: string }).text)
        .join("\n")
        .trim();
      break;
    }

    const resultados: BetaToolResultBlockParam[] = [];
    for (const b of r.content) {
      if (b.type !== "tool_use") continue;
      try {
        const out = await executarFerramenta(b.name, b.input, ctx);
        resultados.push({ type: "tool_result", tool_use_id: b.id, content: out });
      } catch (err) {
        resultados.push({ type: "tool_result", tool_use_id: b.id, content: (err as Error).message, is_error: true });
      }
    }
    messages.push({ role: "user", content: resultados });
  }

  if (!resposta) resposta = "Um momento, vou confirmar e já respondo.";
  await ctx.store.guardarMensagem(n.id, ctx.cliente, "user", textoCliente);
  await ctx.store.guardarMensagem(n.id, ctx.cliente, "assistant", resposta);
  return resposta;
}
