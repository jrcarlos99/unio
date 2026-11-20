import { ESTAGIOS } from "../data/options";
import type {
  Disponibilidade,
  Estagio,
  FaixaCapital,
  Necessidade,
  RegiaoInteresse,
  Segmento,
} from "../types";
import type {
  CompatibilidadeLocal,
  CriterioCompatibilidade,
  Motivo,
  NotasCompatibilidade,
  StartupDescobertaCompleta,
  TeseInvestidor,
} from "../types/discovery";
import type { RespostasInvestidor } from "../types/onboarding";
import { formatarFaixaTicket, formatarMoeda } from "../utils/formatoDescoberta";

// SÓ NO MODO MOCK: compatibilidade investidor × startup calculada no front,
// com regras simples. No modo API o score vem do scorecard do back
// (/api/discovery, ADR-008) e este arquivo não é usado para calcular. Funções puras e simétricas: a mesma conta serve ao
// investidor (Descobrir) e à startup (Investidores). Trocar por uma chamada
// HTTP não muda as telas, porque só os serviços (discoveryService e
// investidoresService) chamam este arquivo.

// Pesos de cada critério na média ponderada (somam 1)
export const PESOS: NotasCompatibilidade = {
  segmento: 0.35,
  estagio: 0.2,
  ticket: 0.2,
  regiao: 0.15,
  disponibilidade: 0.1,
};

// Nota usada quando o investidor ainda não respondeu aquele critério
const NOTA_NEUTRA = 60;
// A partir desta nota o critério vira um motivo em "Por que você viu esta startup"
const NOTA_MOTIVO = 85;

const UFS_NORDESTE = ["AL", "BA", "CE", "MA", "PB", "PE", "PI", "RN", "SE"];

// Intervalo em reais [mínimo, máximo]
export type Faixa = [number, number];

// Limites (em reais) de cada faixa de capital do onboarding
const LIMITES_FAIXA: Record<FaixaCapital, Faixa> = {
  "Até R$ 50 mil": [0, 50_000],
  "R$ 50 a 200 mil": [50_000, 200_000],
  "R$ 200 a 500 mil": [200_000, 500_000],
  "Acima de R$ 500 mil": [500_000, Number.POSITIVE_INFINITY],
};

// Faixa do onboarding ou valor exato (perfil do back) → intervalo
export function faixaDeCapital(capital: FaixaCapital | number | null | undefined): Faixa | null {
  if (capital === null || capital === undefined) return null;
  return typeof capital === "number" ? [capital, capital] : LIMITES_FAIXA[capital];
}

// Os dois lados do cálculo, independentes de onde os dados vêm (respostas
// do onboarding, perfil do back ou mock)
export interface LadoInvestidor {
  segmentosInteresse: Segmento[];
  estagiosInteresse: Estagio[];
  // null = não informado
  ticket: Faixa | null;
  apenasMentor: boolean;
  disponibilidade: Disponibilidade | null;
  regioesInteresse: RegiaoInteresse[];
}

export interface LadoStartup {
  segmento: Segmento | null;
  segmentosSecundarios: Segmento[];
  estagio: Estagio | null;
  cidade: string;
  uf: string;
  remota: boolean;
  necessidades: Necessidade[];
  // Quanto a startup busca; null = não informado
  capital: Faixa | null;
}

export const TESE_PADRAO: TeseInvestidor = {
  segmentosInteresse: [],
  estagiosInteresse: [],
  ticketMedio: null,
  apenasMentor: false,
  disponibilidade: null,
  regioesInteresse: [],
};

export function investidorDaTese(tese: TeseInvestidor): LadoInvestidor {
  return {
    segmentosInteresse: tese.segmentosInteresse,
    estagiosInteresse: tese.estagiosInteresse,
    ticket: faixaDeCapital(tese.ticketMedio),
    apenasMentor: tese.apenasMentor,
    disponibilidade: tese.disponibilidade,
    regioesInteresse: tese.regioesInteresse,
  };
}

export function ladoDaStartupDescoberta(startup: StartupDescobertaCompleta): LadoStartup {
  return {
    segmento: startup.segmento,
    segmentosSecundarios: startup.segmentosSecundarios,
    estagio: startup.estagio,
    cidade: startup.cidade,
    uf: startup.uf,
    remota: startup.remota,
    necessidades: startup.necessidades,
    capital: [startup.captacao.meta, startup.captacao.meta],
  };
}

// Respostas do onboarding (podem estar incompletas ou nem existir) → tese
export function teseDasRespostas(respostas: Partial<RespostasInvestidor> | null): TeseInvestidor {
  return {
    segmentosInteresse: respostas?.segmentosInteresse ?? [],
    estagiosInteresse: respostas?.estagiosInteresse ?? [],
    ticketMedio: respostas?.ticketMedio ?? null,
    apenasMentor: respostas?.apenasMentor ?? false,
    disponibilidade: respostas?.disponibilidade ?? null,
    regioesInteresse: respostas?.regioesInteresse ?? [],
  };
}

