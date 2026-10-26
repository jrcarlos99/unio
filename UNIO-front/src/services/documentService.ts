import type { DocumentInput, StartupDocument } from "../types/documents";
import {
  DOCUMENTS_MAX,
  DOCUMENTS_STORAGE_KEY,
  DocumentStorageError,
  parseStoredDocuments,
  toStoredDocument,
  toStoredDocuments,
} from "../utils/documents";
import { AnswersTooLargeError, readAnswer, updateAnswer } from "./onboardingAnswersStore";

export interface DocumentRepository {
  readonly supportsUpload: boolean;
  list(): Promise<StartupDocument[]>;
  create(input: DocumentInput): Promise<StartupDocument[]>;
  update(id: string, input: DocumentInput): Promise<StartupDocument[]>;
  remove(id: string): Promise<StartupDocument[]>;
}

const STORAGE_FULL =
  "Não há espaço para salvar essa alteração. Encurte as descrições ou remova um documento e tente novamente.";

function requireLink(input: DocumentInput) {
  if (input.source.kind !== "link") {
    throw new DocumentStorageError("O envio de arquivos ainda não está disponível. Use um link.");
  }
  return { ...input, source: input.source };
}

async function change(apply: (documents: StartupDocument[]) => StartupDocument[]) {
  try {
    const stored = await updateAnswer(DOCUMENTS_STORAGE_KEY, (current) =>
      toStoredDocuments(apply(parseStoredDocuments(current))),
    );
    return parseStoredDocuments(stored);
  } catch (error) {
    if (error instanceof AnswersTooLargeError) throw new DocumentStorageError(STORAGE_FULL);
    throw error;
  }
}

const onboardingLinkRepository: DocumentRepository = {
  supportsUpload: false,

  async list() {
    return parseStoredDocuments(await readAnswer(DOCUMENTS_STORAGE_KEY));
  },

  create(input) {
    const link = requireLink(input);
    return change((documents) => {
      if (documents.length >= DOCUMENTS_MAX) {
        throw new DocumentStorageError(`Você pode adicionar no máximo ${DOCUMENTS_MAX} documentos.`);
      }
      return [...documents, toStoredDocument(link)];
    });
  },

  update(id, input) {
    const link = requireLink(input);
    return change((documents) => {
      const existing = documents.find((document) => document.id === id);
      if (!existing) throw new DocumentStorageError("Esse documento não existe mais. Recarregue a página.");
      return documents.map((document) => (document.id === id ? toStoredDocument(link, existing) : document));
    });
  },

  remove(id) {
    return change((documents) => documents.filter((document) => document.id !== id));
  },
};

export const documentRepository: DocumentRepository = onboardingLinkRepository;
