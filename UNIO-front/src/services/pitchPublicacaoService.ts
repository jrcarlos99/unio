import axios from "axios";
import type { PitchPublication, PublishedPitch } from "../types/pitch.ts";
import api from "./api.ts";
import {
  PUBLICACAO_VAZIA,
  pitchPublicadoDoBack,
  publicacaoDoBack,
  type PitchPublicationBack,
  type PublishedPitchBack,
} from "./pitchPublicacao.mapping.ts";

// Publicação do pitch e do Lean Canvas (D063 do back, ADR-013).
// - A startup salva o pitch nas respostas do onboarding (pitchService.ts) e
//   envia com POST .../publication: o back lê o que foi salvo, sem corpo.
// - O investidor lê só o que está PUBLICADO; 404 = ainda não publicou.

const PUBLICACAO = "/api/profile/startup/pitch/publication";

function naoEncontrado(erro: unknown) {
  return axios.isAxiosError(erro) && erro.response?.status === 404;
}

export async function obterMinhaPublicacao(): Promise<PitchPublication> {
  try {
    const { data } = await api.get<PitchPublicationBack>(PUBLICACAO);
    return publicacaoDoBack(data);
  } catch (erro) {
    // Back sem a rota ainda (publicado antes do front): a página abre como rascunho
    if (naoEncontrado(erro)) return PUBLICACAO_VAZIA;
    throw erro;
  }
}

export async function enviarPublicacao(): Promise<PitchPublication> {
  const { data } = await api.post<PitchPublicationBack>(PUBLICACAO);
  return publicacaoDoBack(data);
}

// null quando a startup ainda não publicou (404), sem tratar como erro
export async function obterPitchPublicado(startupId: string): Promise<PublishedPitch | null> {
  try {
    const { data } = await api.get<PublishedPitchBack>(`/api/discovery/startups/${encodeURIComponent(startupId)}/pitch`);
    return pitchPublicadoDoBack(data);
  } catch (erro) {
    if (naoEncontrado(erro)) return null;
    throw erro;
  }
}
