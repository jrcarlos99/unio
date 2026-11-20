import { MOCK_BACKEND } from "./api";
import * as remoto from "./discoveryService.api";
import * as mock from "./discoveryService.mock";

// Único ponto de dados das telas do investidor (Descobrir, Perfil da startup,
// Salvos, Meus unios). Escolhe o modo pela mesma constante do resto do app
// (ADR-008):
// - VITE_MOCK_BACKEND=true: discoveryService.mock.ts (startups de exemplo,
//   compatibilidade calculada no front, localStorage);
// - senão: discoveryService.api.ts (/api/discovery, /api/interests, /api/saved).
// As duas implementações têm as mesmas funções e os mesmos tipos; o JSON do
// back só é lido em discovery.mapping.ts.

// Modo API: listas e perfis vêm do back (ids numéricos reais); as telas usam
// para textos de estado vazio honestos
export const DESCOBERTA_REAL = !MOCK_BACKEND;

interface ServicoDescoberta {
  obterTeseInvestidor: typeof remoto.obterTeseInvestidor;
  obterTesouraria: typeof remoto.obterTesouraria;
  listarStartupsRecomendadas: typeof remoto.listarStartupsRecomendadas;
  obterStartup: typeof remoto.obterStartup;
  salvarStartup: typeof remoto.salvarStartup;
  removerSalvo: typeof remoto.removerSalvo;
  listarSalvos: typeof remoto.listarSalvos;
  obterStatusInteresse: typeof remoto.obterStatusInteresse;
  registrarInteresse: typeof remoto.registrarInteresse;
  desfazerInteresse: typeof remoto.desfazerInteresse;
  listarUnios: typeof remoto.listarUnios;
  obterContato: typeof remoto.obterContato;
  desfazerMatch: typeof remoto.desfazerMatch;
  registrarEvento: typeof remoto.registrarEvento;
}

const servico: ServicoDescoberta = MOCK_BACKEND ? mock : remoto;

// Filtro puro sobre a lista já carregada (igual nos dois modos)
export const { aplicarFiltros } = mock;

export const {
  obterTeseInvestidor,
  obterTesouraria,
  listarStartupsRecomendadas,
  obterStartup,
  salvarStartup,
  removerSalvo,
  listarSalvos,
  obterStatusInteresse,
  registrarInteresse,
  desfazerInteresse,
  listarUnios,
  obterContato,
  desfazerMatch,
  registrarEvento,
} = servico;
