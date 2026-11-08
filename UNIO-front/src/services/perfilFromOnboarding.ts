import type { Disponibilidade, FaixaCapital, Necessidade, TipoPerfil } from "../types";
import type { RespostasInvestidor, RespostasStartup } from "../types/onboarding";

// Converte as respostas do onboarding nos corpos de POST /api/profile/startup e
// POST /api/profile/investor. Só funções puras e tabelas: nada de rede aqui.
// Decisões e tabelas documentadas em docs/adr/ADR-002 (front) e D028 a D030
// (back, unio/docs/decisoes.md).
//
// Este arquivo não tem import em tempo de execução (só "import type") para os
// testes rodarem direto no Node (ver perfilFromOnboarding.test.ts).

// Limite das colunas VARCHAR(255) de startup_profiles / investor_profiles
export const TAMANHO_MAX_TEXTO = 255;

// Faixa escolhida -> capital procurado pela startup (R$). Usa o meio da faixa;
// "Acima de R$ 500 mil" não tem teto, então vai o piso.
export const CAPITAL_PROCURADO_POR_FAIXA: Readonly<Record<FaixaCapital, number>> = {
  "Até R$ 50 mil": 25_000,
  "R$ 50 a 200 mil": 125_000,
  "R$ 200 a 500 mil": 350_000,
  "Acima de R$ 500 mil": 500_000,
};

// Faixa escolhida -> ticket mínimo e máximo do investidor (R$)
export const TICKETS_POR_FAIXA: Readonly<Record<FaixaCapital, { minimo: number; maximo: number }>> = {
  "Até R$ 50 mil": { minimo: 10_000, maximo: 50_000 },
  "R$ 50 a 200 mil": { minimo: 50_000, maximo: 200_000 },
  "R$ 200 a 500 mil": { minimo: 200_000, maximo: 500_000 },
  "Acima de R$ 500 mil": { minimo: 500_000, maximo: 1_000_000 },
};

// Valores de TIPOS_PERFIL (data/options.ts). O tipo TipoPerfil garante que
// continuam batendo com a lista.
export const PERFIL_RISCO_MENTOR: TipoPerfil = "Mentor";
export const PERFIL_RISCO_INVESTIDOR: TipoPerfil = "Investidor Anjo";

// Enum DisponibilidadeMentoria do back
export type DisponibilidadeBack = "BAIXA" | "MEDIA" | "ALTA";

export const DISPONIBILIDADE_PARA_BACK: Readonly<Record<Disponibilidade, DisponibilidadeBack>> = {
  Baixa: "BAIXA",
  "Média": "MEDIA",
  Alta: "ALTA",
};

// regiaoInteresse é uma string só no back; o REGIAO_FIT separa por vírgula
export const SEPARADOR_REGIOES = ",";

// Só quem marcou "Investimento" busca capital; sem isso o campo não é enviado
export const NECESSIDADE_INVESTIMENTO: Necessidade = "Investimento";

export interface StartupCreatePayload {
  nome: string;
  segmento: string;
  estagio: string;
  localizacao: string;
  modeloNegocio: string;
  mercadoAlvo: string;
  capitalProcurado?: number;
  pitchCanvas?: string;
}

export interface InvestorCreatePayload {
  segmentosInteresse: string[];
  estagiosInteresse: string[];
  ticketMinimo?: number;
  ticketMaximo?: number;
  regiaoInteresse?: string;
  perfilRisco: TipoPerfil;
  disponibilidade?: DisponibilidadeBack;
}

export function montarPayloadStartup(respostas: RespostasStartup): StartupCreatePayload {
  const payload: StartupCreatePayload = {
    nome: respostas.nome.trim(),
    segmento: respostas.segmento ?? "",
    estagio: respostas.estagio ?? "",
    localizacao: respostas.localizacao.trim(),
    modeloNegocio: respostas.modeloNegocio ?? "",
    mercadoAlvo: respostas.mercadoAlvo.trim(),
  };

  const buscaInvestimento = respostas.necessidades.includes(NECESSIDADE_INVESTIMENTO);
  if (buscaInvestimento && respostas.capitalProcurado !== null) {
    payload.capitalProcurado = CAPITAL_PROCURADO_POR_FAIXA[respostas.capitalProcurado];
  }

  const pitch = respostas.pitch.trim();
  if (pitch) payload.pitchCanvas = pitch;

  return payload;
}

