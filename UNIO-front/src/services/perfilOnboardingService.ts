import axios from "axios";
import api, { getApiErrorMessage } from "./api";
import { updateAnswer } from "./onboardingAnswersStore";
import {
  montarPayloadInvestidor,
  montarPayloadStartup,
  validarPayloadInvestidor,
  validarPayloadStartup,
} from "./perfilFromOnboarding";
import type { RespostasInvestidor, RespostasStartup, PerfilOnboarding } from "../types/onboarding";

// Criação do perfil no último passo do onboarding (ADR-001 e ADR-002 do front,
// D028 a D030 do back).

// Chave do JSON livre de /api/profile/onboarding onde fica o wizard inteiro.
// Gravada por mescla (updateAnswer), sem apagar as outras chaves (ADR-003).
export const CHAVE_RESPOSTAS_ONBOARDING = "onboarding";

export type TipoErroCriacaoPerfil = "validacao" | "rede" | "servidor";

export class ErroCriacaoPerfil extends Error {
  readonly tipo: TipoErroCriacaoPerfil;

  constructor(tipo: TipoErroCriacaoPerfil, mensagem: string) {
    super(mensagem);
    this.tipo = tipo;
  }
}

interface RespostasDoPerfil {
  startup: RespostasStartup;
  investidor: RespostasInvestidor;
}

function montarRequisicao<P extends PerfilOnboarding>(perfil: P, respostas: RespostasDoPerfil[P]) {
  if (perfil === "startup") {
    const corpo = montarPayloadStartup(respostas as RespostasStartup);
    return { url: "/api/profile/startup", corpo, erros: validarPayloadStartup(corpo) };
  }
  const corpo = montarPayloadInvestidor(respostas as RespostasInvestidor);
  return { url: "/api/profile/investor", corpo, erros: validarPayloadInvestidor(corpo) };
}

// Valida, monta o corpo e chama o POST. 409 (perfil já existe) conta como
// sucesso: acontece num segundo clique depois de uma resposta perdida.
// Lança ErroCriacaoPerfil em qualquer outra falha.
export async function criarPerfilPeloOnboarding<P extends PerfilOnboarding>(
  perfil: P,
  respostas: RespostasDoPerfil[P],
): Promise<void> {
  const { url, corpo, erros } = montarRequisicao(perfil, respostas);
  if (erros.length > 0) {
    throw new ErroCriacaoPerfil("validacao", erros.join(" "));
  }

  try {
    await api.post(url, corpo);
  } catch (error) {
    if (!axios.isAxiosError(error)) {
      throw new ErroCriacaoPerfil("servidor", "Não foi possível criar o seu perfil.");
    }
    const status = error.response?.status;
    if (status === 409) return;
    if (status === undefined) {
      throw new ErroCriacaoPerfil("rede", getApiErrorMessage(error, "Não foi possível conectar ao servidor."));
    }
    const mensagem = getApiErrorMessage(error, "Não foi possível criar o seu perfil.");
    throw new ErroCriacaoPerfil(status === 400 ? "validacao" : "servidor", mensagem);
  }
}

// Guarda as respostas completas do wizard no back, na chave "onboarding".
// Nunca lança: o perfil já foi criado e isto é só um complemento.
export async function salvarRespostasOnboardingNoBack<P extends PerfilOnboarding>(
  perfil: P,
  respostas: RespostasDoPerfil[P],
): Promise<void> {
  try {
    await updateAnswer(CHAVE_RESPOSTAS_ONBOARDING, () => ({
      perfil,
      concluidoEm: new Date().toISOString(),
      ...respostas,
    }));
  } catch (error) {
    console.warn("Não foi possível guardar as respostas do onboarding no servidor.", error);
  }
}
