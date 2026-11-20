import { MOCK_BACKEND } from "./api";
import api from "./api";
import { logDoBack, visaoGeralAdminDoBack, type AuditLogBack, type MetricasAdminBack, type VisaoGeralAdmin } from "./admin.mapping";
import type { LogEntry } from "../pages/admin/types";

// Dados das telas do admin (ADR-010).
// - Modo mock (VITE_MOCK_BACKEND=true): as telas continuam com
//   pages/admin/data/mockAdmin.ts e o log da sessão (AuditContext).
// - Modo API: Visão geral de GET /api/admin/metrics e Log de auditoria de
//   GET /api/admin/audit. Moderação de cadastros e de conteúdo continuam com
//   dados de exemplo e aviso na tela: aprovar e rejeitar não têm endpoint.

export const ADMIN_REAL = !MOCK_BACKEND;

export async function obterVisaoGeralAdmin(): Promise<VisaoGeralAdmin> {
  const { data } = await api.get<MetricasAdminBack>("/api/admin/metrics");
  return visaoGeralAdminDoBack(data);
}

export async function listarAuditoria(): Promise<LogEntry[]> {
  const { data } = await api.get<AuditLogBack[]>("/api/admin/audit");
  return data.map(logDoBack);
}
