import { useCallback, useEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { getApiErrorMessage } from "../services/api";
import { getMyPitch, publishMyPitch, updateMyPitch } from "../services/pitchService";
import type { PitchFieldKey, PitchFormErrors, PitchFormValues, PitchTab } from "../types/pitch";
import {
  PITCH_FIELDS,
  PitchStorageError,
  fieldId,
  fieldMax,
  fieldTab,
  fieldValue,
  firstInvalidField,
  haveSameContent,
  toFormValues,
  toUpdateRequest,
  validatePitchForm,
  withFieldValue,
} from "../utils/pitch";
import { useCarregamento } from "./useDescoberta";
import { useToast } from "./useToast";

export type SubmitPhase = "idle" | "saving" | "publishing";

const LOAD_ERROR = "Não foi possível carregar seu pitch.";
const SAVE_ERROR = "Não foi possível salvar as alterações. Tente novamente.";
const PUBLISH_ERROR = "Não foi possível enviar para moderação.";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof PitchStorageError ? error.message : getApiErrorMessage(error, fallback);
}

// State and actions of the "Pitch & Lean Canvas" page.
//
// The edited values live in `draft` only after the first change; until then
// the form shows the loaded pitch. "Publicar alterações" = PUT (only when
// there are changes) followed by POST /publish. If the PUT works and the
// POST fails, the form is kept as is and `publishPending` lets the user
// retry just the POST.
export function usePitchEditor() {
  const { mostrar } = useToast();
  const { carregando, erro, dados: pitch, recarregar, alterarDados } = useCarregamento(getMyPitch, LOAD_ERROR);

  const [draft, setDraft] = useState<PitchFormValues | null>(null);
  const [touched, setTouched] = useState<ReadonlySet<PitchFieldKey>>(() => new Set());
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [phase, setPhase] = useState<SubmitPhase>("idle");
  const [publishPending, setPublishPending] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PitchTab>("pitch");

  const saved = useMemo(() => (pitch ? toFormValues(pitch) : null), [pitch]);
  const values = draft ?? saved;
  const isDirty = draft !== null && saved !== null && !haveSameContent(draft, saved);
  const isBusy = phase !== "idle";

  const errors = useMemo<PitchFormErrors>(() => (values ? validatePitchForm(values) : {}), [values]);

  // Required/format errors show after the field is left or on publish;
  // length errors show right away, next to the counter.
  const visibleErrors = useMemo<PitchFormErrors>(() => {
    if (!values) return {};
    const visible: PitchFormErrors = {};
    for (const key of PITCH_FIELDS) {
      const message = errors[key];
      if (!message) continue;
      const max = fieldMax(key);
      const overLimit = max !== null && fieldValue(values, key).length > max;
      if (submitAttempted || touched.has(key) || overLimit) visible[key] = message;
    }
    return visible;
  }, [errors, submitAttempted, touched, values]);

  const setField = useCallback(
    (field: PitchFieldKey, value: string) => {
      setDraft((current) => {
        const base = current ?? saved;
        return base ? withFieldValue(base, field, value) : current;
      });
    },
    [saved],
  );

  const touchField = useCallback((field: PitchFieldKey) => {
    setTouched((current) => (current.has(field) ? current : new Set(current).add(field)));
  }, []);

  const submitForReview = useCallback(async () => {
    setPhase("publishing");
    try {
      const published = await publishMyPitch();
      alterarDados(() => published);
      setPublishPending(false);
      setPublishError(null);
      setSubmitAttempted(false);
      setTouched(new Set());
      mostrar("Alterações enviadas para moderação.", "sucesso");
    } catch (error) {
      setPublishPending(true);
      setPublishError(errorMessage(error, PUBLISH_ERROR));
    } finally {
      setPhase("idle");
    }
  }, [alterarDados, mostrar]);

  const publish = useCallback(async () => {
    if (!values || isBusy) return;

    const invalid = firstInvalidField(validatePitchForm(values));
    if (invalid) {
      setSubmitAttempted(true);
      // The panel has to be visible before its field can take focus
      flushSync(() => setActiveTab(fieldTab(invalid)));
      document.getElementById(fieldId(invalid))?.focus();
      mostrar("Revise os campos destacados antes de publicar.", "erro");
      return;
    }

    if (isDirty) {
      setPhase("saving");
      try {
        const updated = await updateMyPitch(toUpdateRequest(values));
        // The draft stays untouched: it now matches the saved pitch, so the
        // form keeps exactly what the user typed and is no longer dirty.
        alterarDados(() => updated);
      } catch (error) {
        setPhase("idle");
        mostrar(errorMessage(error, SAVE_ERROR), "erro");
        return;
      }
    }

    await submitForReview();
  }, [alterarDados, isBusy, isDirty, mostrar, submitForReview, values]);

  // Only the POST, after a publish whose PUT already worked
  const retryPublish = useCallback(() => {
    if (!isBusy && !isDirty) void submitForReview();
  }, [isBusy, isDirty, submitForReview]);

  // Reload or close the tab with unsaved changes. In-app links can't be
  // blocked: useBlocker needs a data router and the app uses <BrowserRouter>.
  const shouldWarn = isDirty || isBusy;
  useEffect(() => {
    if (!shouldWarn) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [shouldWarn]);

  const canPublish = values !== null && !isBusy && (isDirty || publishPending || pitch?.status === "DRAFT");

  return {
    loading: carregando,
    loadError: erro,
    reload: recarregar,
    pitch,
    values,
    errors: visibleErrors,
    isDirty,
    phase,
    canPublish,
    publishPending,
    publishError,
    activeTab,
    setActiveTab,
    setField,
    touchField,
    publish,
    retryPublish,
  };
}
