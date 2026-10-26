import type { VisibilitySettings } from "../types/visibility";
import {
  VISIBILITY_STORAGE_KEY,
  VisibilityStorageError,
  parseStoredVisibility,
  toStoredVisibility,
} from "../utils/visibility";
import { AnswersTooLargeError, readAnswer, updateAnswer } from "./onboardingAnswersStore";

const STORAGE_FULL = "Não há espaço para salvar as preferências. Libere espaço nas abas Equipe ou Documentos.";

export async function getVisibility(): Promise<VisibilitySettings> {
  return parseStoredVisibility(await readAnswer(VISIBILITY_STORAGE_KEY));
}

export async function saveVisibility(settings: VisibilitySettings): Promise<VisibilitySettings> {
  try {
    const stored = await updateAnswer(VISIBILITY_STORAGE_KEY, (current) => {
      parseStoredVisibility(current);
      return toStoredVisibility(settings);
    });
    return parseStoredVisibility(stored);
  } catch (error) {
    if (error instanceof AnswersTooLargeError) throw new VisibilityStorageError(STORAGE_FULL);
    throw error;
  }
}
