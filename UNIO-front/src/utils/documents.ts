import type {
  DocumentCategory,
  DocumentErrors,
  DocumentField,
  DocumentFormat,
  DocumentFormValues,
  DocumentInput,
  RecommendedDocument,
  StartupDocument,
  StoredDocuments,
} from "../types/documents";

export const DOCUMENTS_MAX = 12;
export const TITLE_MAX = 100;
export const DESCRIPTION_MAX = 200;
export const DOCUMENT_URL_MAX = 500;

export const DOCUMENTS_STORAGE_KEY = "startupDocuments";
export const DOCUMENTS_STORAGE_VERSION = 1;

export class DocumentStorageError extends Error {}

export const CATEGORY_ORDER: DocumentCategory[] = ["pitch-deck", "financeiro", "juridico", "produto-tecnologia", "outros"];

export const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  "pitch-deck": "Pitch deck",
  financeiro: "Financeiro",
  juridico: "Jurídico",
  "produto-tecnologia": "Produto e tecnologia",
  outros: "Outros",
};

export const FORMAT_ORDER: DocumentFormat[] = ["pdf", "documento", "planilha", "apresentacao", "imagem", "outro"];

export const FORMAT_OPTION_LABELS: Record<DocumentFormat, string> = {
  pdf: "PDF",
  documento: "Documento (DOC/DOCX)",
  planilha: "Planilha (XLS/XLSX/CSV)",
  apresentacao: "Apresentação (PPT/PPTX)",
  imagem: "Imagem (PNG/JPG)",
  outro: "Outro",
};

export const FORMAT_LABELS: Record<DocumentFormat, string> = {
  pdf: "PDF",
  documento: "Documento",
  planilha: "Planilha",
  apresentacao: "Apresentação",
  imagem: "Imagem",
  outro: "Link",
};

export const RECOMMENDED_DOCUMENTS: { id: RecommendedDocument; label: string; category: DocumentCategory }[] = [
  { id: "pitch-deck", label: "Pitch deck", category: "pitch-deck" },
  { id: "plano-financeiro", label: "Plano financeiro", category: "financeiro" },
  { id: "contrato-social", label: "Contrato social", category: "juridico" },
  { id: "cap-table", label: "Cap table", category: "juridico" },
];

export const NO_RECOMMENDED_LABEL = "Nenhum";

export function recommendedLabel(id: RecommendedDocument) {
  return RECOMMENDED_DOCUMENTS.find((item) => item.id === id)?.label ?? "";
}

export function keyByLabel<K extends string>(labels: Record<K, string>, label: string): K | "" {
  const entry = (Object.entries(labels) as [K, string][]).find(([, value]) => value === label);
  return entry ? entry[0] : "";
}

export function recommendedByLabel(label: string): RecommendedDocument | null {
  return RECOMMENDED_DOCUMENTS.find((item) => item.label === label)?.id ?? null;
}

export function documentFieldId(field: DocumentField) {
  return `document-${field}`;
}

const FIELD_ORDER: DocumentField[] = ["title", "category", "format", "url", "description"];

export function parseDocumentUrl(raw: string | null): string | null {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed || trimmed.length > DOCUMENT_URL_MAX) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || !url.hostname.includes(".") || url.username || url.password) return null;
  return url.href;
}

export function sourceDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

const dateFormat = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

export function formatDocumentDate(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : dateFormat.format(date);
}

export const EMPTY_DOCUMENT_FORM: DocumentFormValues = {
  title: "",
  category: "",
  format: "",
  url: "",
  description: "",
  recommended: null,
};

export function documentFormFor(recommended: RecommendedDocument | null): DocumentFormValues {
  const item = RECOMMENDED_DOCUMENTS.find((entry) => entry.id === recommended);
  return item ? { ...EMPTY_DOCUMENT_FORM, recommended: item.id, category: item.category } : EMPTY_DOCUMENT_FORM;
}

