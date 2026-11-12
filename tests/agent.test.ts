import { describe, expect, it } from "vitest";
import { responder, type ClaudeClient } from "../src/agent.js";
import { MemoryStore, NEGOCIO_DEMO } from "../src/store.js";

/** Cliente falso: devolve respostas pré-definidas e guarda os pedidos. */
function falso(respostas: any[]) {
  const pedidos: any[] = [];
  const client: ClaudeClient = {
    beta: { messages: { create: async (p) => { pedidos.push(structuredClone(p)); return respostas.shift(); } } },
  };
  return { client, pedidos };
}
const msg = (stop_reason: string, content: any[]) => ({ stop_reason, content }) as any;

describe("agente", () => {
  it("vê vagas, marca e responde", async () => {
    const store = new MemoryStore([NEGOCIO_DEMO]);
    const { client, pedidos } = falso([
      msg("tool_use", [{ type: "tool_use", id: "t1", name: "ver_vagas", input: { servico_id: "consulta", data: "2026-11-16" } }]),
      msg("tool_use", [{ type: "tool_use", id: "t2", name: "marcar", input: { servico_id: "consulta", data: "2026-11-16", hora: "08:00", nome_cliente: "Ana" } }]),
      msg("end_turn", [{ type: "text", text: "Ficou marcado para segunda às 08:00." }]),
    ]);
    const ctx = { store, negocioId: "demo", cliente: "244900" };
    const r = await responder(client, ctx, "Quero consulta segunda", "2026-11-12");

    expect(r).toBe("Ficou marcado para segunda às 08:00.");
    expect(pedidos[0]).toMatchObject({ model: "claude-opus-5-5", fallbacks: "default", betas: ["server-side-fallback-2026-07-01"] });
    expect(pedidos[1].messages.at(-1).content[0].content).toContain("08:00");
    expect(await store.marcacoesDoCliente("demo", "244900")).toHaveLength(1);
    expect(await store.historico("demo", "244900")).toHaveLength(2);
  });

  it("marca o erro da ferramenta com is_error quando a hora está ocupada", async () => {
    const store = new MemoryStore([NEGOCIO_DEMO]);
    await store.criarMarcacao("demo", { data: "2026-11-16", inicio: "08:00", duracaoMin: 30, cliente: "outro", servico: "Consulta geral" });
    const { client, pedidos } = falso([
      msg("tool_use", [{ type: "tool_use", id: "t1", name: "marcar", input: { servico_id: "consulta", data: "2026-11-16", hora: "08:00", nome_cliente: "Ana" } }]),
      msg("end_turn", [{ type: "text", text: "Essa hora já foi ocupada. Pode ser às 08:30?" }]),
    ]);
    await responder(client, { store, negocioId: "demo", cliente: "244900" }, "08:00", "2026-11-12");
    const resultado = pedidos[1].messages.at(-1).content[0];
    expect(resultado.is_error).toBe(true);
    expect(await store.marcacoesDoCliente("demo", "244900")).toHaveLength(0);
  });

  it("responde com educação quando o pedido é recusado", async () => {
    const store = new MemoryStore([NEGOCIO_DEMO]);
    const { client } = falso([msg("refusal", [])]);
    const r = await responder(client, { store, negocioId: "demo", cliente: "1" }, "...", "2026-11-12");
    expect(r).toContain("pessoa da equipa");
  });

  it("só cancela marcações do próprio cliente", async () => {
    const store = new MemoryStore([NEGOCIO_DEMO]);
    const alheia = await store.criarMarcacao("demo", { data: "2026-11-16", inicio: "09:00", duracaoMin: 30, cliente: "outro", servico: "x" });
    const { client, pedidos } = falso([
      msg("tool_use", [{ type: "tool_use", id: "t1", name: "cancelar", input: { marcacao_id: alheia.id } }]),
      msg("end_turn", [{ type: "text", text: "Não encontrei." }]),
    ]);
    await responder(client, { store, negocioId: "demo", cliente: "eu" }, "cancela", "2026-11-12");
    expect(pedidos[1].messages.at(-1).content[0].is_error).toBe(true);
    expect((await store.marcacoes("demo", "2026-11-16"))[0].estado).toBe("marcada");
  });
});
