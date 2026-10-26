import { useMemo, useRef, useState, type FormEvent, type RefObject } from "react";
import { CircleAlert } from "lucide-react";
import type { TeamMember, TeamMemberFormValues } from "../../../types/team";
import {
  BIO_MAX,
  EMPTY_MEMBER_FORM,
  FOUNDER_LABELS,
  NAME_MAX,
  ROLE_MAX,
  URL_MAX,
  firstInvalidMemberField,
  memberFieldId,
  toMemberFormValues,
  validateMember,
} from "../../../utils/team";
import { FOCO_VISIVEL } from "../../onboarding/selecao";
import { OUTLINE_BUTTON, PRIMARY_BUTTON } from "../../pitch/styles";
import TextAreaField from "../../pitch/TextAreaField";
import ProfileTextField from "../ProfileTextField";
import SkillsInput from "./SkillsInput";
import TeamDialog from "./TeamDialog";

interface MemberFormDialogProps {
  member: TeamMember | null;
  fallbackFocusRef: RefObject<HTMLElement | null>;
  onSubmit: (values: TeamMemberFormValues) => Promise<string | null>;
  onClose: () => void;
}

const NO_OP = () => undefined;

export default function MemberFormDialog({ member, fallbackFocusRef, onSubmit, onClose }: MemberFormDialogProps) {
  const [values, setValues] = useState<TeamMemberFormValues>(() =>
    member ? toMemberFormValues(member) : EMPTY_MEMBER_FORM,
  );
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const nameRef = useRef<HTMLElement | null>(null);

  const errors = useMemo(() => (submitted ? validateMember(values) : {}), [submitted, values]);

  function set<K extends keyof TeamMemberFormValues>(field: K, value: TeamMemberFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function toggleFounder() {
    setValues((current) => ({ ...current, isFounder: !current.isFounder, founderLabel: null }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const invalid = firstInvalidMemberField(validateMember(values));
    if (invalid) {
      setSubmitted(true);
      setSaveError(null);
      document.getElementById(memberFieldId(invalid))?.focus();
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
      title={member ? "Editar membro" : "Adicionar membro"}
      description="Campos com * são obrigatórios."
      busy={saving}
      initialFocusRef={nameRef}
      fallbackFocusRef={fallbackFocusRef}
      onClose={onClose}
    >
      <form noValidate onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
          <div
            ref={(element) => {
              nameRef.current = element?.querySelector("input") ?? null;
            }}
          >
            <ProfileTextField
              id={memberFieldId("name")}
              label="Nome"
              required
              maxLength={NAME_MAX}
              autoComplete="name"
              placeholder="Ex.: Ana Beatriz Souza"
              value={values.name}
              error={errors.name}
              onChange={(value) => set("name", value)}
              onBlur={NO_OP}
            />
          </div>

          <ProfileTextField
            id={memberFieldId("role")}
            label="Cargo"
            required
            maxLength={ROLE_MAX}
            autoComplete="organization-title"
            placeholder="Ex.: CEO & Cofundadora"
            value={values.role}
            error={errors.role}
            onChange={(value) => set("role", value)}
            onBlur={NO_OP}
          />

          <div>
            <div className="flex items-center justify-between gap-4">
              <span id="team-member-founder-switch" className="font-medium text-deepgreen">
                Fundador(a)?
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={values.isFounder}
                aria-labelledby="team-member-founder-switch"
                onClick={toggleFounder}
                className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
                  values.isFounder ? "bg-deepgreen" : "bg-deepgreen/60"
                } ${FOCO_VISIVEL}`}
              >
                <span
                  aria-hidden="true"
                  className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    values.isFounder ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {values.isFounder && (
              <fieldset
                className="mt-3"
                aria-describedby={errors.founderLabel ? `${memberFieldId("founderLabel")}-error` : undefined}
              >
                <legend className="text-sm font-medium text-deepgreen">
                  Como o selo aparece no card <span aria-hidden="true">*</span>
                </legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {FOUNDER_LABELS.map((label, index) => (
                    <label
                      key={label}
                      className={`inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-2xl border px-4 text-sm font-medium text-deepgreen focus-within:ring-2 focus-within:ring-deepgreen ${
                        values.founderLabel === label ? "border-deepgreen bg-sage/20" : "border-deepgreen/30 bg-white"
                      }`}
                    >
                      <input
                        id={index === 0 ? memberFieldId("founderLabel") : undefined}
                        type="radio"
                        name="founderLabel"
                        value={label}
                        checked={values.founderLabel === label}
                        onChange={() => set("founderLabel", label)}
                        aria-invalid={errors.founderLabel ? true : undefined}
                        className="h-4 w-4 accent-deepgreen focus:outline-none"
                      />
                      {label}
                    </label>
                  ))}
                </div>
                {errors.founderLabel && (
                  <p id={`${memberFieldId("founderLabel")}-error`} className="mt-1 text-sm text-red-600">
                    {errors.founderLabel}
                  </p>
                )}
              </fieldset>
            )}
          </div>

          <TextAreaField
            id={memberFieldId("bio")}
            label="Bio"
            hint="Formação e experiência, em poucas linhas."
            rows={3}
            maxLength={BIO_MAX}
            value={values.bio}
            error={errors.bio}
            onChange={(value) => set("bio", value)}
            onBlur={NO_OP}
          />

          <SkillsInput
            id={memberFieldId("skills")}
            value={values.skills}
            error={errors.skills}
            onChange={(skills) => set("skills", skills)}
          />

          <ProfileTextField
            id={memberFieldId("linkedinUrl")}
            label="LinkedIn"
            maxLength={URL_MAX}
            autoComplete="url"
            placeholder="linkedin.com/in/seu-perfil"
            value={values.linkedinUrl}
            error={errors.linkedinUrl}
            onChange={(value) => set("linkedinUrl", value)}
            onBlur={NO_OP}
          />

          <ProfileTextField
            id={memberFieldId("githubUrl")}
            label="GitHub"
            maxLength={URL_MAX}
            autoComplete="url"
            placeholder="github.com/seu-usuario"
            value={values.githubUrl}
            error={errors.githubUrl}
            onChange={(value) => set("githubUrl", value)}
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
              {saving ? "Salvando…" : member ? "Salvar alterações" : "Adicionar membro"}
            </button>
          </div>
        </div>
      </form>
    </TeamDialog>
  );
}
