import api from "./api";
import { AnswersTooLargeError, readAnswer, updateAnswer } from "./onboardingAnswersStore";
import type {
  InvestorProfileExtras,
  InvestorProfileResponse,
  InvestorProfileUpdateRequest,
} from "../types/investorProfile";
import {
  INVESTOR_EXTRAS_STORAGE_KEY,
  InvestorExtrasStorageError,
  parseStoredInvestorExtras,
  toStoredInvestorExtras,
} from "../utils/investorProfile";

const STORAGE_FULL = "Não há espaço para salvar as informações do perfil. Reduza a biografia e tente novamente.";

export async function getMyInvestorProfile(): Promise<InvestorProfileResponse> {
  const response = await api.get<InvestorProfileResponse>("/api/profile/me");
  return response.data;
}

export async function updateMyInvestorProfile(body: InvestorProfileUpdateRequest): Promise<InvestorProfileResponse> {
  const response = await api.put<InvestorProfileResponse>("/api/profile/me", body);
  return response.data;
}

export async function getInvestorExtras(): Promise<InvestorProfileExtras> {
  return parseStoredInvestorExtras(await readAnswer(INVESTOR_EXTRAS_STORAGE_KEY));
}

export async function saveInvestorExtras(extras: InvestorProfileExtras): Promise<InvestorProfileExtras> {
  try {
    const stored = await updateAnswer(INVESTOR_EXTRAS_STORAGE_KEY, (current) => {
      parseStoredInvestorExtras(current);
      return toStoredInvestorExtras(extras);
    });
    return parseStoredInvestorExtras(stored);
  } catch (error) {
    if (error instanceof AnswersTooLargeError) throw new InvestorExtrasStorageError(STORAGE_FULL);
    throw error;
  }
}
