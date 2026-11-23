import type { StartupRecomendada, StatusInteresse } from "./discovery";
import type { InvestidorRecomendado } from "./investidores";

// Perfil de quem está logado nas áreas do investidor e da startup
export type PerfilApp = "investidor" | "startup";

// Uma recomendação vista por um dos perfis: o investidor vê startups e a
// startup vê investidores. As telas compartilhadas (Salvos, Meus unios) e as
// ações (salvar, interesse) trabalham com este tipo e escolhem o serviço pelo
// perfil.
export type Recomendacao =
  | { perfil: "investidor"; item: StartupRecomendada }
  | { perfil: "startup"; item: InvestidorRecomendado };

export interface AlteracaoRecomendacao {
  salvo?: boolean;
  statusInteresse?: StatusInteresse;
  interesseRecebido?: boolean;
}
