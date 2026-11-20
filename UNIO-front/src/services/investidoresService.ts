import { MOCK_BACKEND } from "./api";
import * as remoto from "./investidoresService.api";
import * as mock from "./investidoresService.mock";

// Único ponto de dados dos investidores vistos pela startup: aba
// "Investidores", Salvos, Meus unios, perfil do investidor e bloco
// "Investidores recomendados" da Visão geral. Escolhe o modo (ADR-008):
// - VITE_MOCK_BACKEND=true: investidoresService.mock.ts (investidores de
//   exemplo, score calculado no front, localStorage);
// - senão: investidoresService.api.ts (/api/discovery, /api/interests,
//   /api/saved).
// O JSON do back só é lido em discovery.mapping.ts.

// Modo API: listas e perfis vêm do back; as telas usam para o estado vazio
export const INVESTIDORES_REAIS = !MOCK_BACKEND;

interface ServicoInvestidores {
  obterResumoStartup: typeof remoto.obterResumoStartup;
  listarInvestidoresRecomendados: typeof remoto.listarInvestidoresRecomendados;
  obterInvestidor: typeof remoto.obterInvestidor;
  salvarInvestidor: typeof remoto.salvarInvestidor;
  removerSalvo: typeof remoto.removerSalvo;
  listarSalvos: typeof remoto.listarSalvos;
  listarUnios: typeof remoto.listarUnios;
  obterStatusInteresse: typeof remoto.obterStatusInteresse;
  registrarInteresse: typeof remoto.registrarInteresse;
  desfazerInteresse: typeof remoto.desfazerInteresse;
  obterContato: typeof remoto.obterContato;
  desfazerMatch: typeof remoto.desfazerMatch;
  registrarEvento: typeof remoto.registrarEvento;
}

const servico: ServicoInvestidores = MOCK_BACKEND ? mock : remoto;

// Filtro puro sobre a lista já carregada (igual nos dois modos)
export const { aplicarFiltrosInvestidores } = mock;

export const {
  obterResumoStartup,
  listarInvestidoresRecomendados,
  obterInvestidor,
  salvarInvestidor,
  removerSalvo,
  listarSalvos,
  listarUnios,
  obterStatusInteresse,
  registrarInteresse,
  desfazerInteresse,
  obterContato,
  desfazerMatch,
  registrarEvento,
} = servico;
