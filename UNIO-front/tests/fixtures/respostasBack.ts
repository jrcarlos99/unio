// Respostas no formato real do back (DTOs do Spring), usadas pelos testes.
// Dados de teste ficam só em tests/, nunca em src/ (ADR-011). Os nomes dos
// campos seguem os records do back citados em cada bloco.
import type { MetricasAdminBack, AuditLogBack, UsuarioAdminBack } from "../../src/services/admin.mapping.ts";
import type { PopularityBack } from "../../src/services/avaliacoes.mapping.ts";
import type { MeetingResponseBack } from "../../src/services/reunioes.mapping.ts";

// popularity/dto/PopularityResponse (GET /api/profile/me/popularity)
export const POPULARIDADE_BACK: PopularityBack = {
  userId: 7,
  totalReviews: 4,
  averageRating: 4.5,
  percentage: 90,
  visible: true,
  meetingsCompleted: 2,
  profileViews28d: 59,
  profileViewsPrev28d: 40,
  weeklyViews: [
    { weekStart: "2026-10-20", views: 10 },
    { weekStart: "2026-10-27", views: 14 },
    { weekStart: "2026-11-03", views: 16 },
    { weekStart: "2026-11-10", views: 19 },
  ],
  interestsReceived: 4,
};

// Conta nova: tudo zerado (o back devolve zeros, não ausência)
export const POPULARIDADE_ZERADA_BACK: PopularityBack = {
  userId: 8,
  totalReviews: 0,
  averageRating: null,
  percentage: null,
  visible: false,
  meetingsCompleted: 0,
  profileViews28d: 0,
  profileViewsPrev28d: 0,
  weeklyViews: [
    { weekStart: "2026-10-20", views: 0 },
    { weekStart: "2026-10-27", views: 0 },
    { weekStart: "2026-11-03", views: 0 },
    { weekStart: "2026-11-10", views: 0 },
  ],
  interestsReceived: 0,
};

// communication/dto/MeetingResponse (GET /api/meetings)
export function reuniaoBack(id: number, status: MeetingResponseBack["status"]): MeetingResponseBack {
  return {
    id,
    title: "Mentoria",
    agenda: null,
    startsAt: "2026-11-12T17:00:00Z",
    endsAt: "2026-11-12T17:30:00Z",
    durationMinutes: 30,
    meetingUrl: null,
    status,
    cancelReason: null,
    organizer: true,
    participant: { id: 12, name: "Rafael", role: "INVESTOR", active: true },
    createdAt: "2026-11-08T12:00:00Z",
    updatedAt: "2026-11-08T12:00:00Z",
    subject: "Mentoria",
    message: null,
    format: "ONLINE",
    location: null,
    suggestedTimes: ["2026-11-12T17:00:00Z"],
    proposedByMe: true,
  };
}

// admin/dto/AdminMetricsResponse (GET /api/admin/metrics)
export const METRICAS_ADMIN_BACK: MetricasAdminBack = {
  totalStartups: 3,
  totalInvestors: 2,
  totalMatches: 6,
  totalFeedbacks: 1,
  distributionByClassification: { FORTE: 2, MODERADO: 4 },
  totalConversations: 0,
  totalMessages: 0,
  totalMeetings: 2,
  meetingsByStatus: { CONFIRMADA: 1, REALIZADA: 1 },
  totalReviews: 1,
  averageRating: 4,
  interestsSent: 5,
  mutualMatches: 1,
};

// audit/dto/AuditLogResponse (GET /api/admin/audit)
export const AUDITORIA_BACK: AuditLogBack[] = [
  {
    id: 31,
    actorEmail: "admin@unio.test",
    action: "BOOTSTRAP_ADMIN",
    entityType: "User",
    entityId: "9",
    details: null,
    createdAt: "2026-11-16T12:00:00Z",
  },
];

// profile/service/AdminService.toSummary (GET /api/admin/users)
export const USUARIOS_ADMIN_BACK: UsuarioAdminBack[] = [
  { id: 1, email: "admin@unio.test", role: "ADMIN", createdAt: "2026-11-01T10:00:00Z", deletedAt: null },
  { id: 2, email: "startup@unio.test", role: "STARTUP", createdAt: "2026-11-02T10:00:00Z", deletedAt: null },
  { id: 3, email: "deleted-3@anon.unio", role: "INVESTOR", createdAt: "2026-11-03T10:00:00Z", deletedAt: "2026-11-10T10:00:00Z" },
];

// Corpo de erro do GlobalExceptionHandler do back (ResponseStatusException)
export function erroBack(status: number, message: string) {
  return { status, error: "", message, path: "/api/teste" };
}
