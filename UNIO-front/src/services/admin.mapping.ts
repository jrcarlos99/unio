// Único lugar do front que conhece o JSON de GET /api/admin/metrics,
// GET /api/admin/audit e GET /api/admin/users (ADR-010 e ADR-011). Funções
// puras, testadas com node.
import type {
  FatiaSegmento,
  LogEntry,
  Metrica,
  RegiaoCadastro,
  TipoConta,
  UsuarioCadastrado,
} from "../pages/admin/types";
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

// Uma conta de GET /api/admin/users (AdminService.toSummary no back)
export interface UsuarioAdminBack {
  id: number | string;
  email: string | null;
  role: string;
  createdAt: string | null;
  deletedAt?: string | null;
}

function tipoDaConta(role: string): TipoConta {
  const papel = role.toUpperCase();
  if (papel === "STARTUP") return "Startup";
  if (papel === "INVESTOR") return "Investidor";
  return "Admin";
}

export function usuarioDoBack(usuario: UsuarioAdminBack): UsuarioCadastrado {
  return {
    id: String(usuario.id),
    email: usuario.email ?? "",
    tipo: tipoDaConta(String(usuario.role ?? "")),
    dataCadastro: usuario.createdAt ?? null,
    excluida: Boolean(usuario.deletedAt),
  };
}

// Ações de moderação (D063 do back, ADR-013) em português; o número é o id
// da conta ou do envio de pitch
const ACOES_MODERACAO: Record<string, string> = {
  MODERACAO_CONTA_APROVADA: "Aprovou o cadastro da conta",
  MODERACAO_CONTA_RECUSADA: "Recusou o cadastro da conta",
  MODERACAO_CONTA_SUSPENSA: "Suspendeu a conta",
  MODERACAO_CONTA_REATIVADA: "Reativou a conta",
  MODERACAO_PITCH_APROVADO: "Aprovou o envio de pitch",
  MODERACAO_PITCH_REMOVIDO: "Removeu o envio de pitch",
};

function textoDaAcao(entrada: AuditLogBack): string {
  const moderacao = ACOES_MODERACAO[entrada.action];
  if (moderacao) {
    // "Suspendeu a conta 12. Situação anterior: APROVADO. Nova situação: SUSPENSO. Motivo: spam."
    const titulo = [moderacao, entrada.entityId].filter(Boolean).join(" ");
    return entrada.details ? `${titulo}. ${entrada.details}` : titulo;
  }
  // "BOOTSTRAP_ADMIN em User 12 (detalhes)"
  const alvo = [entrada.entityType, entrada.entityId].filter(Boolean).join(" ");
  return [entrada.action, alvo ? `em ${alvo}` : "", entrada.details ? `(${entrada.details})` : ""]
    .filter(Boolean)
    .join(" ");
}

export function logDoBack(entrada: AuditLogBack): LogEntry {
  const data = new Date(entrada.createdAt);
  const acao = textoDaAcao(entrada);
  return {
    id: String(entrada.id),
    dataHora: Number.isNaN(data.getTime()) ? entrada.createdAt : data.toLocaleString("pt-BR"),
    usuario: entrada.actorEmail ?? "sistema",
    acao,
  };
}
