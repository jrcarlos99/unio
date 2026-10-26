export type DocumentCategory = "pitch-deck" | "financeiro" | "juridico" | "produto-tecnologia" | "outros";

export type DocumentFormat = "pdf" | "documento" | "planilha" | "apresentacao" | "imagem" | "outro";

export type RecommendedDocument = "pitch-deck" | "plano-financeiro" | "contrato-social" | "cap-table";

export interface StartupDocument {
  id: string;
  title: string;
  category: DocumentCategory;
  format: DocumentFormat;
  url: string;
  description: string;
  recommended: RecommendedDocument | null;
  createdAt: string;
  updatedAt: string;
}

export interface StoredDocuments {
  version: 1;
  documents: StartupDocument[];
}

export type DocumentSource = { kind: "link"; url: string; format: DocumentFormat } | { kind: "file"; file: File };

export interface DocumentInput {
  title: string;
  category: DocumentCategory;
  description: string;
  recommended: RecommendedDocument | null;
  source: DocumentSource;
}

export interface DocumentFormValues {
  title: string;
  category: DocumentCategory | "";
  format: DocumentFormat | "";
  url: string;
  description: string;
  recommended: RecommendedDocument | null;
}

export type DocumentField = "title" | "category" | "format" | "url" | "description";

export type DocumentErrors = Partial<Record<DocumentField, string>>;
