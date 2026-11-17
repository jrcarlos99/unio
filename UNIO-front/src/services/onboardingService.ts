import type { PerfilOnboarding, StatusOnboarding } from "../types/onboarding";

// Persistência do estado do wizard (status e respostas por e-mail) no
// localStorage do navegador. A criação do perfil no back e a cópia das
// respostas em /api/profile/onboarding ficam em perfilOnboardingService.ts.
// Todas as funções já retornam Promise, pra poderem virar chamadas HTTP sem
// mudar as telas.

const PREFIXO = "unio_onboarding_";

interface RegistroStatus {
  status: Exclude<StatusOnboarding, "pendente">;
  perfil: PerfilOnboarding;
  atualizadoEm: string;
}

// Identificador do usuário usado nas chaves. Usa o e-mail porque é o único
// dado que existe tanto logo após o cadastro (a resposta do /register não
// traz id) quanto após o login (/api/profile/me) — com o id, a mesma pessoa
// ficaria com duas chaves diferentes.
export function chaveUsuario(user: { email: string }) {
  return user.email.trim().toLowerCase();
}

const chaveStatus = (userKey: string) => `${PREFIXO}${userKey}`;
const chaveRespostas = (userKey: string, perfil: PerfilOnboarding) =>
  `${PREFIXO}${userKey}_${perfil}_respostas`;

// localStorage pode lançar erro (modo privado, cota cheia); nesse caso o
// onboarding continua funcionando, só não sobrevive ao recarregar a página.
function ler<T>(chave: string): T | null {
  try {
    const bruto = localStorage.getItem(chave);
    return bruto ? (JSON.parse(bruto) as T) : null;
  } catch {
    return null;
  }
}

function gravar(chave: string, valor: unknown) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    // ver comentário em ler()
  }
}

export async function getStatus(userKey: string): Promise<StatusOnboarding> {
  return (await lerStatusLocal(userKey)) ?? "pendente";
}

// null = este navegador nunca gravou o status (ex.: login em outro navegador).
// O OnboardingGate usa isso para consultar o back antes de mandar ao wizard.
export async function lerStatusLocal(userKey: string): Promise<StatusOnboarding | null> {
  return ler<RegistroStatus>(chaveStatus(userKey))?.status ?? null;
}

// Grava o status vindo do back (concluído ou pulado em outro navegador)
export async function gravarStatusLocal(
  userKey: string,
  perfil: PerfilOnboarding,
  status: Exclude<StatusOnboarding, "pendente">,
): Promise<void> {
  const registro: RegistroStatus = { status, perfil, atualizadoEm: new Date().toISOString() };
  gravar(chaveStatus(userKey), registro);
}

// Status do /api/profile/onboarding (PENDENTE, CONCLUIDO, PULADO) ↔ front.
// Qualquer outro valor (ou ausente) conta como pendente.
export type StatusOnboardingBack = "PENDENTE" | "CONCLUIDO" | "PULADO";

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

// Conta sem perfil precisa passar pelo onboarding para criá-lo (ADR-001),
// então "concluido"/"pulado" antigos no localStorage (ex.: contas de teste de
// antes da mudança) valem como "pendente". Nada é apagado: as respostas salvas
// continuam lá e o wizard retoma de onde parou.
export function statusEfetivo(status: StatusOnboarding, temPerfil: boolean): StatusOnboarding {
  return temPerfil ? status : "pendente";
}

export async function loadAnswers<T>(
  userKey: string,
  perfil: PerfilOnboarding,
): Promise<Partial<T> | null> {
  return ler<Partial<T>>(chaveRespostas(userKey, perfil));
}

export async function saveAnswers<T>(
  userKey: string,
  perfil: PerfilOnboarding,
  respostas: T,
): Promise<void> {
  gravar(chaveRespostas(userKey, perfil), respostas);
}

export async function markCompleted<T>(
  userKey: string,
  perfil: PerfilOnboarding,
  respostas: T,
): Promise<void> {
  gravar(chaveRespostas(userKey, perfil), respostas);
  const registro: RegistroStatus = {
    status: "concluido",
    perfil,
    atualizadoEm: new Date().toISOString(),
  };
  gravar(chaveStatus(userKey), registro);
}

// As respostas parciais continuam salvas, pra quem pulou poder retomar
// depois de onde parou.
export async function markSkipped(
  userKey: string,
  perfil: PerfilOnboarding,
): Promise<void> {
  const registro: RegistroStatus = {
    status: "pulado",
    perfil,
    atualizadoEm: new Date().toISOString(),
  };
  gravar(chaveStatus(userKey), registro);
}
