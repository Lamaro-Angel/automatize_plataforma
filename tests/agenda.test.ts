import { describe, expect, it } from "vitest";
import { diaDaSemana, horasDosLembretes, vagasLivres } from "../src/agenda.js";

const horarios = [{ diaSemana: 1, abre: "08:00", fecha: "10:00" }];

describe("agenda", () => {
  it("sabe o dia da semana", () => {
    expect(diaDaSemana("2026-11-16")).toBe(1); // segunda-feira
  });
  it("lista vagas e salta horas ocupadas", () => {
    const vagas = vagasLivres({
      data: "2026-11-16",
      duracaoMin: 30,
      horarios,
      marcacoes: [{ id: "a", data: "2026-11-16", inicio: "08:30", duracaoMin: 30, cliente: "x", servico: "y", estado: "marcada" }],
    });
    expect(vagas).toEqual(["08:00", "09:00", "09:30"]);
  });
  it("ignora marcações canceladas e serviços que não cabem", () => {
    const vagas = vagasLivres({
      data: "2026-11-16",
      duracaoMin: 90,
      horarios,
      marcacoes: [{ id: "a", data: "2026-11-16", inicio: "08:00", duracaoMin: 30, cliente: "x", servico: "y", estado: "cancelada" }],
    });
    expect(vagas).toEqual(["08:00", "08:30"]);
  });
  it("fechado ao domingo", () => {
    expect(vagasLivres({ data: "2026-11-15", duracaoMin: 30, horarios, marcacoes: [] })).toEqual([]);
  });
  it("lembretes 24h e 2h antes, só no futuro", () => {
    const inicio = new Date("2026-11-16T10:00:00Z");
    expect(horasDosLembretes(inicio, new Date("2026-11-14T00:00:00Z")).map((d) => d.toISOString())).toEqual([
      "2026-11-15T10:00:00.000Z",
      "2026-11-16T08:00:00.000Z",
    ]);
    expect(horasDosLembretes(inicio, new Date("2026-11-16T00:00:00Z"))).toHaveLength(1);
  });
});
