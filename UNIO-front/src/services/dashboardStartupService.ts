import type { UserProfile } from "../contexts/AuthContext";
import { ESTAGIOS, SEGMENTOS_DETALHADOS } from "../data/options";
import type { Estagio, FaixaCapital, Segmento } from "../types";
import type { CompletudePerfil, DadosStartup, ResumoStartup } from "../types/dashboard";
import type { Reuniao } from "../types/reunioes";
import type { RespostasStartup } from "../types/onboarding";
import { obterPopularidade } from "./avaliacoesService";
import { montarResumo } from "./dashboardStartup.mapping";
import { contarMatches } from "./descobertaApi";
import { chaveUsuario, loadAnswers } from "./onboardingService";
import { listarReunioes } from "./reunioesService";

// Único ponto de dados da home da startup ("Visão geral"). A tela usa SÓ
// estas funções. Tudo vem do back (ADR-011):
// - GET /api/profile/me/popularity: visualizações dos últimos 28 dias,
//   variação, série semanal e interesses recebidos;
// - GET /api/interests/matches: matches mútuos;
// - GET /api/meetings: reuniões marcadas (CONFIRMADA e REALIZADA).
// Cada chamada falha sozinha: o bloco dela mostra "indisponível" e o resto
// da tela continua. Não existe número de exemplo.
//
// Sem endpoint no back e, por isso, fora da tela (ADR-011): "Contatos
// iniciados" (não há chat nem registro de contato), "+N novos esta semana"
// dos interessados (o back não tem a data do interesse na popularidade),
// benchmark de mercado do funil e logo da startup (não há upload).
// A recomendação de investidores fica em services/investidoresService.ts.

export async function obterResumo(user: UserProfile | null): Promise<ResumoStartup> {
  const sessao = { user, perfil: "startup" as const };
  const [popularidade, reunioes, matches] = await Promise.all([
    user ? obterPopularidade().catch(() => null) : Promise.resolve(null),
    user ? listarReunioes(sessao).catch(() => null) : Promise.resolve([] as Reuniao[]),
    user ? contarMatches().catch(() => null) : Promise.resolve(0),
  ]);
  return montarResumo({ popularidade, reunioes, matches }, new Date().toISOString());
}

// ---------------------------------------------------------------------------
// Dados da startup logada: perfil do back (/api/profile/me) + respostas do
// onboarding. O onboarding tem prioridade porque é mais completo.
// ---------------------------------------------------------------------------

const SEGMENTOS_VALIDOS = SEGMENTOS_DETALHADOS.map((opcao) => opcao.valor);

function texto(valor: unknown) {
  return typeof valor === "string" ? valor.trim() : "";
}

function dadosDaStartup(
  perfil: UserProfile | null,
  respostas: Partial<RespostasStartup> | null,
): DadosStartup {
  const segmentoPerfil = texto(perfil?.segmento) as Segmento;
  const estagioPerfil = texto(perfil?.estagio) as Estagio;
  const capitalPerfil = typeof perfil?.capitalProcurado === "number" ? perfil.capitalProcurado : null;
  return {
    segmento: respostas?.segmento ?? (SEGMENTOS_VALIDOS.includes(segmentoPerfil) ? segmentoPerfil : null),
    estagio: respostas?.estagio ?? (ESTAGIOS.includes(estagioPerfil) ? estagioPerfil : null),
    localizacao: texto(respostas?.localizacao) || texto(perfil?.localizacao),
    modeloNegocio: texto(respostas?.modeloNegocio) || texto(perfil?.modeloNegocio),
    mercadoAlvo: texto(respostas?.mercadoAlvo) || texto(perfil?.mercadoAlvo),
    pitch: texto(respostas?.pitch) || texto(perfil?.pitchCanvas),
    tamanhoEquipe: texto(respostas?.tamanhoEquipe),
    tracao: respostas?.tracao ?? [],
    necessidades: respostas?.necessidades ?? [],
    capitalProcurado: (respostas?.capitalProcurado as FaixaCapital | null | undefined) ?? capitalPerfil,
  };
}

// Critérios da completude e seus pesos (somam 100 com os itens do checklist
// da tela).
const CRITERIOS: { pontos: number; ok: (d: DadosStartup) => boolean }[] = [
  { pontos: 10, ok: (d) => d.segmento !== null },
  { pontos: 10, ok: (d) => d.estagio !== null },
  { pontos: 10, ok: (d) => d.localizacao !== "" },
  { pontos: 10, ok: (d) => d.modeloNegocio !== "" },
  { pontos: 10, ok: (d) => d.capitalProcurado !== null },
  { pontos: 10, ok: (d) => d.tamanhoEquipe !== "" },
  { pontos: 5, ok: (d) => d.tracao.length > 0 },
  { pontos: 5, ok: (d) => d.mercadoAlvo !== "" },
];

// Canvas: pitch com conteúdo de verdade; mercado-alvo detalhado: mais que
// uma palavra-chave ("PMEs"). O item "logo" saiu (ADR-011): o back não tem
// upload de logo, então ele nunca podia ser concluído.
const MIN_CARACTERES_PITCH = 30;
const MIN_CARACTERES_MERCADO = 40;

export function calcularCompletudePerfil(
  perfil: UserProfile | null,
  respostas: Partial<RespostasStartup> | null,
): CompletudePerfil {
  const dados = dadosDaStartup(perfil, respostas);
  const itens: CompletudePerfil["itens"] = [
    {
      id: "canvas",
      rotulo: "Adicionar o canvas do pitch",
      pontos: 20,
      concluido: dados.pitch.length >= MIN_CARACTERES_PITCH,
    },
    {
      id: "mercadoDetalhado",
      rotulo: "Preencher mercado-alvo detalhado",
      pontos: 10,
      concluido: dados.mercadoAlvo.length >= MIN_CARACTERES_MERCADO,
    },
  ];
  const percentual =
    CRITERIOS.reduce((soma, c) => soma + (c.ok(dados) ? c.pontos : 0), 0) +
    itens.reduce((soma, item) => soma + (item.concluido ? item.pontos : 0), 0);
  const nivel = percentual >= 80 ? "Ouro" : percentual >= 50 ? "Prata" : "Bronze";
  return { percentual, nivel, itens };
}

export interface ContextoStartup {
  dados: DadosStartup;
  completude: CompletudePerfil;
}

export async function obterContextoStartup(user: UserProfile | null): Promise<ContextoStartup> {
  const respostas = user ? await loadAnswers<RespostasStartup>(chaveUsuario(user), "startup") : null;
  return {
    dados: dadosDaStartup(user, respostas),
    completude: calcularCompletudePerfil(user, respostas),
  };
}
