// Único lugar do front que conhece o JSON do back da descoberta, do interesse,
// do match e dos salvos (/api/discovery, /api/interests, /api/saved; D045 a
// D053 do back, ADR-008). Funções puras: sem axios e sem import.meta, para
// rodar nos testes com node (por isso os imports de valor terminam em .ts).
//
// Regra: o que o back não tem fica null ou vazio e a tela esconde. Nada aqui
// inventa dado (fundação, equipe, canvas, rodada, tempo de resposta...).
import type { DadosUnio } from "../types/contato";
import type {
  Compatibilidade,
  Motivo,
  NotasCompatibilidade,
  RefScorecard,
  StartupDescoberta,
  StartupRecomendada,
  StatusInteresse,
} from "../types/discovery";
import type { Disponibilidade, Estagio, RegiaoInteresse, Segmento, TipoPerfil } from "../types/index";
import type { InvestidorDescoberta, InvestidorRecomendado } from "../types/investidores";
import { juntarComE } from "../utils/formatoDescoberta.ts";

// ============================================================
// JSON do back
// ============================================================

export type InterestStatusBack = "NONE" | "SENT" | "RECEIVED" | "MATCH";

export interface PerfilPublicoBack {
  // Startup
  segmento?: string | null;
  estagio?: string | null;
  localizacao?: string | null;
  modeloNegocio?: string | null;
  mercadoAlvo?: string | null;
  capitalProcurado?: number | null;
  pitchCanvas?: string | null;
  // Investidor
  segmentosInteresse?: string[] | null;
  estagiosInteresse?: string[] | null;
  ticketMinimo?: number | null;
  ticketMaximo?: number | null;
  perfilRisco?: string | null;
  disponibilidade?: string | null;
  regiaoInteresse?: string | null;
}

export interface FatorBack {
  type?: string;
  rank?: number;
  dimension?: string | null;
  factorCode: string;
  factorLabel?: string | null;
  factorScore: number;
  weightApplied?: number;
  explanation?: string | null;
}

export interface DimensaoBack {
  dimension: string;
  score: number;
  weight?: number;
  weightedScore?: number;
}

export interface ItemDescobertaBack {
  userId: number;
  name: string;
  role: "STARTUP" | "INVESTOR";
  profile: PerfilPublicoBack | null;
  scoreFinal: number | null;
  classification: string | null;
  dimensions: DimensaoBack[] | null;
  topPositiveFactors: FatorBack[] | null;
  topAttentionFactors: FatorBack[] | null;
  nextStep: { code: string; text: string } | null;
  scorecard: RefScorecard | null;
  interestStatus: InterestStatusBack;
  saved: boolean;
  calculatedAt: string | null;
}

export interface PaginaDescobertaBack {
  total: number;
  limit: number;
  offset: number;
  notCalculated: number;
  items: ItemDescobertaBack[];
}

export interface ConexaoBack {
  userId: number;
  name: string;
  role: "STARTUP" | "INVESTOR";
  matchedAt: string | null;
  savedAt: string | null;
  scoreFinal: number | null;
  classification: string | null;
  interestStatus: InterestStatusBack;
  saved: boolean;
  profile: PerfilPublicoBack | null;
  contact?: { email?: string | null } | null;
}

export interface InteresseBack {
  status: "ENVIADO" | "MATCH";
  matchedAt: string | null;
}

export interface RetiradaInteresseBack {
  status: InterestStatusBack;
  canceledMeetings: number;
}

export type AcaoFeedback = "VIEWED" | "INTERESTED" | "NOT_INTERESTED";

// ============================================================
// Estado do interesse
// ============================================================

// RECEIVED (o outro lado demonstrou interesse) aparece como "nenhum": o botão
// "Tenho interesse" continua disponível e, se clicado, vira match na hora.
export function statusInteresseDoBack(status: InterestStatusBack | string | null | undefined): StatusInteresse {
  if (status === "MATCH") return "match";
  if (status === "SENT") return "enviado";
  return "nenhum";
}

export function statusDoInteresseEnviado(resposta: InteresseBack): StatusInteresse {
  return resposta.status === "MATCH" ? "match" : "enviado";
}

// ============================================================
// Compatibilidade e motivos
// ============================================================

// Dimensões do scorecard → critérios exibidos. Disponibilidade não existe no
// scorecard e modelo de negócio não existe na tela: ficam de fora.
const CRITERIO_DA_DIMENSAO: Partial<Record<string, keyof NotasCompatibilidade>> = {
  SEGMENTO: "segmento",
  ESTAGIO: "estagio",
  CAPITAL: "ticket",
  REGIAO: "regiao",
};