export function toDocumentFormValues(document: StartupDocument): DocumentFormValues {
  return {
    title: document.title,
    category: document.category,
    format: document.format,
    url: document.url,
    description: document.description,
    recommended: document.recommended,
  };
}

export function validateDocument(values: DocumentFormValues): DocumentErrors {
  const errors: DocumentErrors = {};
  const title = values.title.trim();
  const url = values.url.trim();

  if (!title) errors.title = "Informe o título.";
  else if (title.length > TITLE_MAX) errors.title = `Use no máximo ${TITLE_MAX} caracteres.`;

  if (!values.category) errors.category = "Escolha a categoria.";
  if (!values.format) errors.format = "Escolha o formato.";

  if (!url) errors.url = "Informe o link do documento.";
  else if (url.length > DOCUMENT_URL_MAX) errors.url = `Use no máximo ${DOCUMENT_URL_MAX} caracteres.`;
  else if (!parseDocumentUrl(url)) errors.url = "Informe um link válido que comece com https://.";

  if (values.description.trim().length > DESCRIPTION_MAX) {
    errors.description = `A descrição pode ter no máximo ${DESCRIPTION_MAX} caracteres.`;
  }
  return errors;
}

export function firstInvalidDocumentField(errors: DocumentErrors) {
  return FIELD_ORDER.find((field) => errors[field]) ?? null;
}

export function toDocumentInput(values: DocumentFormValues): DocumentInput {
  return {
    title: values.title.trim(),
    category: values.category || "outros",
    description: values.description.trim(),
    recommended: values.recommended,
    source: { kind: "link", url: values.url.trim(), format: values.format || "outro" },
  };
}

function newDocumentId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function toStoredDocument(
  input: DocumentInput & { source: { kind: "link" } },
  existing?: StartupDocument,
): StartupDocument {
  const now = new Date().toISOString();
  return {
    id: existing?.id ?? newDocumentId(),
    title: input.title,
    category: input.category,
    format: input.source.format,
    url: parseDocumentUrl(input.source.url) ?? "",
    description: input.description,
    recommended: input.recommended,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export function groupDocuments(documents: StartupDocument[]) {
  return CATEGORY_ORDER.map((category) => ({
    category,
    documents: documents
      .filter((document) => document.category === category)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  })).filter((group) => group.documents.length > 0);
}

export function coveredRecommended(documents: StartupDocument[]): ReadonlySet<RecommendedDocument> {
  return new Set(documents.flatMap((document) => (document.recommended ? [document.recommended] : [])));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function oneOf<T extends string>(options: readonly T[], value: unknown): T | null {
  return options.find((option) => option === value) ?? null;
}

function parseDocument(value: unknown): StartupDocument | null {
  if (!isRecord(value) || typeof value.id !== "string" || !text(value.title).trim()) return null;
  return {
    id: value.id,
    title: text(value.title),
    category: oneOf(CATEGORY_ORDER, value.category) ?? "outros",
    format: oneOf(FORMAT_ORDER, value.format) ?? "outro",
    url: text(value.url),
    description: text(value.description),
    recommended: oneOf(
      RECOMMENDED_DOCUMENTS.map((item) => item.id),
      value.recommended,
    ),
    createdAt: text(value.createdAt),
    updatedAt: text(value.updatedAt),
  };
}

export function parseStoredDocuments(value: unknown): StartupDocument[] {
  if (value === undefined || value === null) return [];
  if (!isRecord(value) || value.version !== DOCUMENTS_STORAGE_VERSION || !Array.isArray(value.documents)) {
    throw new DocumentStorageError("Os documentos foram salvos em um formato que esta versão do app não reconhece.");
  }
  return value.documents.map(parseDocument).filter((document): document is StartupDocument => document !== null);
}

export function toStoredDocuments(documents: StartupDocument[]): StoredDocuments {
  return { version: DOCUMENTS_STORAGE_VERSION, documents };
}
