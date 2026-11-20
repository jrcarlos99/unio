import { MOCK_BACKEND } from "./api";
import * as mock from "./reunioesService.mock";
import * as remoto from "./reunioesService.api";

// Único ponto de dados das reuniões para as telas (página de Reuniões, popup do
// unio, sidebar e sino). Escolhe o modo pela mesma constante do resto do app:
// - VITE_MOCK_BACKEND=true: reunioesService.mock.ts (localStorage, dados de
//   exemplo e a outra parte simulada);
// - senão: reunioesService.api.ts (/api/meetings do back).
// As duas implementações têm as mesmas funções e os mesmos tipos; o mapeamento
// para os nomes do back fica só em reunioes.mapping.ts (ADR-005).

export type { SessaoReunioes } from "../types/reunioes";

// Reunião só com quem deu match, nos dois modos: no mock a lista vem dos
// unios; com a API, o back filtra GET /api/meetings/counterparts e recusa
// POST /api/meetings sem match (D051 do back, ADR-009)
export const REUNIOES_EXIGEM_MATCH = true;

// Orientação de quando ainda não há match, com o link para achar alguém
export const ORIENTACAO_SEM_MATCH = "Dê match com alguém para solicitar uma reunião.";
export function linkParaDarMatch(perfil: "investidor" | "startup") {
  return perfil === "investidor"
    ? { para: "/home-investidor", rotulo: "Ir para Descobrir" }
    : { para: "/investidores", rotulo: "Ir para Investidores" };
}

// Modo API: "Com quem" só aceita usuários reais da lista de contrapartes (id
// numérico do back); ids de exemplo dos mocks nunca vão ao back (ADR-007)
export const REUNIOES_SO_COM_IDS_REAIS = !MOCK_BACKEND;

interface ServicoReunioes {
  assinarReunioes: typeof remoto.assinarReunioes;
  listarContrapartes: typeof remoto.listarContrapartes;
  listarReunioes: typeof remoto.listarReunioes;
  solicitarReuniao: typeof remoto.solicitarReuniao;
  responderSolicitacao: typeof remoto.responderSolicitacao;
  cancelarReuniao: typeof remoto.cancelarReuniao;
  marcarComoRealizada: typeof remoto.marcarComoRealizada;
  remarcarReuniao: typeof remoto.remarcarReuniao;
  definirLinkOuLocal: typeof remoto.definirLinkOuLocal;
  gerarIcs: typeof remoto.gerarIcs;
  detectarConflito: typeof remoto.detectarConflito;
  listarNotificacoes: typeof remoto.listarNotificacoes;
  marcarNotificacoesLidas: typeof remoto.marcarNotificacoesLidas;
  contarSolicitacoesRecebidas: typeof remoto.contarSolicitacoesRecebidas;
  listarReunioesAtivasComUnio: typeof remoto.listarReunioesAtivasComUnio;
  cancelarReunioesDoUnio: typeof remoto.cancelarReunioesDoUnio;
  obterProximaConfirmada: typeof remoto.obterProximaConfirmada;
}

const servico: ServicoReunioes = MOCK_BACKEND ? mock : remoto;

export const {
  assinarReunioes,
  listarContrapartes,
  listarReunioes,
  solicitarReuniao,
  responderSolicitacao,
  cancelarReuniao,
  marcarComoRealizada,
  remarcarReuniao,
  definirLinkOuLocal,
  gerarIcs,
  detectarConflito,
  listarNotificacoes,
  marcarNotificacoesLidas,
  contarSolicitacoesRecebidas,
  listarReunioesAtivasComUnio,
  cancelarReunioesDoUnio,
  obterProximaConfirmada,
} = servico;
