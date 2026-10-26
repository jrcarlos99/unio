import api from "./api";
import type { TeamMember } from "../types/team";
import {
  ONBOARDING_MAX_BYTES,
  TEAM_STORAGE_KEY,
  TeamStorageError,
  parseStoredTeam,
  toStoredTeam,
  utf8Size,
} from "../utils/team";

const ONBOARDING_URL = "/api/profile/onboarding";

interface OnboardingResponse {
  status: string;
  respostas: Record<string, unknown> | null;
  atualizadoEm: string | null;
}

async function getAnswers() {
  const { data } = await api.get<OnboardingResponse>(ONBOARDING_URL);
  return data.respostas ?? {};
}

export async function getTeam(): Promise<TeamMember[]> {
  return parseStoredTeam((await getAnswers())[TEAM_STORAGE_KEY]);
}

export async function saveTeam(members: TeamMember[]): Promise<TeamMember[]> {
  const answers = await getAnswers();

  parseStoredTeam(answers[TEAM_STORAGE_KEY]);

  const respostas = { ...answers, [TEAM_STORAGE_KEY]: toStoredTeam(members) };
  if (utf8Size(JSON.stringify(respostas)) > ONBOARDING_MAX_BYTES) {
    throw new TeamStorageError(
      "Não há espaço para salvar essa alteração. Encurte as bios ou remova um membro e tente novamente.",
    );
  }

  const { data } = await api.put<OnboardingResponse>(ONBOARDING_URL, { respostas });
  return parseStoredTeam((data.respostas ?? {})[TEAM_STORAGE_KEY]);
}
