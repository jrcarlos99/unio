// Único lugar do front que conhece o JSON de GET /api/interests/received
// (D065 do back, ADR-015). Funções puras, testadas em
// tests/interessesRecebidos.mapping.test.ts.
import type {
  InteresseRecebido,
  InteresseRecebidoBack,
  InteressesRecebidos,
  PaginaInteressesRecebidosBack,
} from "../types/interesses.ts";

function textoOuNulo(valor: unknown): string | null {
  return typeof valor === "string" && valor.trim() !== "" ? valor.trim() : null;
}

function scoreOuNulo(valor: unknown): number | null {
  return typeof valor === "number" && Number.isFinite(valor) ? Math.max(0, Math.min(100, Math.round(valor))) : null;
}

export function interesseRecebidoDoBack(item: InteresseRecebidoBack): InteresseRecebido {
  return {
    id: String(item.userId),
    nome: textoOuNulo(item.name) ?? "Perfil sem nome",
    tipo: item.role === "STARTUP" ? "startup" : "investidor",
    segmento: textoOuNulo(item.segmento),
    estagio: textoOuNulo(item.estagio),
    localizacao: textoOuNulo(item.localizacao),
    compatibilidade: scoreOuNulo(item.scoreFinal),
    em: item.interestedAt,
  };
}

export function interessesRecebidosDoBack(pagina: PaginaInteressesRecebidosBack | null | undefined): InteressesRecebidos {
  const itens = Array.isArray(pagina?.items) ? pagina.items.map(interesseRecebidoDoBack) : [];
  const total = typeof pagina?.total === "number" ? Math.max(pagina.total, itens.length) : itens.length;
  return { total, itens };
}

// "A startup Tidalog demonstrou interesse em você"
export function textoInteresseRecebido(item: Pick<InteresseRecebido, "nome" | "tipo">) {
  const quem = item.tipo === "startup" ? `A startup ${item.nome}` : `O investidor ${item.nome}`;
  return `${quem} demonstrou interesse em você`;
}

// "Logística · Seed" (só o que o back mandou)
export function detalheInteresseRecebido(item: Pick<InteresseRecebido, "segmento" | "estagio">) {
  return [item.segmento, item.estagio].filter(Boolean).join(" · ");
}

// Perfil de quem demonstrou interesse
export function linkDoPerfil(item: Pick<InteresseRecebido, "id" | "tipo">) {
  const id = encodeURIComponent(item.id);
  return item.tipo === "startup" ? `/startups/${id}` : `/investidores/${id}`;
}

// ---------------------------------------------------------------------------
// Estado de "visto" (no navegador, por usuário, como as notificações de
// reunião). A chave inclui a data: se a pessoa desfizer e demonstrar de novo,
// o interesse volta a ser novo.
// ---------------------------------------------------------------------------

export function chaveVisto(item: Pick<InteresseRecebido, "id" | "em">) {
  return `${item.id}@${item.em}`;
}

// Quantos ainda não foram vistos. O que não veio na lista (além da página)
// conta como não visto.
export function contarNaoVistos(recebidos: InteressesRecebidos, vistos: readonly string[]) {
  const jaVistos = new Set(vistos);
  const naLista = recebidos.itens.filter((item) => !jaVistos.has(chaveVisto(item))).length;
  return naLista + Math.max(0, recebidos.total - recebidos.itens.length);
}

// Marca a lista atual como vista e esquece o que não está mais nela (o
// interesse virou match ou foi desfeito), para o registro não crescer à toa
export function marcarComoVistos(recebidos: InteressesRecebidos) {
  return recebidos.itens.map(chaveVisto);
}

// Mensagem amigável quando "Também tenho interesse" falha, pelo status HTTP
export function mensagemErroRetribuir(status: number | undefined) {
  if (status === 404) return "Este perfil não está mais disponível.";
  if (status === 409) return "Crie seu perfil antes de demonstrar interesse.";
  return "Não foi possível enviar seu interesse. Tente novamente.";
}

// Tira da lista quem acabou de ser retribuído
export function semOInteresse(recebidos: InteressesRecebidos, id: string): InteressesRecebidos {
  const itens = recebidos.itens.filter((item) => item.id !== id);
  const removidos = recebidos.itens.length - itens.length;
  return { total: Math.max(itens.length, recebidos.total - removidos), itens };
}
