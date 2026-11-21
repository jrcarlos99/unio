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
// - Cadastros: GET /api/admin/users. Aprovar e rejeitar não têm endpoint no
//   back, então a tela só lista (sem botões que não salvam).
// - Moderação de conteúdo: sem endpoint; a tela mostra "ainda não disponível".

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
