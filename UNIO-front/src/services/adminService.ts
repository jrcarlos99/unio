import type { LogEntry, UsuarioCadastrado } from "../pages/admin/types.ts";
import api from "./api.ts";
import {
  logDoBack,
  usuarioDoBack,
  visaoGeralAdminDoBack,
  type AuditLogBack,
  type MetricasAdminBack,
  type UsuarioAdminBack,
  type VisaoGeralAdmin,
} from "./admin.mapping.ts";

// Dados das telas do admin, só do back (ADR-010 e ADR-011). Todas as rotas
// exigem ADMIN (SecurityConfig: /api/admin/** hasRole ADMIN).
// - Visão geral: GET /api/admin/metrics.
// - Log de auditoria: GET /api/admin/audit (as 50 mais recentes).
// - Usuários: GET /api/admin/users (lista simples, sem a moderação).
// - Moderação de cadastros e de conteúdo: moderacaoService.ts (D063, ADR-013).

export async function obterVisaoGeralAdmin(): Promise<VisaoGeralAdmin> {
  const { data } = await api.get<MetricasAdminBack>("/api/admin/metrics");
  return visaoGeralAdminDoBack(data);
}

export async function listarAuditoria(): Promise<LogEntry[]> {
  const { data } = await api.get<AuditLogBack[]>("/api/admin/audit");
  return data.map(logDoBack);
}

// Contas de startup e investidor (o admin não aparece na lista)
export async function listarUsuarios(): Promise<UsuarioCadastrado[]> {
  const { data } = await api.get<UsuarioAdminBack[]>("/api/admin/users");
  return data.map(usuarioDoBack).filter((usuario) => usuario.tipo !== "Admin");
}
