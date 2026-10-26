import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getApiErrorMessage } from "../services/api";
import { getMyStartupProfile, updateMyStartupProfile } from "../services/startupProfileService";
import type { StartupProfileErrors, StartupProfileField, StartupProfileFormValues } from "../types/startupProfile";
import {
  PITCH_MAX,
  PROFILE_FIELDS,
  firstInvalidProfileField,
  profileFieldId,
  sameProfileContent,
  toProfileFormValues,
  toProfileUpdateRequest,
  validateProfile,
} from "../utils/startupProfile";
import { useCarregamento } from "./useDescoberta";
import { useToast } from "./useToast";

const LOAD_ERROR = "Não foi possível carregar o perfil da startup.";
// The backend sends no message in its error bodies, so this is the usual text
const SAVE_ERROR = "Não foi possível salvar as alterações. Tente novamente.";

export function useStartupProfileEditor() {
  const { refreshProfile } = useAuth();
  const { mostrar } = useToast();
  const { carregando, erro, dados: profile, recarregar, alterarDados } = useCarregamento(
    getMyStartupProfile,
    LOAD_ERROR,
  );

  const [draft, setDraft] = useState<StartupProfileFormValues | null>(null);
  const [touched, setTouched] = useState<ReadonlySet<StartupProfileField>>(() => new Set());
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  // Inline feedback of the pending changes bar (validation or save error)
  const [saveError, setSaveError] = useState<string | null>(null);

  const saved = useMemo(() => (profile ? toProfileFormValues(profile) : null), [profile]);
  const values = draft ?? saved;
  const isDirty = draft !== null && saved !== null && !sameProfileContent(draft, saved);

  const errors = useMemo<StartupProfileErrors>(() => (values ? validateProfile(values) : {}), [values]);

  // Errors show after the field is left or on save; the pitch length error
  // shows right away, next to its counter.
  const visibleErrors = useMemo<StartupProfileErrors>(() => {
    if (!values) return {};
    const visible: StartupProfileErrors = {};
    for (const field of PROFILE_FIELDS) {
      const message = errors[field];
      if (!message) continue;
      const overLimit = field === "pitchCanvas" && values.pitchCanvas.length > PITCH_MAX;
      if (submitAttempted || touched.has(field) || overLimit) visible[field] = message;
    }
    return visible;
  }, [errors, submitAttempted, touched, values]);

  const setField = useCallback(
    (field: StartupProfileField, value: string) => {
      setDraft((current) => {
        const base = current ?? saved;
        return base ? { ...base, [field]: value } : current;
      });
    },
    [saved],
  );

  const touchField = useCallback((field: StartupProfileField) => {
    setTouched((current) => (current.has(field) ? current : new Set(current).add(field)));
  }, []);

  const discard = useCallback(() => {
    setDraft(null);
    setTouched(new Set());
    setSubmitAttempted(false);
    setSaveError(null);
  }, []);

  const save = useCallback(async () => {
    if (!values || !saved || saving) return;

    const invalid = firstInvalidProfileField(validateProfile(values));
    if (invalid) {
      setSubmitAttempted(true);
      setSaveError("Revise os campos destacados antes de salvar.");
      document.getElementById(profileFieldId(invalid))?.focus();
      return;
    }

    const submitted = draft;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateMyStartupProfile(toProfileUpdateRequest(values, saved));
      alterarDados(() => updated);
      // Server data is the new baseline; edits typed during the request stay
      setDraft((current) => (current === submitted ? null : current));
      setTouched(new Set());
      setSubmitAttempted(false);
      mostrar("Perfil atualizado. As alterações já estão visíveis para os investidores.", "sucesso");
      // Sidebar name and other pages read AuthContext; the save already
      // worked, so a failed refresh only means stale data until next load.
      refreshProfile().catch(() => undefined);
    } catch (error) {
      setSaveError(getApiErrorMessage(error, SAVE_ERROR));
    } finally {
      setSaving(false);
    }
  }, [alterarDados, draft, mostrar, refreshProfile, saved, saving, values]);

  // Reload or close the tab with unsaved changes. In-app links can't be
  // blocked: useBlocker needs a data router and the app uses <BrowserRouter>.
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
    errors: visibleErrors,
    isDirty,
    saving,
    saveError,
    setField,
    touchField,
    discard,
    save,
  };
}
