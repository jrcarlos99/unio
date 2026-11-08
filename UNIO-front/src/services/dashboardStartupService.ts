import type { UserProfile } from "../contexts/AuthContext";
import { ESTAGIOS, SEGMENTOS_DETALHADOS } from "../data/options";
import { RESUMO_MOCK } from "../mocks/dashboardStartupMock";
import type { Estagio, FaixaCapital, Segmento } from "../types";
import type { CompletudePerfil, DadosStartup, ResumoStartup } from "../types/dashboard";
import type { RespostasStartup } from "../types/onboarding";
import { chaveUsuario, loadAnswers } from "./onboardingService";
import { uniosComReuniaoConfirmada } from "./reunioesStore";
import { unioLocalStartup } from "./unioLocal";

// Único ponto de dados da home da startup ("Visão geral"). A tela usa SÓ
// estas funções; quando o back tiver os endpoints, troca-se a implementação
// aqui por chamadas HTTP (por isso já retornam Promise) e a tela não muda.
//
// MOCK — o que AINDA NÃO EXISTE no back (levar ao squad):
// - Métricas do perfil: visualizações (total, variação, série semanal).
// - Funil de interesse e benchmark de conversão.
// - Investidores interessados (clicaram "Tenho interesse" na startup) e
//   matches (a startup também aceitou). Regra de produto: só depois do match
//   mútuo há conversa/reunião — por isso a home não tem "enviar mensagem".
// - Contatos iniciados: não há chat na plataforma; contam os eventos locais
//   registrados no popup do unio (services/unioLocal.ts).
// - Reunião marcada: unios com reunião confirmada (reunioesService, mock em
//   localStorage) somados, sem repetir unio, aos eventos "reuniao" antigos
//   do unioLocal (do atalho do Google Agenda, que saiu do popup).
// Sem nenhum dado, ficam os números do mock.
// A recomendação de investidores fica em services/investidoresService.ts.
// - Logo da startup (não há upload), usada na completude do perfil.

const LATENCIA_MS = 350;

function esperar() {
  return new Promise((resolve) => setTimeout(resolve, LATENCIA_MS));
}

export async function obterResumo(user: UserProfile | null): Promise<ResumoStartup> {
  await esperar();
  const userKey = user ? chaveUsuario(user) : "";
  const contatos = userKey ? unioLocalStartup.contarUniosComEvento(userKey, "contato") : 0;
  const reunioes = userKey
    ? new Set([...uniosComReuniaoConfirmada(userKey), ...unioLocalStartup.uniosComEvento(userKey, "reuniao")]).size
    : 0;
  const [visualizaram, interesse, contatoMock, reuniaoMock] = RESUMO_MOCK.funil;
  return {
    ...RESUMO_MOCK,
    metricas: { ...RESUMO_MOCK.metricas, contatosIniciados: contatos || RESUMO_MOCK.metricas.contatosIniciados },
    funil: [
      visualizaram,
      interesse,
      { ...contatoMock, valor: contatos || contatoMock.valor },
      { ...reuniaoMock, valor: reunioes || reuniaoMock.valor },
    ],
    atualizadoEm: new Date().toISOString(),
  };
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

// Critérios da completude e seus pesos (somam 100). Os três últimos são os
// itens do checklist da tela.
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
// uma palavra-chave ("PMEs"); logo: ainda não existe upload no back.
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
      pontos: 15,
      concluido: dados.pitch.length >= MIN_CARACTERES_PITCH,
    },
    { id: "logo", rotulo: "Incluir logo oficial", pontos: 10, concluido: false },
    {
      id: "mercadoDetalhado",
      rotulo: "Preencher mercado-alvo detalhado",
      pontos: 5,
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
