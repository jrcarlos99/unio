// Interesses recebidos (D065 do back, ADR-015):
// - GET /api/interests/received?limit=: quem demonstrou interesse em mim e
//   ainda não teve o interesse retribuído (sem e-mail: o contato só sai
//   depois do match, D052);
// - GET /api/interests/received/count: o mesmo total, leve, para o sino;
// - retribuir é o mesmo PUT /api/interests/{id} do "Tenho interesse": se o
//   outro lado já tinha demonstrado, vira match na hora.
// O "visto" fica no navegador, por usuário, como nas notificações de reunião
// (estado local, não é mock: ADR-011).
import type { StatusInteresse } from "../types/discovery.ts";
import type {
  ContagemInteressesRecebidosBack,
  InteresseRetribuido,
  InteressesRecebidos,
  PaginaInteressesRecebidosBack,
} from "../types/interesses.ts";
import api from "./api.ts";
import { statusDoInteresseEnviado, type InteresseBack } from "./discovery.mapping.ts";
import { interessesRecebidosDoBack } from "./interessesRecebidos.mapping.ts";

// O sino mostra no máximo isto; o resto entra no total
export const LIMITE_SINO = 20;

export async function listarInteressesRecebidos(limite = LIMITE_SINO): Promise<InteressesRecebidos> {
  const { data } = await api.get<PaginaInteressesRecebidosBack>("/api/interests/received", {
    params: { limit: limite, offset: 0 },
  });
  return interessesRecebidosDoBack(data);
}

export async function contarInteressesRecebidos(): Promise<number> {
  const { data } = await api.get<ContagemInteressesRecebidosBack>("/api/interests/received/count");
  return typeof data?.total === "number" ? data.total : 0;
}

// "Também tenho interesse"
export async function retribuirInteresse(id: string): Promise<Exclude<StatusInteresse, "nenhum">> {
  if (!/^\d+$/.test(id)) throw new Error("Perfil inválido");
  const { data } = await api.put<InteresseBack>(`/api/interests/${id}`);
  const status = statusDoInteresseEnviado(data) === "match" ? "match" : "enviado";
  avisarRetribuicao({ id, status });
  return status;
}

// ---------------------------------------------------------------------------
// Visto (localStorage por usuário; try/catch: pode faltar)
// ---------------------------------------------------------------------------

const chaveVistos = (userKey: string) => `unio_interesses_vistos_${userKey}`;

export function lerVistos(userKey: string): string[] {
  if (!userKey) return [];
  try {
    const bruto = localStorage.getItem(chaveVistos(userKey));
    const lista: unknown = bruto ? JSON.parse(bruto) : [];
    return Array.isArray(lista) ? lista.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function gravarVistos(userKey: string, vistos: string[]) {
  if (!userKey) return;
  try {
    localStorage.setItem(chaveVistos(userKey), JSON.stringify(vistos));
  } catch {
    // sem armazenamento: o "visto" vale só nesta visita
  }
}

// ---------------------------------------------------------------------------
// Aviso de retribuição: o sino e as listas (Descobrir, Investidores, perfis,
// Salvos) ficam em dia sem recarregar a página
// ---------------------------------------------------------------------------

type Ouvinte = (evento: InteresseRetribuido) => void;
const ouvintes = new Set<Ouvinte>();

export function avisarRetribuicao(evento: InteresseRetribuido) {
  for (const ouvinte of ouvintes) ouvinte(evento);
}

export function assinarRetribuicoes(ouvinte: Ouvinte): () => void {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}
