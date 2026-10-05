import api from "../../../services/api";
import { MOCK_STARTUP_HOME } from "../data/mockStartupHome";
import type { StartupHomeResponse } from "../types";

export const HOME_ENDPOINT = "/api/startups/me/home";

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === "true";
const MOCK_DELAY_MS = 400;

function resolveMock(signal?: AbortSignal): Promise<StartupHomeResponse> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(() => resolve(MOCK_STARTUP_HOME), MOCK_DELAY_MS);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

export async function fetchStartupHome(signal?: AbortSignal): Promise<StartupHomeResponse> {
  if (USE_MOCKS) return resolveMock(signal);
  const response = await api.get<StartupHomeResponse>(HOME_ENDPOINT, { signal });
  return response.data;
}