export function montarPayloadInvestidor(respostas: RespostasInvestidor): InvestorCreatePayload {
  const payload: InvestorCreatePayload = {
    segmentosInteresse: [...respostas.segmentosInteresse],
    estagiosInteresse: [...respostas.estagiosInteresse],
    perfilRisco: respostas.apenasMentor ? PERFIL_RISCO_MENTOR : PERFIL_RISCO_INVESTIDOR,
  };

  // Mentor sem faixa não envia ticket nenhum; com faixa (mentor ou não), envia os dois
  if (respostas.ticketMedio !== null) {
    const { minimo, maximo } = TICKETS_POR_FAIXA[respostas.ticketMedio];
    payload.ticketMinimo = minimo;
    payload.ticketMaximo = maximo;
  }

  if (respostas.disponibilidade !== null) {
    payload.disponibilidade = DISPONIBILIDADE_PARA_BACK[respostas.disponibilidade];
  }

  if (respostas.regioesInteresse.length > 0) {
    payload.regiaoInteresse = respostas.regioesInteresse.join(SEPARADOR_REGIOES);
  }

  return payload;
}

// ---------------------------------------------------------------------------
// Validação antes do envio: as mesmas regras do back (StartupCreateRequest,
// InvestorCreateRequest, ProfileService) e nunca undefined/NaN no corpo.
// Devolve as mensagens de erro; lista vazia = pode enviar.
// ---------------------------------------------------------------------------

function valoresInvalidos(payload: object): string[] {
  return Object.entries(payload)
    .filter(([, valor]) => valor === undefined || (typeof valor === "number" && !Number.isFinite(valor)))
    .map(([campo]) => `Valor inválido em ${campo}.`);
}

function textoObrigatorio(valor: string, rotulo: string, erros: string[]) {
  if (!valor.trim()) erros.push(`Informe ${rotulo}.`);
  else if (valor.length > TAMANHO_MAX_TEXTO) erros.push(`${rotulo} deve ter no máximo ${TAMANHO_MAX_TEXTO} caracteres.`);
}

function positivoSePresente(valor: number | undefined, rotulo: string, erros: string[]) {
  if (valor !== undefined && !(valor > 0)) erros.push(`${rotulo} deve ser positivo.`);
}

export function validarPayloadStartup(payload: StartupCreatePayload): string[] {
  const erros = valoresInvalidos(payload);
  textoObrigatorio(payload.nome, "o nome da startup", erros);
  textoObrigatorio(payload.segmento, "o segmento", erros);
  textoObrigatorio(payload.estagio, "o estágio", erros);
  textoObrigatorio(payload.localizacao, "a localização", erros);
  textoObrigatorio(payload.modeloNegocio, "o modelo de negócio", erros);
  textoObrigatorio(payload.mercadoAlvo, "o mercado-alvo", erros);
  positivoSePresente(payload.capitalProcurado, "Capital procurado", erros);
  return erros;
}

export function validarPayloadInvestidor(payload: InvestorCreatePayload): string[] {
  const erros = valoresInvalidos(payload);
  positivoSePresente(payload.ticketMinimo, "Ticket mínimo", erros);
  positivoSePresente(payload.ticketMaximo, "Ticket máximo", erros);
  if (
    payload.ticketMinimo !== undefined &&
    payload.ticketMaximo !== undefined &&
    payload.ticketMinimo > payload.ticketMaximo
  ) {
    erros.push("Ticket mínimo não pode ser maior que ticket máximo.");
  }
  // Colunas VARCHAR(255) guardadas como texto separado por vírgula
  if (payload.segmentosInteresse.join(",").length > TAMANHO_MAX_TEXTO) {
    erros.push("Selecione menos segmentos de interesse.");
  }
  if (payload.estagiosInteresse.join(",").length > TAMANHO_MAX_TEXTO) {
    erros.push("Selecione menos estágios de interesse.");
  }
  if ((payload.regiaoInteresse ?? "").length > TAMANHO_MAX_TEXTO) {
    erros.push("Selecione menos regiões de interesse.");
  }
  return erros;
}