function notaSegmento(tese: LadoInvestidor, startup: LadoStartup) {
  if (tese.segmentosInteresse.length === 0 || !startup.segmento) return NOTA_NEUTRA;
  if (tese.segmentosInteresse.includes(startup.segmento)) return 100;
  if (startup.segmentosSecundarios.some((s) => tese.segmentosInteresse.includes(s))) return 70;
  return 25;
}

function notaEstagio(tese: LadoInvestidor, startup: LadoStartup) {
  if (tese.estagiosInteresse.length === 0 || !startup.estagio) return NOTA_NEUTRA;
  if (tese.estagiosInteresse.includes(startup.estagio)) return 100;
  // Estágio vizinho de um dos preferidos (ex.: prefere MVP, startup em Operação)
  const posicao = ESTAGIOS.indexOf(startup.estagio);
  const vizinho = tese.estagiosInteresse.some(
    (estagio) => Math.abs(ESTAGIOS.indexOf(estagio) - posicao) === 1,
  );
  return vizinho ? 60 : 25;
}

function notaTicket(tese: LadoInvestidor, startup: LadoStartup) {
  // Quem só mentora não investe: o ticket não pesa contra nem a favor
  if (tese.apenasMentor) return 80;
  if (!tese.ticket || !startup.capital) return NOTA_NEUTRA;
  const [ticketMin, ticketMax] = tese.ticket;
  const [capitalMin, capitalMax] = startup.capital;
  // Sobreposição: quanto da faixa buscada pela startup o ticket cobre (valor
  // exato dentro do ticket = 100)
  const inicio = Math.max(ticketMin, capitalMin);
  const fim = Math.min(ticketMax, capitalMax);
  if (fim >= inicio) {
    const cobertura = capitalMax === capitalMin ? 1 : (fim - inicio) / (capitalMax - capitalMin);
    return Math.round(70 + 30 * Math.min(1, cobertura));
  }
  const proporcao = capitalMin > ticketMax ? ticketMax / capitalMin : capitalMax / ticketMin;
  return Math.max(20, Math.round(proporcao * 100));
}

function notaPorRegiao(regiao: RegiaoInteresse, startup: LadoStartup) {
  const nordeste = UFS_NORDESTE.includes(startup.uf);
  switch (regiao) {
    case "Recife / Porto Digital":
      if (startup.cidade === "Recife") return 100;
      return startup.uf === "PE" ? 70 : nordeste ? 50 : 0;
    case "Pernambuco":
      return startup.uf === "PE" ? 100 : nordeste ? 60 : 0;
    case "Nordeste":
      return nordeste ? 100 : 0;
    case "Todo o Brasil":
      return 90;
    case "Aberto a startups remotas":
      return startup.remota ? 85 : 0;
  }
}

function notaRegiao(tese: LadoInvestidor, startup: LadoStartup) {
  if (tese.regioesInteresse.length === 0) return NOTA_NEUTRA;
  return Math.max(25, ...tese.regioesInteresse.map((r) => notaPorRegiao(r, startup)));
}

// Startups que pedem mentoria combinam mais com investidores com mais horas
function notaDisponibilidade(tese: LadoInvestidor, startup: LadoStartup) {
  const querMentoria = startup.necessidades.includes("Mentoria");
  switch (tese.disponibilidade) {
    case "Alta":
      return 100;
    case "Média":
      return querMentoria ? 80 : 100;
    case "Baixa":
      return querMentoria ? 50 : 85;
    default:
      return 70;
  }
}

export function calcularCompatibilidade(tese: LadoInvestidor, startup: LadoStartup): CompatibilidadeLocal {
  const notas: NotasCompatibilidade = {
    segmento: notaSegmento(tese, startup),
    estagio: notaEstagio(tese, startup),
    ticket: notaTicket(tese, startup),
    regiao: notaRegiao(tese, startup),
    disponibilidade: notaDisponibilidade(tese, startup),
  };
  const criterios = Object.keys(PESOS) as CriterioCompatibilidade[];
  const total = Math.round(criterios.reduce((soma, c) => soma + notas[c] * PESOS[c], 0));
  return { total, notas, fonte: "local" };
}

