// Único lugar do front que conhece o JSON de GET /api/admin/metrics e
// GET /api/admin/audit (ADR-010). Funções puras, testadas com node.
import type { FatiaSegmento, LogEntry, Metrica, RegiaoCadastro } from "../pages/admin/types";
import { rotuloClassificacao } from "./discovery.mapping.ts";

export interface MetricasAdminBack {
  totalStartups: number;
  totalInvestors: number;
  // Pares com score calculado (não é match mútuo)
  totalMatches: number;
  totalFeedbacks: number;
  distributionByClassification: Record<string, number> | null;
  totalConversations: number;
  totalMessages: number;
  totalMeetings: number;
  meetingsByStatus: Record<string, number> | null;
  totalReviews: number;
  averageRating: number | null;
  interestsSent?: number;
  mutualMatches?: number;
}

export interface AuditLogBack {
  id: number;
  actorEmail: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  details: string | null;
  createdAt: string;
}

export interface VisaoGeralAdmin {
  metricas: Metrica[];
  avaliacao: { percentual: number; legenda: string };
  reunioesPorStatus: FatiaSegmento[];
  scoresPorClassificacao: RegiaoCadastro[];
  totalStartups: number;
  totalInvestidores: number;
}

const ROTULO_STATUS_REUNIAO: Record<string, string> = {
  PENDENTE: "Pendentes",
  CONFIRMADA: "Confirmadas",
  REALIZADA: "Realizadas",
  CANCELADA: "Canceladas",
  RECUSADA: "Recusadas",
};

const ORDEM_CLASSIFICACAO = ["EXCELENTE", "FORTE", "MODERADO", "FRACO", "SEM_MATCH"];

function numero(valor: number | null | undefined) {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : 0;
}

// Sem histórico no back: os cards não têm variação nem sparkline (não se inventa)
export function visaoGeralAdminDoBack(dados: MetricasAdminBack): VisaoGeralAdmin {
  const media = typeof dados.averageRating === "number" ? dados.averageRating : null;
  const avaliacoes = numero(dados.totalReviews);
  return {
    metricas: [
      { label: "Matches mútuos", valor: numero(dados.mutualMatches) },
      { label: "Interesses enviados", valor: numero(dados.interestsSent) },
      { label: "Reuniões", valor: numero(dados.totalMeetings) },
    ],
    avaliacao: {
      percentual: media === null ? 0 : Math.round((media / 5) * 100),
      legenda:
        media === null
          ? "sem avaliações ainda"
          : `média ${media.toFixed(1).replace(".", ",")} de 5 (${avaliacoes} ${avaliacoes === 1 ? "avaliação" : "avaliações"})`,
    },
    reunioesPorStatus: Object.entries(dados.meetingsByStatus ?? {})
      .filter(([, quantidade]) => numero(quantidade) > 0)
      .map(([status, quantidade]) => ({ segmento: ROTULO_STATUS_REUNIAO[status] ?? status, quantidade })),
    scoresPorClassificacao: ORDEM_CLASSIFICACAO.filter((chave) => numero(dados.distributionByClassification?.[chave]) > 0)
      .map((chave) => ({
        local: rotuloClassificacao(chave) ?? chave,
        quantidade: numero(dados.distributionByClassification?.[chave]),
      })),
    totalStartups: numero(dados.totalStartups),
    totalInvestidores: numero(dados.totalInvestors),
  };
}

// "BOOTSTRAP_ADMIN em User 12 (detalhes)"
export function logDoBack(entrada: AuditLogBack): LogEntry {
  const data = new Date(entrada.createdAt);
  const alvo = [entrada.entityType, entrada.entityId].filter(Boolean).join(" ");
  const acao = [entrada.action, alvo ? `em ${alvo}` : "", entrada.details ? `(${entrada.details})` : ""]
    .filter(Boolean)
    .join(" ");
  return {
    id: String(entrada.id),
    dataHora: Number.isNaN(data.getTime()) ? entrada.createdAt : data.toLocaleString("pt-BR"),
    usuario: entrada.actorEmail ?? "sistema",
    acao,
  };
}
