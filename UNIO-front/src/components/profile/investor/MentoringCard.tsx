import { Users } from "lucide-react";
import type { InvestorProfileErrors, InvestorProfileField, InvestorProfileFormValues } from "../../../types/investorProfile";
import {
  AVAILABILITY_OPTIONS,
  NOTE_MAX,
  SPECIALTIES_MAX,
  SPECIALTY_OPTIONS,
  availabilityLabel,
  investorFieldId,
} from "../../../utils/investorProfile";
import PitchCard from "../../pitch/PitchCard";
import ProfileSelectField from "../ProfileSelectField";
import ProfileTextField from "../ProfileTextField";
import Switch from "../visibility/Switch";
import SpecialtyChips from "./SpecialtyChips";

const SWITCH_ID = "investor-profile-mentoria";

interface MentoringCardProps {
  values: InvestorProfileFormValues;
  errors: InvestorProfileErrors;
  onboardingAvailability?: string;
  onChange: <K extends keyof InvestorProfileFormValues>(field: K, value: InvestorProfileFormValues[K]) => void;
  onBlur: (field: InvestorProfileField) => void;
}

export default function MentoringCard({ values, errors, onboardingAvailability, onChange, onBlur }: MentoringCardProps) {
  const off = !values.mentoria;

  return (
    <PitchCard
      title="Atuação em mentoria"
      icon={Users}
      subtitle="Configure sua disponibilidade para sessões estratégicas com fundadores."
      badge={
        <div className="flex items-center gap-3">
          <label htmlFor={SWITCH_ID} className="max-w-[10rem] text-sm font-semibold leading-tight text-deepgreen">
            Também ofereço mentoria
          </label>
          <Switch id={SWITCH_ID} checked={values.mentoria} onChange={(checked) => onChange("mentoria", checked)} />
        </div>
      }
    >
      {off && (
        <p className="mb-5 rounded-2xl bg-lightgray/50 px-4 py-3 text-sm text-deepgreen/80">
          Ative a mentoria para escolher especialidades e disponibilidade. Elas não aparecem no seu card enquanto
          estiver desativada.
        </p>
      )}
      <div className="space-y-5">
        <SpecialtyChips
          id={investorFieldId("especialidades")}
          label="Áreas de especialidade para mentoria"
          options={SPECIALTY_OPTIONS}
          selected={values.especialidades}
          max={SPECIALTIES_MAX}
          disabled={off}
          error={errors.especialidades}
          onChange={(selected) => onChange("especialidades", selected)}
        />
        <ProfileSelectField
          id={investorFieldId("disponibilidade")}
          label="Disponibilidade de agenda mensal"
          required={!off}
          disabled={off}
          hint={onboardingAvailability ? `No onboarding você indicou: ${onboardingAvailability}.` : undefined}
          options={AVAILABILITY_OPTIONS}
          optionLabel={availabilityLabel}
          value={values.disponibilidade}
          error={errors.disponibilidade}
          onChange={(value) => onChange("disponibilidade", value as InvestorProfileFormValues["disponibilidade"])}
          onBlur={() => onBlur("disponibilidade")}
        />
        <ProfileTextField
          id={investorFieldId("disponibilidadeObservacao")}
          label="Observação"
          hint="Opcional. Ex.: prefiro encontros às sextas à tarde."
          disabled={off}
          maxLength={NOTE_MAX}
          value={values.disponibilidadeObservacao}
          error={errors.disponibilidadeObservacao}
          onChange={(value) => onChange("disponibilidadeObservacao", value)}
          onBlur={() => onBlur("disponibilidadeObservacao")}
        />
      </div>
    </PitchCard>
  );
}