const ROTULO_CLASSIFICACAO: Record<string, string> = {
  EXCELENTE: "Excelente",
  FORTE: "Forte",
  MODERADO: "Moderado",
  FRACO: "Fraco",
  SEM_MATCH: "Sem match",
  DADOS_INSUFICIENTES: "Dados insuficientes",
};

export function rotuloClassificacao(classificacao: string | null | undefined): string | null {
  if (!classificacao) return null;
  return ROTULO_CLASSIFICACAO[classificacao] ?? classificacao;
}

function arredondar(valor: number | null | undefined) {
  return typeof valor === "number" && Number.isFinite(valor) ? Math.round(valor) : 0;
}

export function compatibilidadeDoBack(
  scoreFinal: number | null | undefined,
  classificacao: string | null | undefined,
  dimensoes: DimensaoBack[] | null | undefined = [],
  proximoPasso: { code: string; text: string } | null | undefined = null,
): Compatibilidade {
  const notas: Partial<NotasCompatibilidade> = {};
  for (const dimensao of dimensoes ?? []) {
    const criterio = CRITERIO_DA_DIMENSAO[dimensao.dimension];
    if (criterio) notas[criterio] = arredondar(dimensao.score);
  }
  const passo = proximoPasso && proximoPasso.code !== "NO_ACTION_NEEDED" ? proximoPasso.text : null;
  return {
    total: Math.max(0, Math.min(100, arredondar(scoreFinal))),
    notas,
    classificacao: classificacao ?? null,
    proximoPasso: passo,
    fonte: "scorecard",
  };
}

// "Por que você viu": só os fatores a favor (factorScore >= 70, mesmo corte do
// ScorePersistenceService). `quemVe` muda o texto de cada critério.
export function motivosDoBack(item: ItemDescobertaBack, quemVe: "investidor" | "startup"): Motivo[] {
  const perfil = item.profile ?? {};
  const motivos: Motivo[] = [];
  for (const fator of item.topPositiveFactors ?? []) {
    if (fator.factorScore < 70) continue;
    const motivo = motivoDoFator(fator, perfil, quemVe);
    if (motivo) motivos.push(motivo);
  }
  if (motivos.length === 0) {
    const rotulo = rotuloClassificacao(item.classification);
    if (rotulo) {
      motivos.push([{ texto: "Classificação do scorecard: " }, { texto: rotulo, forte: true }]);
    }
  }
  return motivos;
}

function motivoDoFator(fator: FatorBack, perfil: PerfilPublicoBack, quemVe: "investidor" | "startup"): Motivo | null {
  if (quemVe === "investidor") {
    switch (fator.factorCode) {
      case "SEGMENTO_MATCH":
        return perfil.segmento
          ? [{ texto: "Atua em " }, { texto: perfil.segmento, forte: true }, { texto: ", um dos segmentos da sua tese" }]
          : [{ texto: "Segmento dentro da sua tese" }];
      case "ESTAGIO_FIT":
        return perfil.estagio
          ? [{ texto: "Estágio " }, { texto: perfil.estagio, forte: true }, { texto: " dentro da sua tese" }]
          : [{ texto: "Estágio dentro da sua tese" }];
      case "CAPITAL_FIT":
        return [{ texto: "Capital procurado " }, { texto: "dentro do seu ticket", forte: true }];
      case "REGIAO_FIT":
        return perfil.localizacao
          ? [{ texto: "Fica em " }, { texto: perfil.localizacao, forte: true }, { texto: ", na sua região de interesse" }]
          : [{ texto: "Na sua região de interesse" }];
      default:
        return null;
    }
  }
  switch (fator.factorCode) {
    case "SEGMENTO_MATCH":
      return [{ texto: "Investe no " }, { texto: "segmento da sua startup", forte: true }];
    case "ESTAGIO_FIT":
      return [{ texto: "Apoia startups no " }, { texto: "seu estágio", forte: true }];
    case "CAPITAL_FIT":
      return [{ texto: "Ticket compatível com o " }, { texto: "capital que você procura", forte: true }];
    case "REGIAO_FIT":
      return perfil.regiaoInteresse
        ? [{ texto: "Busca startups em " }, { texto: perfil.regiaoInteresse, forte: true }]
        : [{ texto: "Busca startups na sua região" }];
    default:
      return null;
  }
}

