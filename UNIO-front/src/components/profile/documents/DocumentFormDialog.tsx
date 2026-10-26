import { useMemo, useRef, useState, type FormEvent, type RefObject } from "react";
import { CircleAlert } from "lucide-react";
import type { DocumentFormValues, StartupDocument } from "../../../types/documents";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  DESCRIPTION_MAX,
  DOCUMENT_URL_MAX,
  FORMAT_OPTION_LABELS,
  FORMAT_ORDER,
  NO_RECOMMENDED_LABEL,
  RECOMMENDED_DOCUMENTS,
  TITLE_MAX,
  documentFieldId,
  firstInvalidDocumentField,
  keyByLabel,
  recommendedByLabel,
  recommendedLabel,
  toDocumentFormValues,
  validateDocument,
} from "../../../utils/documents";
import { OUTLINE_BUTTON, PRIMARY_BUTTON } from "../../pitch/styles";
import TextAreaField from "../../pitch/TextAreaField";
import ProfileSelectField from "../ProfileSelectField";
import ProfileTextField from "../ProfileTextField";
import TeamDialog from "../team/TeamDialog";

interface DocumentFormDialogProps {
  document: StartupDocument | null;
  initialValues: DocumentFormValues;
  fallbackFocusRef: RefObject<HTMLElement | null>;
  onSubmit: (values: DocumentFormValues) => Promise<string | null>;
  onClose: () => void;
}


const NO_OP = () => undefined;

const CATEGORY_OPTIONS = CATEGORY_ORDER.map((category) => CATEGORY_LABELS[category]);
const FORMAT_OPTIONS = FORMAT_ORDER.map((format) => FORMAT_OPTION_LABELS[format]);
const RECOMMENDED_OPTIONS = [NO_RECOMMENDED_LABEL, ...RECOMMENDED_DOCUMENTS.map((item) => item.label)];

export default function DocumentFormDialog({
  document,
  initialValues,
  fallbackFocusRef,
  onSubmit,
  onClose,
}: DocumentFormDialogProps) {
  const [values, setValues] = useState<DocumentFormValues>(() =>
    document ? toDocumentFormValues(document) : initialValues,
  );
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const titleRef = useRef<HTMLElement | null>(null);

  const errors = useMemo(() => (submitted ? validateDocument(values) : {}), [submitted, values]);

  function set<K extends keyof DocumentFormValues>(field: K, value: DocumentFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function setRecommended(label: string) {
    const recommended = recommendedByLabel(label);
    const item = RECOMMENDED_DOCUMENTS.find((entry) => entry.id === recommended);
    setValues((current) => ({
      ...current,
      recommended,
      category: current.category || item?.category || "",
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const invalid = firstInvalidDocumentField(validateDocument(values));
    if (invalid) {
      setSubmitted(true);
      setSaveError(null);
      window.document.getElementById(documentFieldId(invalid))?.focus();
      return;
    }
    setSaving(true);
    setSaveError(null);
    const error = await onSubmit(values);
    if (error) {
      setSaveError(error);
      setSaving(false);
    } else {
      onClose();
    }
  }

  return (
    <TeamDialog
      title={document ? "Editar documento" : "Adicionar documento"}
      description="Campos com * são obrigatórios."
      busy={saving}
      initialFocusRef={titleRef}
      fallbackFocusRef={fallbackFocusRef}
      onClose={onClose}
    >
      <form noValidate onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
          <div
            ref={(element) => {
              titleRef.current = element?.querySelector("input") ?? null;
            }}
          >
            <ProfileTextField
              id={documentFieldId("title")}
              label="Título"
              required
              maxLength={TITLE_MAX}
              placeholder="Ex.: Pitch deck 2026"
              value={values.title}
              error={errors.title}
              onChange={(value) => set("title", value)}
              onBlur={NO_OP}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <ProfileSelectField
              id={documentFieldId("category")}
              label="Categoria"
              required
              options={CATEGORY_OPTIONS}
              value={values.category ? CATEGORY_LABELS[values.category] : ""}
              error={errors.category}
              onChange={(label) => set("category", keyByLabel(CATEGORY_LABELS, label))}
              onBlur={NO_OP}
            />
            <ProfileSelectField
              id={documentFieldId("format")}
              label="Formato"
              required
              options={FORMAT_OPTIONS}
              value={values.format ? FORMAT_OPTION_LABELS[values.format] : ""}
              error={errors.format}
              onChange={(label) => set("format", keyByLabel(FORMAT_OPTION_LABELS, label))}
              onBlur={NO_OP}
            />
          </div>

          <ProfileSelectField
            id="document-recommended"
            label="Documento recomendado"
            options={RECOMMENDED_OPTIONS}
            value={values.recommended ? recommendedLabel(values.recommended) : NO_RECOMMENDED_LABEL}
            onChange={setRecommended}
            onBlur={NO_OP}
          />

          <ProfileTextField
            id={documentFieldId("url")}
            label="Link"
            required
            maxLength={DOCUMENT_URL_MAX}
            autoComplete="url"
            placeholder="https://drive.google.com/..."
            hint="Confira se o link está compartilhado como “qualquer pessoa com o link pode ver”."
            value={values.url}
            error={errors.url}
            onChange={(value) => set("url", value)}
            onBlur={NO_OP}
          />

          <TextAreaField
            id={documentFieldId("description")}
            label="Descrição"
            hint="O que o investidor encontra nesse documento."
            rows={3}
            maxLength={DESCRIPTION_MAX}
            value={values.description}
            error={errors.description}
            onChange={(value) => set("description", value)}
            onBlur={NO_OP}
          />
        </div>

        <div className="border-t border-lightgray px-5 py-4 sm:px-6">
          {saveError && (
            <p role="alert" className="mb-3 flex items-start gap-2 text-sm text-red-700">
              <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              {saveError}
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={saving} className={OUTLINE_BUTTON}>
              Cancelar
            </button>
            <button type="submit" disabled={saving} className={PRIMARY_BUTTON}>
              {saving ? "Salvando…" : document ? "Salvar alterações" : "Adicionar documento"}
            </button>
          </div>
        </div>
      </form>
    </TeamDialog>
  );
}
