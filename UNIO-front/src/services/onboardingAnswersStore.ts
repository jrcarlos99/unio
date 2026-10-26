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

async function getAnswers() {
  const { data } = await api.get<OnboardingResponse>(ONBOARDING_URL);
  return data.respostas ?? {};
}

export async function readAnswer(key: string): Promise<unknown> {
  return (await getAnswers())[key];
}

export async function updateAnswer(key: string, update: (current: unknown) => unknown): Promise<unknown> {
  const answers = await getAnswers();
  const respostas = { ...answers, [key]: update(answers[key]) };
  if (new TextEncoder().encode(JSON.stringify(respostas)).length > ONBOARDING_MAX_BYTES) {
    throw new AnswersTooLargeError();
  }

  const { data } = await api.put<OnboardingResponse>(ONBOARDING_URL, { respostas });
  return (data.respostas ?? {})[key];
}
