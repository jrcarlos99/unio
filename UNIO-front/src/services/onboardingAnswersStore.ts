import api from "./api";

const ONBOARDING_URL = "/api/profile/onboarding";

export const ONBOARDING_MAX_BYTES = 20 * 1024;

interface OnboardingResponse {
  status: string;
  respostas: Record<string, unknown> | null;
  atualizadoEm: string | null;
}

export class AnswersTooLargeError extends Error {
  constructor() {
    super(`Onboarding answers would exceed ${ONBOARDING_MAX_BYTES} bytes`);
  }
}

export async function readAnswers(): Promise<Record<string, unknown>> {
  const { data } = await api.get<OnboardingResponse>(ONBOARDING_URL);
  return data.respostas ?? {};
}

export async function readAnswer(key: string): Promise<unknown> {
  return (await readAnswers())[key];
}

// Read-modify-write of the whole answers object, for changes that touch more
// than one key. Returns the answers saved by the backend.
export async function updateAnswers(
  update: (current: Record<string, unknown>) => Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const respostas = update(await readAnswers());
  if (new TextEncoder().encode(JSON.stringify(respostas)).length > ONBOARDING_MAX_BYTES) {
    throw new AnswersTooLargeError();
  }

  const { data } = await api.put<OnboardingResponse>(ONBOARDING_URL, { respostas });
  return data.respostas ?? {};
}

export async function updateAnswer(key: string, update: (current: unknown) => unknown): Promise<unknown> {
  const respostas = await updateAnswers((answers) => ({ ...answers, [key]: update(answers[key]) }));
  return respostas[key];
}
