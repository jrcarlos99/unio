import type {
  AcaoConta,
  ContaModeracao,
  EnvioPitch,
  FiltroContas,
  PaginaModeracao,
  SituacaoEnvio,
} from "../pages/admin/types.ts";
import api from "./api.ts";
import {
  LIMITE_PAGINA,
  contaDoBack,
  envioDoBack,
  paginaDoBack,
  parametrosContas,
  type ContaModeracaoBack,
  type EnvioPitchBack,
  type PaginaModeracaoBack,
} from "./moderacao.mapping.ts";

// Moderação de cadastros e de conteúdo, só do back (D063, ADR-013). Todas as
// rotas exigem ADMIN (403 para os demais). Cada ação grava no log de
// auditoria do back; o front não guarda estado próprio.

const CONTAS = "/api/admin/moderation/accounts";
const CONTEUDO = "/api/admin/moderation/content";

const ROTA_DA_ACAO: Record<AcaoConta, string> = {
  aprovar: "approve",
  recusar: "reject",
  suspender: "suspend",
  reativar: "reactivate",
};

export async function listarContasModeracao(filtro: FiltroContas): Promise<PaginaModeracao<ContaModeracao>> {
  const { data } = await api.get<PaginaModeracaoBack<ContaModeracaoBack>>(CONTAS, { params: parametrosContas(filtro) });
  return paginaDoBack(data, contaDoBack);
}

// Recusar e suspender exigem motivo; aprovar e reativar vão sem corpo
export async function moderarConta(id: string, acao: AcaoConta, motivo?: string): Promise<ContaModeracao> {
  const url = `${CONTAS}/${encodeURIComponent(id)}/${ROTA_DA_ACAO[acao]}`;
  const corpo = acao === "recusar" || acao === "suspender" ? { reason: (motivo ?? "").trim() } : undefined;
  const { data } = await api.post<ContaModeracaoBack>(url, corpo);
  return contaDoBack(data);
}

export async function listarEnvios(situacoes: SituacaoEnvio[], deslocamento = 0): Promise<PaginaModeracao<EnvioPitch>> {
  const params: Record<string, string | number> = { limit: LIMITE_PAGINA, offset: deslocamento };
  if (situacoes.length > 0) params.status = situacoes.join(",");
  const { data } = await api.get<PaginaModeracaoBack<EnvioPitchBack>>(CONTEUDO, { params });
  return paginaDoBack(data, envioDoBack);
}

export async function aprovarEnvio(id: string): Promise<EnvioPitch> {
  const { data } = await api.post<EnvioPitchBack>(`${CONTEUDO}/${encodeURIComponent(id)}/approve`);
  return envioDoBack(data);
}

export async function removerEnvio(id: string, motivo: string): Promise<EnvioPitch> {
  const { data } = await api.post<EnvioPitchBack>(`${CONTEUDO}/${encodeURIComponent(id)}/remove`, {
    reason: motivo.trim(),
  });
  return envioDoBack(data);
}
