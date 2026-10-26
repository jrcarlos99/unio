import { Building2, MapPin } from "lucide-react";
import type {
  StartupProfileErrors,
  StartupProfileField,
  StartupProfileFormValues,
} from "../../types/startupProfile";
import {
  BUSINESS_MODEL_OPTIONS,
  PITCH_MAX,
  SEGMENT_OPTIONS,
  STAGE_OPTIONS,
  TEXT_MAX,
  profileFieldId,
  withSavedOption,
} from "../../utils/startupProfile";
import AvatarIniciais from "../discovery/AvatarIniciais";
import PitchCard from "../pitch/PitchCard";
import TextAreaField from "../pitch/TextAreaField";
import CurrencyField from "./CurrencyField";
import ProfileSelectField from "./ProfileSelectField";
import ProfileTextField from "./ProfileTextField";

interface CompanyDataCardProps {
  values: StartupProfileFormValues;
  // Last saved values: keep a saved option that is outside the lists
  saved: StartupProfileFormValues;
  errors: StartupProfileErrors;
  onChange: (field: StartupProfileField, value: string) => void;
  onBlur: (field: StartupProfileField) => void;
}

// "Dados da Empresa" form. Only fields the backend stores are here (see the
// "Not supported by the API" note: logo, CNPJ, website, founding year).
export default function CompanyDataCard({ values, saved, errors, onChange, onBlur }: CompanyDataCardProps) {
  const bind = (field: StartupProfileField) => ({
    id: profileFieldId(field),
    value: values[field],
    error: errors[field],
    onChange: (value: string) => onChange(field, value),
    onBlur: () => onBlur(field),
  });

  return (
    <PitchCard
      title="Dados da Empresa"
      icon={Building2}
      subtitle="Algoritmo de matchmaking e exibição no radar de investimentos."
      // Same height as the preview card on lg+
      className="h-full"
      badge={<AvatarIniciais nome={values.nome.trim() || "?"} />}
    >
      <p className="mb-5 text-xs text-deepgreen/75">* Campos obrigatórios</p>
      {/* One column inside the narrow form column at lg, two from xl */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <ProfileTextField
          {...bind("nome")}
          label="Nome da startup"
          required
          maxLength={TEXT_MAX}
          autoComplete="organization"
          placeholder="Ex.: EcoTech Solutions"
        />
        <ProfileSelectField
          {...bind("segmento")}
          label="Segmento principal"
          required
          options={withSavedOption(SEGMENT_OPTIONS, saved.segmento)}
        />
        <ProfileSelectField
          {...bind("estagio")}
          label="Estágio atual"
          required
          options={withSavedOption(STAGE_OPTIONS, saved.estagio)}
        />
        <ProfileTextField
          {...bind("localizacao")}
          label="Polo / Localização"
          icon={MapPin}
          required
          maxLength={TEXT_MAX}
          placeholder="Ex.: Recife, PE"
        />
        <ProfileSelectField
          {...bind("modeloNegocio")}
          label="Modelo de negócio"
          required
          options={withSavedOption(BUSINESS_MODEL_OPTIONS, saved.modeloNegocio)}
        />
        <ProfileTextField
          {...bind("mercadoAlvo")}
          label="Mercado alvo"
          required
          maxLength={TEXT_MAX}
          placeholder="Ex.: Pequenos produtores rurais"
        />
        <CurrencyField
          {...bind("capitalProcurado")}
          label="Capital procurado nesta rodada"
          required
          hint="Valor em reais, sem centavos."
        />
        <div className="sm:col-span-2 lg:col-span-1 xl:col-span-2">
          <TextAreaField
            {...bind("pitchCanvas")}
            label="Pitch / descrição institucional"
            hint="As duas primeiras linhas aparecem no card dos investidores."
            rows={5}
            maxLength={PITCH_MAX}
            placeholder="Conte em poucas linhas o que a startup faz e para quem."
          />
        </div>
      </div>
    </PitchCard>
  );
}
