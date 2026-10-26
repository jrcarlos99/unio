import { useCallback, useMemo } from "react";
import { getApiErrorMessage } from "../services/api";
import { documentRepository } from "../services/documentService";
import type { DocumentFormValues, StartupDocument } from "../types/documents";
import {
  DOCUMENTS_MAX,
  DocumentStorageError,
  coveredRecommended,
  groupDocuments,
  toDocumentInput,
} from "../utils/documents";
import { useCarregamento } from "./useDescoberta";
import { useToast } from "./useToast";

const LOAD_ERROR = "Não foi possível carregar os documentos da startup.";
const SAVE_ERROR = "Não foi possível salvar os documentos. Tente novamente.";

const loadDocuments = () => documentRepository.list();

export function useStartupDocuments() {
  const { mostrar } = useToast();
  const { carregando, erro, dados, recarregar, alterarDados } = useCarregamento(loadDocuments, LOAD_ERROR);

  const groups = useMemo(() => groupDocuments(dados ?? []), [dados]);
  const covered = useMemo(() => coveredRecommended(dados ?? []), [dados]);

  const run = useCallback(
    async (action: () => Promise<StartupDocument[]>, successMessage: string): Promise<string | null> => {
      try {
        const stored = await action();
        alterarDados(() => stored);
        mostrar(successMessage, "sucesso");
        return null;
      } catch (error) {
        return error instanceof DocumentStorageError ? error.message : getApiErrorMessage(error, SAVE_ERROR);
      }
    },
    [alterarDados, mostrar],
  );

  const saveDocument = useCallback(
    (values: DocumentFormValues, id: string | null) => {
      const input = toDocumentInput(values);
      return id
        ? run(() => documentRepository.update(id, input), "Documento atualizado.")
        : run(() => documentRepository.create(input), "Documento adicionado.");
    },
    [run],
  );

  const removeDocument = useCallback(
    (id: string) => run(() => documentRepository.remove(id), "Documento removido."),
    [run],
  );

  return {
    loading: carregando,
    loadError: erro,
    reload: recarregar,
    groups,
    covered,
    count: dados ? dados.length : null,
    canAdd: dados !== null && dados.length < DOCUMENTS_MAX,
    saveDocument,
    removeDocument,
  };
}

export type StartupDocuments = ReturnType<typeof useStartupDocuments>;
