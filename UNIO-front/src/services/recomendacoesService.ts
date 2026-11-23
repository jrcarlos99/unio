import type { UserProfile } from "../contexts/AuthContext";
import type { DadosUnio, ResultadoDesfazerMatch } from "../types/contato";
import type { StatusInteresse } from "../types/discovery";
import type { AlteracaoRecomendacao, PerfilApp, Recomendacao } from "../types/recomendacoes";
import * as descoberta from "./discoveryService";
import * as investidores from "./investidoresService";
import { chaveUsuario } from "./onboardingService";

// Fachada para as telas e ações que os dois perfis compartilham (Salvos,
// Meus unios, salvar, interesse): escolhe o serviço pelo perfil logado.
// Investidor → discoveryService (startups); startup → investidoresService
// (investidores). Não guarda nada e não chama o back: só repassa (ADR-008).

const chave = (user: UserProfile | null) => (user ? chaveUsuario(user) : "");

export function idDaRecomendacao(rec: Recomendacao) {
  return rec.perfil === "investidor" ? rec.item.startup.id : rec.item.investidor.id;
}

export function nomeDaRecomendacao(rec: Recomendacao) {
  return rec.perfil === "investidor" ? rec.item.startup.nome : rec.item.investidor.nome;
}

function embrulhar(perfil: PerfilApp) {
  return (item: unknown) => ({ perfil, item }) as Recomendacao;
}

export async function listarSalvos(perfil: PerfilApp, user: UserProfile | null): Promise<Recomendacao[]> {
  const lista =
    perfil === "investidor" ? await descoberta.listarSalvos(chave(user)) : await investidores.listarSalvos(user);
  return lista.map(embrulhar(perfil));
}

export async function listarUnios(perfil: PerfilApp, user: UserProfile | null): Promise<Recomendacao[]> {
  const lista =
    perfil === "investidor" ? await descoberta.listarUnios(chave(user)) : await investidores.listarUnios(user);
  return lista.map(embrulhar(perfil));
}

export async function salvar(rec: Recomendacao, user: UserProfile | null): Promise<void> {
  const id = idDaRecomendacao(rec);
  return rec.perfil === "investidor" ? descoberta.salvarStartup(chave(user), id) : investidores.salvarInvestidor(user, id);
}

export async function removerSalvo(rec: Recomendacao, user: UserProfile | null): Promise<void> {
  const id = idDaRecomendacao(rec);
  return rec.perfil === "investidor" ? descoberta.removerSalvo(chave(user), id) : investidores.removerSalvo(user, id);
}

// O par do scorecard vai junto para o feedback INTERESTED
export async function registrarInteresse(rec: Recomendacao, user: UserProfile | null): Promise<StatusInteresse> {
  const id = idDaRecomendacao(rec);
  return rec.perfil === "investidor"
    ? descoberta.registrarInteresse(chave(user), id, rec.item.scorecard)
    : investidores.registrarInteresse(user, id, rec.item.scorecard);
}

export async function desfazerInteresse(rec: Recomendacao, user: UserProfile | null): Promise<StatusInteresse> {
  const id = idDaRecomendacao(rec);
  return rec.perfil === "investidor"
    ? descoberta.desfazerInteresse(chave(user), id)
    : investidores.desfazerInteresse(user, id);
}

// Aplica salvo/status novo numa recomendação já carregada
export function comAlteracao(rec: Recomendacao, alteracao: AlteracaoRecomendacao): Recomendacao {
  return rec.perfil === "investidor"
    ? { perfil: "investidor", item: { ...rec.item, ...alteracao } }
    : { perfil: "startup", item: { ...rec.item, ...alteracao } };
}

export async function obterContato(rec: Recomendacao, user: UserProfile | null): Promise<DadosUnio | null> {
  const id = idDaRecomendacao(rec);
  return rec.perfil === "investidor" ? descoberta.obterContato(chave(user), id) : investidores.obterContato(user, id);
}

// O back também cancela as reuniões futuras do par e diz quantas
// (reunioesCanceladas)
export async function desfazerMatch(rec: Recomendacao, user: UserProfile | null): Promise<ResultadoDesfazerMatch> {
  const id = idDaRecomendacao(rec);
  return rec.perfil === "investidor" ? descoberta.desfazerMatch(chave(user), id) : investidores.desfazerMatch(user, id);
}

