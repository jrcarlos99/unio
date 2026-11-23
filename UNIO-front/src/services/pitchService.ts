import type { StartupPitch, UpdatePitchRequest } from "../types/pitch";
import {
  PITCH_STORAGE_KEY,
  PitchStorageError,
  SHORT_PITCH_STORAGE_KEY,
  parseStoredPitch,
  toStoredPitch,
} from "../utils/pitch";
import { AnswersTooLargeError, readAnswers, updateAnswers } from "./onboardingAnswersStore";

// Single data access point for the "Pitch & Lean Canvas" page.
//
// The backend has no pitch endpoint, so the page is stored in the free-form
// answers of GET/PUT /api/profile/onboarding (same as team, documents and
// visibility): the short pitch in respostas.pitch, the key the onboarding
// fills and the matchmaking reads, and the rest in respostas.pitchLeanCanvas.
//
// TODO(api): there is no content moderation in the backend yet, so
// publishing marks the pitch as PUBLISHED right away instead of IN_REVIEW.

const STORAGE_FULL = "Não há espaço para salvar o pitch. Encurte os blocos do canvas ou libere espaço nas abas Equipe ou Documentos.";

function pitchOf(answers: Record<string, unknown>): StartupPitch {
  return parseStoredPitch(answers[SHORT_PITCH_STORAGE_KEY], answers[PITCH_STORAGE_KEY]);
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
  return pitchOf(await readAnswers());
}

// Saves the changes as a draft; the startup still has to publish them
export async function updateMyPitch(body: UpdatePitchRequest): Promise<StartupPitch> {
  return savePitch(() => ({
    [SHORT_PITCH_STORAGE_KEY]: body.shortPitch,
    [PITCH_STORAGE_KEY]: toStoredPitch(body, "DRAFT"),
  }));
}

export async function publishMyPitch(): Promise<StartupPitch> {
  return savePitch((current) => {
    if (!current.shortPitch.trim()) throw new PitchStorageError("Escreva o pitch curto para publicar.");
    return { [PITCH_STORAGE_KEY]: toStoredPitch(current, "PUBLISHED") };
  });
}