// Motivos em linguagem natural para "Por que você viu esta startup". Só
// entram os critérios que pesaram a favor.
export function explicarCompatibilidade(
  tese: TeseInvestidor,
  startup: StartupDescobertaCompleta,
  { notas }: CompatibilidadeLocal,
): Motivo[] {
  const motivos: Motivo[] = [];

  if (notas.segmento === 100) {
    motivos.push([
      { texto: "Atua em " },
      { texto: startup.segmento, forte: true },
      { texto: ", um dos segmentos da sua tese" },
    ]);
  } else if (notas.segmento >= 70) {
    const emComum = startup.segmentosSecundarios.find((s) => tese.segmentosInteresse.includes(s));
    if (emComum) {
      motivos.push([
        { texto: "Também atua em " },
        { texto: emComum, forte: true },
        { texto: ", um dos segmentos da sua tese" },
      ]);
    }
  }

  if (notas.ticket === 100 && tese.ticketMedio && !tese.apenasMentor) {
    motivos.push([
      { texto: "Busca " },
      { texto: formatarMoeda(startup.captacao.meta), forte: true },
      { texto: `, dentro do seu ticket médio (${tese.ticketMedio})` },
    ]);
  }

  // Região com a melhor nota, desde que seja uma preferência específica
  const lado = ladoDaStartupDescoberta(startup);
  const melhorRegiao = tese.regioesInteresse
    .filter((r) => r !== "Todo o Brasil")
    .map((regiao) => ({ regiao, nota: notaPorRegiao(regiao, lado) }))
    .sort((a, b) => b.nota - a.nota)[0];
  if (melhorRegiao && melhorRegiao.nota >= NOTA_MOTIVO) {
    motivos.push(
      melhorRegiao.regiao === "Aberto a startups remotas"
        ? [
            { texto: "Opera " },
            { texto: "remotamente", forte: true },
            { texto: ", e você está aberto a startups remotas" },
          ]
        : [
            { texto: "Localizada em " },
            { texto: `${startup.cidade}, ${startup.uf}`, forte: true },
            { texto: `, na sua região de interesse (${melhorRegiao.regiao})` },
          ],
    );
  }

  if (notas.estagio === 100) {
    motivos.push([
      { texto: "Está em " },
      { texto: startup.estagio, forte: true },
      { texto: ", um dos estágios que você acompanha" },
    ]);
  }

  if (startup.necessidades.includes("Mentoria") && notas.disponibilidade >= 80) {
    motivos.push([
      { texto: "Busca " },
      { texto: "mentoria", forte: true },
      { texto: ", e você tem disponibilidade para acompanhar" },
    ]);
  }

  if (motivos.length === 0) {
    motivos.push([
      { texto: "Está entre as startups " },
      { texto: "mais bem avaliadas", forte: true },
      { texto: " da plataforma. Complete sua tese para recomendações mais precisas" },
    ]);
  }
  return motivos;
}

// Motivos para "Por que você viu este investidor" (lado da startup). Usa as
// mesmas notas de calcularCompatibilidade; só entram os critérios a favor.
export function explicarParaStartup(
  investidor: LadoInvestidor,
  startup: LadoStartup,
  { notas }: CompatibilidadeLocal,
): Motivo[] {
  const motivos: Motivo[] = [];

  if (notas.segmento === 100 && startup.segmento) {
    motivos.push([
      { texto: investidor.apenasMentor ? "Apoia startups de " : "Investe em " },
      { texto: startup.segmento, forte: true },
      { texto: ", o segmento da sua startup" },
    ]);
  }

  if (notas.ticket >= 85 && investidor.ticket && !investidor.apenasMentor) {
    const [minimo, maximo] = investidor.ticket;
    motivos.push([
      { texto: "Ticket de " },
      { texto: formatarFaixaTicket(minimo, maximo, " a "), forte: true },
      { texto: ", compatível com o capital que você busca" },
    ]);
  }

  const melhorRegiao = investidor.regioesInteresse
    .filter((r) => r !== "Todo o Brasil")
    .map((regiao) => ({ regiao, nota: notaPorRegiao(regiao, startup) }))
    .sort((a, b) => b.nota - a.nota)[0];
  if (melhorRegiao && melhorRegiao.nota >= NOTA_MOTIVO) {
    motivos.push([
      { texto: "Busca startups na região " },
      { texto: melhorRegiao.regiao, forte: true },
      { texto: startup.cidade ? `, onde fica a sua startup (${startup.cidade}, ${startup.uf})` : "" },
    ]);
  }

  if (notas.estagio === 100 && startup.estagio) {
    motivos.push([
      { texto: "Acompanha startups em " },
      { texto: startup.estagio, forte: true },
      { texto: ", o estágio da sua startup" },
    ]);
  }

  if (startup.necessidades.includes("Mentoria") && notas.disponibilidade >= 80 && investidor.disponibilidade) {
    motivos.push([
      { texto: "Tem disponibilidade " },
      { texto: investidor.disponibilidade.toLowerCase(), forte: true },
      { texto: " para a mentoria que você busca" },
    ]);
  }

  if (motivos.length === 0) {
    motivos.push([
      { texto: "Está entre os investidores " },
      { texto: "mais ativos", forte: true },
      { texto: " da plataforma. Complete o perfil da startup para recomendações mais precisas" },
    ]);
  }
  return motivos;
}
