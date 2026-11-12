/**
 * Cálculo de vagas livres. Funções puras (sem base de dados), fáceis de testar.
 * Horas em "HH:MM", datas em "AAAA-MM-DD", hora local do negócio.
 */
export interface Horario {
  /** 0 = domingo ... 6 = sábado */
  diaSemana: number;
  abre: string;
  fecha: string;
}

export interface Marcacao {
  id: string;
  data: string;
  inicio: string;
  duracaoMin: number;
  cliente: string;
  servico: string;
  estado: "marcada" | "cancelada";
}

export const toMin = (h: string): number => {
  const [hh, mm] = h.split(":").map(Number);
  return hh * 60 + mm;
};
export const toHora = (m: number): string =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export function diaDaSemana(data: string): number {
  const [y, m, d] = data.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Devolve as horas de início livres num dia para um serviço com a duração dada. */
export function vagasLivres(opts: {
  data: string;
  duracaoMin: number;
  horarios: Horario[];
  marcacoes: Marcacao[];
  passoMin?: number;
}): string[] {
  const { data, duracaoMin, horarios, marcacoes, passoMin = 30 } = opts;
  const dia = diaDaSemana(data);
  const ocupados = marcacoes
    .filter((m) => m.data === data && m.estado === "marcada")
    .map((m) => [toMin(m.inicio), toMin(m.inicio) + m.duracaoMin] as const);

  const out: string[] = [];
  for (const h of horarios.filter((x) => x.diaSemana === dia)) {
    const fim = toMin(h.fecha);
    for (let t = toMin(h.abre); t + duracaoMin <= fim; t += passoMin) {
      const choca = ocupados.some(([a, b]) => t < b && t + duracaoMin > a);
      if (!choca) out.push(toHora(t));
    }
  }
  return out;
}

/** Quando enviar lembretes: 24 horas antes e 2 horas antes (só os que ainda estão no futuro). */
export function horasDosLembretes(inicio: Date, agora: Date): Date[] {
  return [24 * 60, 2 * 60]
    .map((min) => new Date(inicio.getTime() - min * 60_000))
    .filter((d) => d > agora);
}
