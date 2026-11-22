import type { PitchPublication, StartupPitch, UpdatePitchRequest } from "../types/pitch";
import {
  PITCH_STORAGE_KEY,
  PitchStorageError,
  SHORT_PITCH_STORAGE_KEY,
  parseStoredPitch,
  toStoredPitch,
} from "../utils/pitch";
import { AnswersTooLargeError, readAnswers, updateAnswers } from "./onboardingAnswersStore";
import { enviarPublicacao, obterMinhaPublicacao } from "./pitchPublicacaoService";

// Single data access point for the "Pitch & Lean Canvas" page.
//
// The draft lives in the free-form answers of GET/PUT /api/profile/onboarding
// (same as team, documents and visibility): the short pitch in
// respostas.pitch, the key the onboarding fills and the matchmaking reads,
// and the rest in respostas.pitchLeanCanvas.
//
// Publishing is POST /api/profile/startup/pitch/publication (D063 of the
// backend, ADR-013): the backend copies what is saved in the answers, so the
// page always saves first. The status shown (in review, published, removed)
// comes from the last submission, never from the answers.

const STORAGE_FULL = "Não há espaço para salvar o pitch. Encurte os blocos do canvas ou libere espaço nas abas Equipe ou Documentos.";

function pitchOf(answers: Record<string, unknown>): StartupPitch {
  return parseStoredPitch(answers[SHORT_PITCH_STORAGE_KEY], answers[PITCH_STORAGE_KEY]);
}

function withPublication(pitch: StartupPitch, publication: PitchPublication): StartupPitch {
  return { ...pitch, status: publication.status, publication };
}

async function savePitch(update: (current: StartupPitch) => Record<string, unknown>): Promise<StartupPitch> {
  try {
    // pitchOf also refuses to overwrite a pitch saved in an unknown format
    return pitchOf(await updateAnswers((answers) => ({ ...answers, ...update(pitchOf(answers)) })));
  } catch (error) {
    if (error instanceof AnswersTooLargeError) throw new PitchStorageError(STORAGE_FULL);
    throw error;
  }
}

export async function getMyPitch(): Promise<StartupPitch> {
  const [answers, publication] = await Promise.all([readAnswers(), obterMinhaPublicacao()]);
  return withPublication(pitchOf(answers), publication);
}

// Saves the changes as a draft; the startup still has to submit them. The
// status of the last submission is kept.
export async function updateMyPitch(body: UpdatePitchRequest, publication: PitchPublication | null): Promise<StartupPitch> {
  const saved = await savePitch(() => ({
    [SHORT_PITCH_STORAGE_KEY]: body.shortPitch,
    [PITCH_STORAGE_KEY]: toStoredPitch(body, "DRAFT"),
  }));
  return publication ? withPublication(saved, publication) : saved;
}

// Submits what is saved: IN_REVIEW, or PUBLISHED when the backend does not
// require approval
export async function publishMyPitch(): Promise<StartupPitch> {
  const pitch = pitchOf(await readAnswers());
  if (!pitch.shortPitch.trim()) throw new PitchStorageError("Escreva o pitch curto para publicar.");
  return withPublication(pitch, await enviarPublicacao());
}
