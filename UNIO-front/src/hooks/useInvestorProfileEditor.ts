import { useCallback, useEffect, useMemo, useState } from "react";
import { getApiErrorMessage } from "../services/api";
import {
  getInvestorExtras,
  getMyInvestorProfile,
  saveInvestorExtras,
  updateMyInvestorProfile,
} from "../services/investorProfileService";
import type {
  InvestorProfileErrors,
  InvestorProfileExtras,
  InvestorProfileField,
  InvestorProfileFormValues,
  InvestorProfileResponse,
} from "../types/investorProfile";
import {
  BIO_MAX,
  INVESTOR_PROFILE_FIELDS,
  InvestorExtrasStorageError,
  firstInvalidInvestorField,
  investorFieldId,
  pendingChangesSummary,
  sameBackendContent,
  sameExtrasContent,
  toInvestorExtras,
  toInvestorFormValues,
  toInvestorUpdateRequest,
  validateInvestorProfile,
} from "../utils/investorProfile";
import { useCarregamento } from "./useDescoberta";
import { useToast } from "./useToast";

const LOAD_ERROR = "Não foi possível carregar seu perfil.";
const SAVE_ERROR = "Não foi possível salvar as alterações. Tente novamente.";

interface LoadedProfile {
  profile: InvestorProfileResponse;
  extras: InvestorProfileExtras;
}

async function loadProfile(): Promise<LoadedProfile> {
  const [profile, extras] = await Promise.all([getMyInvestorProfile(), getInvestorExtras()]);
  return { profile, extras };
}

export function useInvestorProfileEditor() {
  const { mostrar } = useToast();
  const { carregando, erro, dados, recarregar, alterarDados } = useCarregamento(loadProfile, LOAD_ERROR);

  const [draft, setDraft] = useState<InvestorProfileFormValues | null>(null);
  const [touched, setTouched] = useState<ReadonlySet<InvestorProfileField>>(() => new Set());
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const saved = useMemo(() => (dados ? toInvestorFormValues(dados.profile, dados.extras) : null), [dados]);
  const values = draft ?? saved;
  const isDirty =
    draft !== null && saved !== null && !(sameBackendContent(draft, saved) && sameExtrasContent(draft, saved));

  const errors = useMemo<InvestorProfileErrors>(() => (values ? validateInvestorProfile(values) : {}), [values]);

  const visibleErrors = useMemo<InvestorProfileErrors>(() => {
    if (!values) return {};
    const visible: InvestorProfileErrors = {};
    for (const field of INVESTOR_PROFILE_FIELDS) {
      const message = errors[field];
      if (!message) continue;
      const overLimit = field === "bio" && values.bio.length > BIO_MAX;
      if (submitAttempted || touched.has(field) || overLimit) visible[field] = message;
    }
    return visible;
  }, [errors, submitAttempted, touched, values]);

  const setField = useCallback(
    <K extends keyof InvestorProfileFormValues>(field: K, value: InvestorProfileFormValues[K]) => {
      setDraft((current) => {
        const base = current ?? saved;
        return base ? { ...base, [field]: value } : current;
      });
    },
    [saved],
  );

  const touchField = useCallback((field: InvestorProfileField) => {
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

    const invalid = firstInvalidInvestorField(validateInvestorProfile(values));
    if (invalid) {
      setSubmitAttempted(true);
      setSaveError("Revise os campos destacados antes de salvar.");
      document.getElementById(investorFieldId(invalid))?.focus();
      return;
    }

    const submitted = draft;
    setSaving(true);
    setSaveError(null);
    try {
      if (!sameBackendContent(values, saved)) {
        const profile = await updateMyInvestorProfile(toInvestorUpdateRequest(values));
        alterarDados((atual) => ({ ...atual, profile }));
      }
      if (!sameExtrasContent(values, saved)) {
        const extras = await saveInvestorExtras(toInvestorExtras(values));
        alterarDados((atual) => ({ ...atual, extras }));
      }
      setDraft((current) => (current === submitted ? null : current));
      setTouched(new Set());
      setSubmitAttempted(false);
      mostrar("Perfil atualizado.", "sucesso");
    } catch (error) {
      setSaveError(
        error instanceof InvestorExtrasStorageError ? error.message : getApiErrorMessage(error, SAVE_ERROR),
      );
    } finally {
      setSaving(false);
    }
  }, [alterarDados, draft, mostrar, saved, saving, values]);

  const shouldWarn = isDirty || saving;
  useEffect(() => {
    if (!shouldWarn) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [shouldWarn]);

  const summary = isDirty && values && saved ? pendingChangesSummary(values, saved) : "";

  return {
    loading: carregando,
    loadError: erro,
    reload: recarregar,
    saved,
    values,
    errors: visibleErrors,
    isDirty,
    summary,
    saving,
    saveError,
    setField,
    touchField,
    discard,
    save,
  };
}

export type InvestorProfileEditor = ReturnType<typeof useInvestorProfileEditor>;
