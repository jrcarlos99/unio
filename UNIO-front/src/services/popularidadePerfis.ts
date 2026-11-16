import { NOTAS_PERFIS_EXEMPLO } from "../mocks/popularidadeMock";
import type { PopularidadePublica } from "../types/avaliacoes";
import { resumirPopularidade } from "../utils/popularidade";

// MOCK: popularidade pública dos perfis fictícios da descoberta (startups e
// investidores dos mocks). Arquivo separado para os serviços de descoberta
// usarem sem import circular com o avaliacoesService. Com a API, cada perfil
// viria de GET /api/reviews/summary/{userId} (fromBackSummary em
// avaliacoes.mapping.ts). Só a porcentagem sai daqui: nada de notas, nomes
// ou comentários.
export function popularidadeDoPerfil(perfilId: string): PopularidadePublica {
  const { percentual, visivel } = resumirPopularidade(NOTAS_PERFIS_EXEMPLO[perfilId] ?? []);
  return { percentual, visivel };
}

// Percentual só quando visível (abaixo do mínimo: null, sem selo)
export function percentualVisivel(perfilId: string): number | null {
  const popularidade = popularidadeDoPerfil(perfilId);
  return popularidade.visivel ? popularidade.percentual : null;
}
