import type { PerfilOnboarding, StatusOnboarding } from "../types/onboarding";

async function getApi() {
  const module = await import("./api");
  return module.default;
}

// Único ponto de persistência do onboarding. As respostas precisam chegar ao
// back para que o motor de IA consiga comparar perfis.

export function chaveUsuario(user: { email: string }) {
  return user.email.trim().toLowerCase();
}

interface RegistroStatus {
  status: StatusOnboarding;
  perfil: PerfilOnboarding;
  atualizadoEm: string;
}

export type StatusOnboardingBack = "PENDENTE" | "CONCLUIDO" | "PULADO";

function chaveStatus(userKey: string) {
  return `unio_onboarding_${userKey.trim().toLowerCase()}`;
}

function lerStatusLocalRegistrado(userKey: string): RegistroStatus | null {
  try {
    const valor = localStorage.getItem(chaveStatus(userKey));
    return valor ? JSON.parse(valor) as RegistroStatus : null;
  } catch {
    return null;
  }
}

export async function lerStatusLocal(userKey: string): Promise<StatusOnboarding | null> {
  return lerStatusLocalRegistrado(userKey)?.status ?? null;
}

export async function gravarStatusLocal(
  userKey: string,
  perfil: PerfilOnboarding,
  status: Exclude<StatusOnboarding, "pendente">,
): Promise<void> {
  const registro: RegistroStatus = {
    status,
    perfil,
    atualizadoEm: new Date().toISOString(),
  };
  localStorage.setItem(chaveStatus(userKey), JSON.stringify(registro));
}

export function statusOnboardingDoBack(status: unknown): StatusOnboarding {
  if (status === "CONCLUIDO") return "concluido";
  if (status === "PULADO") return "pulado";
  return "pendente";
}

export function statusOnboardingParaBack(status: StatusOnboarding): StatusOnboardingBack {
  if (status === "concluido") return "CONCLUIDO";
  if (status === "pulado") return "PULADO";
  return "PENDENTE";
}

export function statusEfetivo(status: StatusOnboarding, temPerfil: boolean): StatusOnboarding {
  return temPerfil ? status : "pendente";
}

export async function getStatus(userKey: string): Promise<StatusOnboarding> {
  void userKey;
  const api = await getApi();
  const { data } = await api.get<{ status: string }>("/api/profile/onboarding");
  return data.status.toLowerCase() as StatusOnboarding;
}

export async function loadAnswers<T>(
  userKey: string,
  perfil: PerfilOnboarding,
): Promise<Partial<T> | null> {
  void userKey;
  void perfil;
  const api = await getApi();
  const { data } = await api.get<{ respostas: Partial<T> }>("/api/profile/onboarding");
  return data.respostas ?? null;
}

export async function saveAnswers<T>(
  userKey: string,
  perfil: PerfilOnboarding,
  respostas: T,
): Promise<void> {
  void userKey;
  void perfil;
  const api = await getApi();
  await api.put("/api/profile/onboarding", { respostas });
}

export async function markCompleted<T>(
  userKey: string,
  perfil: PerfilOnboarding,
  respostas: T,
): Promise<void> {
  void userKey;
  void perfil;
  const api = await getApi();
  await api.put("/api/profile/onboarding", { status: "CONCLUIDO", respostas });
}

// As respostas parciais continuam salvas, pra quem pulou poder retomar
// depois de onde parou.
export async function markSkipped(
  userKey: string,
  perfil: PerfilOnboarding,
): Promise<void> {
  void userKey;
  void perfil;
  const api = await getApi();
  await api.put("/api/profile/onboarding", { status: "PULADO" });
}
