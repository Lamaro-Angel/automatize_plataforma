import { randomUUID } from "node:crypto";
import type { Horario, Marcacao } from "./agenda.js";

export interface Servico {
  id: string;
  nome: string;
  duracaoMin: number;
  precoKz?: number;
}

export interface Negocio {
  id: string;
  nome: string;
  setor: "saude" | "beleza" | "restauracao" | "ensino" | "oficinas" | "comercio";
  agente: "margarida" | "marina";
  servicos: Servico[];
  horarios: Horario[];
  /** Número de WhatsApp de quem atende quando o agente passa a conversa. */
  contactoHumano?: string;
}

/**
 * Onde a plataforma guarda os dados. Na fase 0 usamos memória;
 * na fase 1 entra a implementação com Supabase (mesma interface).
 */
export interface Store {
  negocio(id: string): Promise<Negocio | undefined>;
  marcacoes(negocioId: string, data: string): Promise<Marcacao[]>;
  marcacoesDoCliente(negocioId: string, cliente: string): Promise<Marcacao[]>;
  criarMarcacao(negocioId: string, m: Omit<Marcacao, "id" | "estado">): Promise<Marcacao>;
  cancelarMarcacao(negocioId: string, id: string): Promise<boolean>;
  historico(negocioId: string, cliente: string): Promise<{ role: "user" | "assistant"; text: string }[]>;
  guardarMensagem(negocioId: string, cliente: string, role: "user" | "assistant", text: string): Promise<void>;
}

export class MemoryStore implements Store {
  private negocios = new Map<string, Negocio>();
  private agenda = new Map<string, Marcacao[]>();
  private conversas = new Map<string, { role: "user" | "assistant"; text: string }[]>();

  constructor(negocios: Negocio[] = []) {
    for (const n of negocios) this.negocios.set(n.id, n);
  }

  async negocio(id: string) {
    return this.negocios.get(id);
  }
  async marcacoes(negocioId: string, data: string) {
    return (this.agenda.get(negocioId) ?? []).filter((m) => m.data === data);
  }
  async marcacoesDoCliente(negocioId: string, cliente: string) {
    return (this.agenda.get(negocioId) ?? []).filter((m) => m.cliente === cliente && m.estado === "marcada");
  }
  async criarMarcacao(negocioId: string, m: Omit<Marcacao, "id" | "estado">) {
    const nova: Marcacao = { ...m, id: randomUUID().slice(0, 8), estado: "marcada" };
    this.agenda.set(negocioId, [...(this.agenda.get(negocioId) ?? []), nova]);
    return nova;
  }
  async cancelarMarcacao(negocioId: string, id: string) {
    const m = (this.agenda.get(negocioId) ?? []).find((x) => x.id === id);
    if (!m || m.estado === "cancelada") return false;
    m.estado = "cancelada";
    return true;
  }
  async historico(negocioId: string, cliente: string) {
    return this.conversas.get(`${negocioId}:${cliente}`) ?? [];
  }
  async guardarMensagem(negocioId: string, cliente: string, role: "user" | "assistant", text: string) {
    const k = `${negocioId}:${cliente}`;
    const h = this.conversas.get(k) ?? [];
    h.push({ role, text });
    // Guarda só as últimas 30 mensagens para o contexto não crescer sem fim.
    this.conversas.set(k, h.slice(-30));
  }
}

/** Negócio de demonstração para testar sem base de dados. */
export const NEGOCIO_DEMO: Negocio = {
  id: "demo",
  nome: "Clínica Sorriso Luanda",
  setor: "saude",
  agente: "margarida",
  servicos: [
    { id: "consulta", nome: "Consulta geral", duracaoMin: 30, precoKz: 15000 },
    { id: "limpeza", nome: "Limpeza dentária", duracaoMin: 60, precoKz: 25000 },
  ],
  horarios: [1, 2, 3, 4, 5].map((d) => ({ diaSemana: d, abre: "08:00", fecha: "17:00" })).concat([
    { diaSemana: 6, abre: "09:00", fecha: "13:00" },
  ]),
};
