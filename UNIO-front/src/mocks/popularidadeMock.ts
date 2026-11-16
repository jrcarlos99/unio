import type { PontoSemana } from "../types/dashboard";

// MOCK, DADOS DE EXEMPLO da popularidade (RF10, ADR-006). Só o
// services/avaliacoesService.ts e os serviços de descoberta leem daqui. Com a
// API, tudo isto vem de GET /api/profile/me/popularity e
// GET /api/reviews/summary/{userId} (D040 a D044 do back).

// EXEMPLO: notas que o usuário logado "já recebeu" antes de usar o app. São
// só 2, abaixo do mínimo de 3, para a tela mostrar "faltam 1" até o primeiro
// "Compareci" (quando a outra parte do mock avalia e a porcentagem aparece).
export const NOTAS_RECEBIDAS_EXEMPLO = [5, 4] as const;

// EXEMPLO: reuniões realizadas antes, que geraram as notas acima
export const REUNIOES_REALIZADAS_EXEMPLO = NOTAS_RECEBIDAS_EXEMPLO.length;

// EXEMPLO: visitas ao perfil do investidor (a startup reaproveita o
// dashboardStartupMock). Mesmo formato do gráfico da Visão geral.
export const VISITAS_INVESTIDOR_EXEMPLO: PontoSemana[] = [
  { semana: "Sem 1", atual: 9, anterior: 7 },
  { semana: "Sem 2", atual: 14, anterior: 10 },
  { semana: "Sem 3", atual: 12, anterior: 11 },
  { semana: "Sem 4", atual: 19, anterior: 13 },
];

// EXEMPLO: startups que clicaram "Tenho interesse" no investidor
export const INTERESSES_RECEBIDOS_INVESTIDOR_EXEMPLO = 5;

// EXEMPLO: notas recebidas pelos perfis fictícios da descoberta (startups e
// investidores dos mocks). Quem tem menos de 3 notas fica SEM selo, para
// mostrar a regra do mínimo. Só a porcentagem chega às telas.
export const NOTAS_PERFIS_EXEMPLO: Record<string, readonly number[]> = {
  // startups (mocks/startupsMock.ts)
  biopay: [5, 5, 4, 5],
  healthpulse: [4, 4, 5],
  terraverde: [5, 4],
  edusync: [5, 5, 5, 4, 5],
  logiroute: [3, 4, 4],
  "verde-pay": [5, 4, 4, 5, 5, 4],
  medconecta: [4],
  solarne: [5, 5, 4],
  // investidores (mocks/investidoresMock.ts)
  "marcos-andrade": [5, 5, 5, 4],
  "camila-lins": [4, 5, 4],
  "ricardo-bittencourt": [5],
  "marina-albuquerque": [5, 4, 5, 5],
  "juliana-prado": [3, 4, 4, 4],
  "fernando-accioly": [5, 5],
  "beatriz-nobrega": [4, 4, 5, 5, 5],
  "helena-duarte": [5, 5, 4],
};
