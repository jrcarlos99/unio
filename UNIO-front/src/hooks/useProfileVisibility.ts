import { useCallback, useEffect, useState } from "react";
import { getApiErrorMessage } from "../services/api";
import { getVisibility, saveVisibility } from "../services/visibilityService";
import type { VisibilitySettings } from "../types/visibility";
import { VisibilityStorageError, sameVisibility } from "../utils/visibility";
import { useCarregamento } from "./useDescoberta";
import { useToast } from "./useToast";

const LOAD_ERROR = "Não foi possível carregar as preferências de visibilidade.";
const SAVE_ERROR = "Não foi possível salvar as preferências. Tente novamente.";

export function useProfileVisibility() {
  const { mostrar } = useToast();
  const { carregando, erro, dados: saved, recarregar, alterarDados } = useCarregamento(getVisibility, LOAD_ERROR);

  const [draft, setDraft] = useState<VisibilitySettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const values = draft ?? saved;
  const isDirty = draft !== null && saved !== null && !sameVisibility(draft, saved);

  const setSetting = useCallback(
    <K extends keyof VisibilitySettings>(key: K, value: VisibilitySettings[K]) => {
      setDraft((current) => {
        const base = current ?? saved;
        return base ? { ...base, [key]: value } : current;
      });
    },
    [saved],
  );

  const discard = useCallback(() => {
    setDraft(null);
    setSaveError(null);
  }, []);

  const save = useCallback(async () => {
    if (!values || saving) return;
    const submitted = draft;
    setSaving(true);
    setSaveError(null);
    try {
      const stored = await saveVisibility(values);
      alterarDados(() => stored);
      setDraft((current) => (current === submitted ? null : current));
      mostrar("Preferências de visibilidade salvas.", "sucesso");
    } catch (error) {
      setSaveError(error instanceof VisibilityStorageError ? error.message : getApiErrorMessage(error, SAVE_ERROR));
    } finally {
      setSaving(false);
    }
  }, [alterarDados, draft, mostrar, saving, values]);

  const shouldWarn = isDirty || saving;
  useEffect(() => {
    if (!shouldWarn) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [shouldWarn]);

  return {
    loading: carregando,
    loadError: erro,
    reload: recarregar,
    saved,
    values,
    isDirty,
    saving,
    saveError,
    setSetting,
    discard,
    save,
  };
}

export type ProfileVisibility = ReturnType<typeof useProfileVisibility>;
