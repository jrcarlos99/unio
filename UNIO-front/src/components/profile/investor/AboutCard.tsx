import { Landmark, Link2, Network } from "lucide-react";
import type { InvestorProfileErrors, InvestorProfileField, InvestorProfileFormValues } from "../../../types/investorProfile";
import { BIO_MAX, TEXT_MAX, investorFieldId } from "../../../utils/investorProfile";
import PitchCard from "../../pitch/PitchCard";
import TextAreaField from "../../pitch/TextAreaField";
import ProfileTextField from "../ProfileTextField";

type AboutField = Extract<InvestorProfileField, "bio" | "linkedin" | "rede">;

interface AboutCardProps {
  values: InvestorProfileFormValues;
  errors: InvestorProfileErrors;
  onChange: (field: AboutField, value: string) => void;
  onBlur: (field: AboutField) => void;
}

export default function AboutCard({ values, errors, onChange, onBlur }: AboutCardProps) {
  const bind = (field: AboutField) => ({
    id: investorFieldId(field),
    value: values[field],
    error: errors[field],
    onChange: (value: string) => onChange(field, value),
    onBlur: () => onBlur(field),
  });

  return (
    <PitchCard
      title="Sobre você"
      icon={Landmark}
      subtitle="Credenciais visíveis para fundadores do ecossistema e coinvestidores."
    >
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <div className="sm:col-span-2 lg:col-span-1 xl:col-span-2">
          <TextAreaField
            {...bind("bio")}
            label="Biografia pública"
            hint="As duas primeiras linhas aparecem no seu card."
            rows={4}
            maxLength={BIO_MAX}
            placeholder="Conte sua trajetória e como você apoia fundadores."
          />
        </div>
        <ProfileTextField
          {...bind("linkedin")}
          label="Perfil no LinkedIn"
          icon={Link2}
          type="url"
          autoComplete="url"
          maxLength={TEXT_MAX}
          placeholder="https://linkedin.com/in/seu-perfil"
        />
        <ProfileTextField
          {...bind("rede")}
          label="Sindicato ou rede associada"
          icon={Network}
          maxLength={TEXT_MAX}
          placeholder="Ex.: Porto Digital Angel Network"
        />
      </div>
    </PitchCard>
  );
}
