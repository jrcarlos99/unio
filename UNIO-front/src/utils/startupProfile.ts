import { ESTAGIOS, MODELOS_NEGOCIO, SEGMENTOS, SEGMENTOS_DETALHADOS } from "../data/options";
import type {
  StartupProfileErrors,
  StartupProfileField,
  StartupProfileFormValues,
  StartupProfileResponse,
  StartupProfileUpdateRequest,
} from "../types/startupProfile";

export const TEXT_MAX = 255;

export const PITCH_MAX = 500;

export const CAPITAL_MAX_DIGITS = 15;

// Order of the fields on screen (used to focus the first invalid one)
export const PROFILE_FIELDS: StartupProfileField[] = [
  "nome",
  "segmento",
  "estagio",
  "localizacao",
  "modeloNegocio",
  "mercadoAlvo",
  "capitalProcurado",
  "pitchCanvas",
];

export function profileFieldId(field: StartupProfileField) {
  return `profile-field-${field}`;
}

export const SEGMENT_OPTIONS: string[] = Array.from(
  new Set<string>([...SEGMENTOS_DETALHADOS.map((option) => option.valor), ...SEGMENTOS]),
);
export const STAGE_OPTIONS: string[] = [...ESTAGIOS];
export const BUSINESS_MODEL_OPTIONS: string[] = [...MODELOS_NEGOCIO];

// A saved value outside the list (e.g. typed in the old signup form) stays
// selectable, so opening the page never changes data by itself.
export function withSavedOption(options: string[], saved: string): string[] {
  return saved && !options.includes(saved) ? [saved, ...options] : options;
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

// "500000" -> "R$ 500.000"
export function formatBrl(digits: string): string {
  return digits ? brl.format(Number(digits)) : "";
}

// Anything typed -> digits only, no leading zeros, at most CAPITAL_MAX_DIGITS
export function toCapitalDigits(raw: string): string {
  return raw.replace(/\D/g, "").replace(/^0+/, "").slice(0, CAPITAL_MAX_DIGITS);
}

type RequiredTextField = Exclude<StartupProfileField, "capitalProcurado" | "pitchCanvas">;

const REQUIRED_TEXT: { field: RequiredTextField; message: string }[] = [
  { field: "nome", message: "Informe o nome da startup." },
  { field: "segmento", message: "Selecione o segmento principal." },
  { field: "estagio", message: "Selecione o estágio atual." },
  { field: "localizacao", message: "Informe a localização." },
  { field: "modeloNegocio", message: "Selecione o modelo de negócio." },
  { field: "mercadoAlvo", message: "Informe o mercado alvo." },
];

export function validateProfile(values: StartupProfileFormValues): StartupProfileErrors {
  const errors: StartupProfileErrors = {};

  for (const { field, message } of REQUIRED_TEXT) {
    const value = values[field].trim();
    if (!value) errors[field] = message;
    else if (value.length > TEXT_MAX) errors[field] = `Use no máximo ${TEXT_MAX} caracteres.`;
  }

  if (!values.capitalProcurado || Number(values.capitalProcurado) <= 0) {
    errors.capitalProcurado = "Informe um valor maior que zero.";
  }

  if (values.pitchCanvas.length > PITCH_MAX) {
    errors.pitchCanvas = `O pitch pode ter no máximo ${PITCH_MAX} caracteres.`;
  }

  return errors;
}

export function firstInvalidProfileField(errors: StartupProfileErrors): StartupProfileField | null {
  return PROFILE_FIELDS.find((field) => errors[field]) ?? null;
}

export function toProfileFormValues(profile: StartupProfileResponse): StartupProfileFormValues {
  const capital = Number(profile.capitalProcurado);
  return {
    nome: profile.nome ?? "",
    segmento: profile.segmento ?? "",
    estagio: profile.estagio ?? "",
    localizacao: profile.localizacao ?? "",
    modeloNegocio: profile.modeloNegocio ?? "",
    mercadoAlvo: profile.mercadoAlvo ?? "",
    // Whole reais for display; the cents stay in the database (see below)
    capitalProcurado: Number.isFinite(capital) && capital > 0 ? String(Math.trunc(capital)) : "",
    pitchCanvas: profile.pitchCanvas ?? "",
  };
}

export function toProfileUpdateRequest(
  values: StartupProfileFormValues,
  saved: StartupProfileFormValues,
): StartupProfileUpdateRequest {
  const body: StartupProfileUpdateRequest = {
    nome: values.nome.trim(),
    segmento: values.segmento.trim(),
    estagio: values.estagio.trim(),
    localizacao: values.localizacao.trim(),
    modeloNegocio: values.modeloNegocio.trim(),
    mercadoAlvo: values.mercadoAlvo.trim(),
    // "" instead of null: the backend would store null as the text "null"
    pitchCanvas: values.pitchCanvas.trim(),
  };
  if (values.capitalProcurado !== saved.capitalProcurado) {
    body.capitalProcurado = Number(values.capitalProcurado);
  }
  return body;
}

export function sameProfileContent(a: StartupProfileFormValues, b: StartupProfileFormValues): boolean {
  return PROFILE_FIELDS.every((field) =>
    field === "capitalProcurado" ? a[field] === b[field] : a[field].trim() === b[field].trim(),
  );
}