// ============================================================
// Perfis
// ============================================================

// "Recife, PE" / "Recife - PE" / "Recife/PE" → cidade e UF
export function separarLocalizacao(texto: string | null | undefined) {
  const limpo = (texto ?? "").trim();
  const partes = limpo.match(/^(.*?)[\s,/-]+([A-Za-z]{2})$/);
  return partes ? { cidade: partes[1].trim(), uf: partes[2].toUpperCase() } : { cidade: limpo, uf: "" };
}

const DISPONIBILIDADE_DO_BACK: Record<string, Disponibilidade> = {
  BAIXA: "Baixa",
  MEDIA: "Média",
  ALTA: "Alta",
};

const REGIOES_CONHECIDAS: RegiaoInteresse[] = [
  "Recife / Porto Digital",
  "Pernambuco",
  "Nordeste",
  "Todo o Brasil",
  "Aberto a startups remotas",
];

// perfilRisco do back → tipo do front. "Capital de risco" e outros valores
// livres aparecem como "Investidor Anjo", a mesma política do back (D047).
export function tipoDoPerfilRisco(perfilRisco: string | null | undefined): TipoPerfil {
  const texto = (perfilRisco ?? "").trim().toLowerCase();
  if (texto === "mentor") return "Mentor";
  if (texto === "ambos") return "Ambos";
  return "Investidor Anjo";
}

function textoOuVazio(valor: string | null | undefined) {
  return (valor ?? "").trim();
}

function regioesDoTexto(texto: string | null | undefined): RegiaoInteresse[] {
  return textoOuVazio(texto)
    .split(",")
    .map((parte) => parte.trim())
    .filter((parte): parte is RegiaoInteresse => (REGIOES_CONHECIDAS as string[]).includes(parte));
}

export function startupDoBack(userId: number, nome: string, perfil: PerfilPublicoBack | null): StartupDescoberta {
  const dados = perfil ?? {};
  const { cidade, uf } = separarLocalizacao(dados.localizacao);
  const segmento = textoOuVazio(dados.segmento) as Segmento;
  return {
    id: String(userId),
    nome,
    segmento,
    segmentosSecundarios: [],
    categoria: segmento,
    estagio: textoOuVazio(dados.estagio) as Estagio,
    cidade,
    uf,
    remota: false,
    fundacao: null,
    verificada: false,
    descricao: textoOuVazio(dados.pitchCanvas),
    tags: [],
    necessidades: [],
    tamanhoEquipe: null,
    modeloNegocio: textoOuVazio(dados.modeloNegocio),
    mercadoAlvo: textoOuVazio(dados.mercadoAlvo),
    canvas: null,
    metrica: null,
    capitalProcurado: typeof dados.capitalProcurado === "number" ? dados.capitalProcurado : null,
    corLogo: "neutro",
  };
}

// Frase da tese montada só com dados reais do perfil (segmentos e estágios)
export function teseDoInvestidor(segmentos: string[], estagios: string[]): string {
  const partes: string[] = [];
  if (segmentos.length > 0) partes.push(`Investe em ${juntarComE(segmentos)}`);
  if (estagios.length > 0) partes.push(`${partes.length > 0 ? "estágios" : "Estágios"} ${juntarComE(estagios)}`);
  return partes.length > 0 ? `${partes.join(", ")}.` : "";
}

export function investidorDoBack(userId: number, nome: string, perfil: PerfilPublicoBack | null): InvestidorDescoberta {
  const dados = perfil ?? {};
  const segmentos = (dados.segmentosInteresse ?? []).filter(Boolean) as Segmento[];
  const estagios = (dados.estagiosInteresse ?? []).filter(Boolean) as Estagio[];
  const ticketMin = typeof dados.ticketMinimo === "number" ? dados.ticketMinimo : null;
  const ticketMax = typeof dados.ticketMaximo === "number" ? dados.ticketMaximo : null;
  const temTicket = ticketMin !== null && ticketMax !== null;
  return {
    id: String(userId),
    nome,
    tipo: tipoDoPerfilRisco(dados.perfilRisco),
    cidade: "",
    uf: "",
    verificado: false,
    tese: teseDoInvestidor(segmentos, estagios),
    segmentosInteresse: segmentos,
    estagiosInteresse: estagios,
    ticketMin: temTicket ? ticketMin : null,
    ticketMax: temTicket ? ticketMax : null,
    regioesInteresse: regioesDoTexto(dados.regiaoInteresse),
    regiaoTexto: textoOuVazio(dados.regiaoInteresse) || null,
    disponibilidade: dados.disponibilidade ? (DISPONIBILIDADE_DO_BACK[dados.disponibilidade] ?? null) : null,
    portfolio: null,
    bio: "",
    tesePrincipal: segmentos[0] ?? "",
    buscaEmStartups: [],
    comoApoia: [],
    desde: null,
    portfolioPortoDigital: null,
    tempoResposta: null,
  };
}

