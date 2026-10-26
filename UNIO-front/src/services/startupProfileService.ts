import api from "./api";
import type { StartupProfileResponse, StartupProfileUpdateRequest } from "../types/startupProfile";

// Startup profile of the logged user (ProfileController, /api/profile/me).
// Uses the shared axios instance: JWT Bearer token and 401 redirect come
// from services/api.ts. Edits are applied right away (no moderation).

export async function getMyStartupProfile(): Promise<StartupProfileResponse> {
  const response = await api.get<StartupProfileResponse>("/api/profile/me");
  return response.data;
}

// Returns the profile as saved by the backend (new baseline of the form)
export async function updateMyStartupProfile(body: StartupProfileUpdateRequest): Promise<StartupProfileResponse> {
  const response = await api.put<StartupProfileResponse>("/api/profile/me", body);
  return response.data;
}