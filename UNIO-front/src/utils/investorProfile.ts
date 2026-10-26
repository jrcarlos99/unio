import type {
  DisponibilidadeMentoria,
  InvestorProfileErrors,
  InvestorProfileExtras,
  InvestorProfileField,
  InvestorProfileFormValues,
  InvestorProfileResponse,
  InvestorProfileUpdateRequest,
  StoredInvestorProfileExtras,
} from "../types/investorProfile";

export const INVESTOR_EXTRAS_STORAGE_KEY = "investorProfileExtras";
export const INVESTOR_EXTRAS_STORAGE_VERSION = 1;
export const NOTE_MAX = 255;
export const BIO_MAX = 600;
export const TEXT_MAX = 255;
export const SPECIALTIES_MAX = 3;

export const SPECIALTY_OPTIONS = [
  "Finanças & Fluxo de Caixa",
  "Go-to-market B2B",
  "Captação & Pitch Deck",
  "Desenvolvimento de Produto",
  "Jurídico & M&A",
  "Arquitetura de Tecnologia",
];

export const AVAILABILITY_OPTIONS: DisponibilidadeMentoria[] = ["BAIXA", "MEDIA", "ALTA"];

const AVAILABILITY_LABELS: Record<DisponibilidadeMentoria, string> = {
  BAIXA: "Até 2 horas por mês (1 sessão)",
  MEDIA: "Até 4 horas por mês (2 sessões quinzenais)",
  ALTA: "Mais de 4 horas por mês (3 ou mais sessões)",
};

export function availabilityLabel(value: string): string {
  return AVAILABILITY_LABELS[value as DisponibilidadeMentoria] ?? value;
}

export const INVESTOR_PROFILE_FIELDS: InvestorProfileField[] = [
  "especialidades",
  "disponibilidade",
  "disponibilidadeObservacao",
  "bio",
  "linkedin",
  "rede",
];

export function investorFieldId(field: InvestorProfileField) {
  return `investor-profile-field-${field}`;
}

const EMPTY_EXTRAS: InvestorProfileExtras = { especialidades: [], bio: "", linkedin: "", rede: "" };

export class InvestorExtrasStorageError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function parseStoredInvestorExtras(value: unknown): InvestorProfileExtras {
  if (value === undefined || value === null) return EMPTY_EXTRAS;
  if (!isRecord(value) || value.version !== INVESTOR_EXTRAS_STORAGE_VERSION || !isRecord(value.extras)) {
    throw new InvestorExtrasStorageError(
      "As informações do perfil foram salvas em um formato que esta versão do app não reconhece.",
    );
  }
  const extras = value.extras;
  const specialties = Array.isArray(extras.especialidades)
    ? extras.especialidades.filter((item): item is string => typeof item === "string" && item.trim() !== "")
    : [];
  return {
    especialidades: Array.from(new Set(specialties)),
    bio: text(extras.bio),
    linkedin: text(extras.linkedin),
    rede: text(extras.rede),
  };
}

export function toStoredInvestorExtras(extras: InvestorProfileExtras): StoredInvestorProfileExtras {
  return { version: INVESTOR_EXTRAS_STORAGE_VERSION, extras, updatedAt: new Date().toISOString() };
}

export function toInvestorFormValues(
  profile: InvestorProfileResponse,
  extras: InvestorProfileExtras,
): InvestorProfileFormValues {
  const availability = AVAILABILITY_OPTIONS.find((option) => option === profile.disponibilidade) ?? "";
  return {
    ...extras,
    mentoria: availability !== "",
    disponibilidade: availability,
    disponibilidadeObservacao: profile.disponibilidadeObservacao ?? "",
  };
}

export function toInvestorUpdateRequest(values: InvestorProfileFormValues): InvestorProfileUpdateRequest {
  return {
    disponibilidade: values.mentoria && values.disponibilidade ? values.disponibilidade : null,
    disponibilidadeObservacao: values.disponibilidadeObservacao.trim(),
  };
}

export function toInvestorExtras(values: InvestorProfileFormValues): InvestorProfileExtras {
  return {
    especialidades: values.especialidades,
    bio: values.bio.trim(),
    linkedin: values.linkedin.trim(),
    rede: values.rede.trim(),
  };
}

function isLinkedinUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:" && (host === "linkedin.com" || host.endsWith(".linkedin.com"));
  } catch {
    return false;
  }
}

export function validateInvestorProfile(values: InvestorProfileFormValues): InvestorProfileErrors {
  const errors: InvestorProfileErrors = {};

  if (values.mentoria) {
    if (values.especialidades.length > SPECIALTIES_MAX) {
      errors.especialidades = `Escolha no máximo ${SPECIALTIES_MAX} especialidades.`;
    }
    if (!values.disponibilidade) errors.disponibilidade = "Selecione sua disponibilidade de agenda.";
  }
  if (values.disponibilidadeObservacao.trim().length > NOTE_MAX) {
    errors.disponibilidadeObservacao = `Use no máximo ${NOTE_MAX} caracteres.`;
  }
  if (values.bio.length > BIO_MAX) {
    errors.bio = `A biografia pode ter no máximo ${BIO_MAX} caracteres.`;
  }
  const linkedin = values.linkedin.trim();
  if (linkedin && !isLinkedinUrl(linkedin)) {
    errors.linkedin = "Use o endereço completo, como https://linkedin.com/in/seu-perfil.";
  }
  if (values.rede.trim().length > TEXT_MAX) {
    errors.rede = `Use no máximo ${TEXT_MAX} caracteres.`;
  }

  return errors;
}

export function firstInvalidInvestorField(errors: InvestorProfileErrors): InvestorProfileField | null {
  return INVESTOR_PROFILE_FIELDS.find((field) => errors[field]) ?? null;
}

// What PUT /api/profile/me would change. The switch counts on its own, so
// turning it on before picking an availability still shows the bar.
export function sameBackendContent(a: InvestorProfileFormValues, b: InvestorProfileFormValues) {
  const left = toInvestorUpdateRequest(a);
  const right = toInvestorUpdateRequest(b);
  return (
    a.mentoria === b.mentoria &&
    left.disponibilidade === right.disponibilidade &&
    left.disponibilidadeObservacao === right.disponibilidadeObservacao
  );
}

// What the onboarding answers key would change
export function sameExtrasContent(a: InvestorProfileFormValues, b: InvestorProfileFormValues) {
  const left = toInvestorExtras(a);
  const right = toInvestorExtras(b);
  return (
    left.especialidades.length === right.especialidades.length &&
    left.especialidades.every((item) => right.especialidades.includes(item)) &&
    left.bio === right.bio &&
    left.linkedin === right.linkedin &&
    left.rede === right.rede
  );
}

function plural(n: number, singular: string, pluralForm: string) {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}

// Short text for the pending changes bar, e.g. "2 especialidades
// adicionadas, 1 campo alterado"
export function pendingChangesSummary(values: InvestorProfileFormValues, saved: InvestorProfileFormValues): string {
  const parts: string[] = [];
  const before = toInvestorUpdateRequest(saved);
  const after = toInvestorUpdateRequest(values);

  if (values.mentoria !== saved.mentoria) parts.push(values.mentoria ? "mentoria ativada" : "mentoria desativada");

  const added = values.especialidades.filter((item) => !saved.especialidades.includes(item)).length;
  const removed = saved.especialidades.filter((item) => !values.especialidades.includes(item)).length;
  if (added) parts.push(plural(added, "especialidade adicionada", "especialidades adicionadas"));
  if (removed) parts.push(plural(removed, "especialidade removida", "especialidades removidas"));

  const availabilityChanged =
    before.disponibilidade !== null && after.disponibilidade !== null && before.disponibilidade !== after.disponibilidade;
  const textFields = (["disponibilidadeObservacao", "bio", "linkedin", "rede"] as const).filter(
    (field) => values[field].trim() !== saved[field].trim(),
  );
  const changed = textFields.length + (availabilityChanged ? 1 : 0);
  if (changed) parts.push(plural(changed, "campo alterado", "campos alterados"));

  const summary = parts.join(", ");
  return summary ? summary.charAt(0).toUpperCase() + summary.slice(1) + "." : "Revise e salve suas alterações.";
}