// ============================================================
// Itens das telas
// ============================================================

export function startupRecomendadaDoBack(item: ItemDescobertaBack): StartupRecomendada {
  return {
    startup: startupDoBack(item.userId, item.name, item.profile),
    compatibilidade: compatibilidadeDoBack(item.scoreFinal, item.classification, item.dimensions, item.nextStep),
    statusInteresse: statusInteresseDoBack(item.interestStatus),
    salvo: Boolean(item.saved),
    popularidade: null,
    scorecard: item.scorecard ?? null,
  };
}

export function investidorRecomendadoDoBack(item: ItemDescobertaBack): InvestidorRecomendado {
  return {
    investidor: investidorDoBack(item.userId, item.name, item.profile),
    compatibilidade: compatibilidadeDoBack(item.scoreFinal, item.classification, item.dimensions, item.nextStep),
    statusInteresse: statusInteresseDoBack(item.interestStatus),
    salvo: Boolean(item.saved),
    popularidade: null,
    scorecard: item.scorecard ?? null,
  };
}

// Matches e salvos vêm resumidos: só o score total (sem notas por critério)
export function startupDeConexao(conexao: ConexaoBack): StartupRecomendada {
  return {
    startup: startupDoBack(conexao.userId, conexao.name, conexao.profile),
    compatibilidade: compatibilidadeDoBack(conexao.scoreFinal, conexao.classification),
    statusInteresse: statusInteresseDoBack(conexao.interestStatus),
    salvo: Boolean(conexao.saved),
    popularidade: null,
    scorecard: null,
  };
}

export function investidorDeConexao(conexao: ConexaoBack): InvestidorRecomendado {
  return {
    investidor: investidorDoBack(conexao.userId, conexao.name, conexao.profile),
    compatibilidade: compatibilidadeDoBack(conexao.scoreFinal, conexao.classification),
    statusInteresse: statusInteresseDoBack(conexao.interestStatus),
    salvo: Boolean(conexao.saved),
    popularidade: null,
    scorecard: null,
  };
}

// Contato depois do match (D052): só e-mail. Telefone e WhatsApp não existem
// no back e ficam ausentes (a tela esconde os botões).
export function contatoDeConexao(conexao: ConexaoBack): DadosUnio {
  const email = textoOuVazio(conexao.contact?.email);
  return {
    contato: email ? { email } : {},
    matchEm: conexao.matchedAt ?? null,
  };
}

// ============================================================
// Parâmetros e feedback
// ============================================================

export interface FiltrosDescobertaBack {
  busca?: string | null;
  segmento?: string | null;
  estagio?: string | null;
  tipo?: string | null;
}

export const LIMITE_POR_PAGINA = 100;

export function parametrosDescoberta(filtros: FiltrosDescobertaBack = {}, offset = 0): Record<string, string | number> {
  const parametros: Record<string, string | number> = { limit: LIMITE_POR_PAGINA, offset };
  const busca = textoOuVazio(filtros.busca);
  if (busca) parametros.q = busca;
  if (filtros.segmento) parametros.segmento = filtros.segmento;
  if (filtros.estagio) parametros.estagio = filtros.estagio;
  if (filtros.tipo) parametros.tipo = filtros.tipo;
  return parametros;
}

export function corpoFeedback(scorecard: RefScorecard, acao: AcaoFeedback) {
  return {
    startupId: scorecard.startupId,
    investorId: scorecard.investorId,
    scorePolicyId: scorecard.scorePolicyId,
    action: acao,
  };
}

// 409 FEEDBACK_DUPLICATE (mesma ação no mesmo par em menos de 5 minutos) é
// sucesso silencioso: o evento já está gravado
export function feedbackJaGravado(status: number | undefined, mensagem: unknown): boolean {
  return status === 409 && (mensagem === undefined || mensagem === null || String(mensagem).includes("FEEDBACK_DUPLICATE"));
}
