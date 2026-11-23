import type { StartupDescoberta } from "../types/discovery";
import type { InvestidorDescoberta } from "../types/investidores";
import { formatarMoeda } from "./formatoDescoberta.ts";

// Textos dos cards e perfis que dependem de campos que o back pode não ter
// (ADR-008). Sem o dado, devolvem "" ou null e a tela esconde o trecho.

// "Recife, PE", "Recife" ou ""
export function localDaStartup(startup: Pick<StartupDescoberta, "cidade" | "uf">): string {
  return [startup.cidade, startup.uf].filter(Boolean).join(", ");
}

// Cidade ou, sem ela, a região de interesse do cadastro
export function localDoInvestidor(investidor: Pick<InvestidorDescoberta, "cidade" | "uf" | "regiaoTexto">): string {
  const local = [investidor.cidade, investidor.uf].filter(Boolean).join(", ");
  return local || (investidor.regiaoTexto ?? "");
}

// Capital procurado do perfil do back
export function capitalDaStartup(startup: Pick<StartupDescoberta, "capitalProcurado">): number | null {
  return startup.capitalProcurado ?? null;
}

export function textoCapital(startup: Pick<StartupDescoberta, "capitalProcurado">): string {
  const capital = capitalDaStartup(startup);
  return capital === null ? "Não informado" : `Busca ${formatarMoeda(capital)}`;
}

export function textoDisponibilidade(disponibilidade: string | null | undefined): string {
  return disponibilidade ?? "Não informada";
}

// Junta partes não vazias com " • " (subtítulos dos cards)
export function juntarPartes(...partes: (string | null | undefined)[]): string {
  return partes.filter((parte): parte is string => Boolean(parte)).join(" • ");
}
