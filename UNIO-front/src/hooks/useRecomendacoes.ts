import { useCallback, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  desfazerInteresse,
  idDaRecomendacao,
  nomeDaRecomendacao,
  registrarInteresse,
  removerSalvo,
  salvar,
} from "../services/recomendacoesService";
import { assinarRetribuicoes, avisarRetribuicao } from "../services/interessesRecebidosService";
import type { AlteracaoRecomendacao, Recomendacao } from "../types/recomendacoes";
import { useExecucao } from "./useDescoberta";
import { useToast } from "./useToast";

// Mensagens que mudam por perfil. As do investidor são as que o Descobrir
// sempre usou ("a startup"); as da startup evitam supor o gênero do investidor.
const TEXTOS = {
  investidor: {
    salvo: (nome: string) => `${nome} salva em Salvos.`,
    removido: (nome: string) => `${nome} removida dos Salvos.`,
    enviado: (nome: string) => `Interesse enviado para ${nome}. Se ela também se interessar, vocês dão match.`,
  },
  startup: {
    salvo: (nome: string) => `${nome} está nos seus Salvos.`,
    removido: (nome: string) => `${nome} saiu dos seus Salvos.`,
    enviado: (nome: string) => `Interesse enviado para ${nome}. Se o interesse for recíproco, vocês dão match.`,
  },
};

// Salvar/remover dos salvos e demonstrar/desfazer interesse, para os dois
// perfis, com os toasts. `aoAlterar` aplica o novo estado na tela que chamou.
export function useAcoesRecomendacao(aoAlterar: (id: string, alteracao: AlteracaoRecomendacao) => void) {
  const { user } = useAuth();
  const { mostrar } = useToast();
  const { executar, estaOcupado } = useExecucao();

  const alternarSalvo = useCallback(
    (rec: Recomendacao) => {
      const id = idDaRecomendacao(rec);
      const nome = nomeDaRecomendacao(rec);
      const salvo = rec.item.salvo;
      return executar(
        id,
        async () => {
          if (salvo) {
            await removerSalvo(rec, user);
            mostrar(TEXTOS[rec.perfil].removido(nome), "info");
          } else {
            await salvar(rec, user);
            mostrar(TEXTOS[rec.perfil].salvo(nome), "sucesso");
          }
          aoAlterar(id, { salvo: !salvo });
        },
        "Não foi possível atualizar seus salvos. Tente novamente.",
      );
    },
    [aoAlterar, executar, mostrar, user],
  );

  const demonstrarInteresse = useCallback(
    (rec: Recomendacao) => {
      const id = idDaRecomendacao(rec);
      const nome = nomeDaRecomendacao(rec);
      return executar(
        id,
        async () => {
          const status = await registrarInteresse(rec, user);
          aoAlterar(id, { statusInteresse: status, interesseRecebido: false });
          // O sino tira o interesse recebido dessa pessoa (ADR-015)
          if (status !== "nenhum") avisarRetribuicao({ id, status });
          if (status === "match") mostrar(`Deu match com ${nome}!`, "match");
          else mostrar(TEXTOS[rec.perfil].enviado(nome), "sucesso");
        },
        "Não foi possível enviar seu interesse. Tente novamente.",
      );
    },
    [aoAlterar, executar, mostrar, user],
  );

  const desfazer = useCallback(
    (rec: Recomendacao) => {
      const id = idDaRecomendacao(rec);
      const nome = nomeDaRecomendacao(rec);
      return executar(
        id,
        async () => {
          const status = await desfazerInteresse(rec, user);
          aoAlterar(id, { statusInteresse: status });
          if (status === "nenhum") mostrar(`Interesse em ${nome} desfeito.`, "info");
        },
        "Não foi possível desfazer o interesse. Tente novamente.",
      );
    },
    [aoAlterar, executar, mostrar, user],
  );

  // Retribuição feita pelo sino (ou por outra tela aberta): atualiza o card
  // ou o perfil daquela pessoa, se estiver nesta tela
  useEffect(
    () =>
      assinarRetribuicoes(({ id, status }) => aoAlterar(id, { statusInteresse: status, interesseRecebido: false })),
    [aoAlterar],
  );

  return { alternarSalvo, demonstrarInteresse, desfazer, estaOcupado };
}
