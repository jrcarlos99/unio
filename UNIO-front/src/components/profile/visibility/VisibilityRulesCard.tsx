import type { ReactNode } from "react";
import { Eye, Globe, Lock } from "lucide-react";
import type { DocumentsAudience, VisibilitySettings } from "../../../types/visibility";
import { CHIP } from "../../pitch/styles";
import PitchCard from "../../pitch/PitchCard";
import Switch from "./Switch";

interface VisibilityRulesCardProps {
  values: VisibilitySettings;
  onChange: <K extends keyof VisibilitySettings>(key: K, value: VisibilitySettings[K]) => void;
}

type ToggleKey = "showPitch" | "showTeam" | "showCapital";

const TOGGLES: { key: ToggleKey; title: string; description: string }[] = [
  { key: "showPitch", title: "Pitch e vídeo", description: "Pitch curto e vídeo de apresentação da startup." },
  { key: "showTeam", title: "Equipe", description: "Membros cadastrados na aba Equipe." },
  {
    key: "showCapital",
    title: "Capital procurado",
    description: "Valor da rodada. Desligado, o card mostra “Sob consulta”.",
  },
];

const AUDIENCES: { value: DocumentsAudience; label: string }[] = [
  { value: "everyone", label: "Visíveis para todos" },
  { value: "after-match", label: "Somente após o match" },
];

function Row({
  title,
  description,
  descriptionId,
  titleFor,
  control,
}: {
  title: string;
  description: string;
  descriptionId: string;
  titleFor?: string;
  control: ReactNode;
}) {
  return (
    <li className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        {titleFor ? (
          <label htmlFor={titleFor} className="cursor-pointer font-semibold text-deepgreen">
            {title}
          </label>
        ) : (
          <p className="font-semibold text-deepgreen">{title}</p>
        )}
        <p id={descriptionId} className="mt-0.5 text-sm text-deepgreen/80">
          {description}
        </p>
      </div>
      <div className="shrink-0">{control}</div>
    </li>
  );
}

export default function VisibilityRulesCard({ values, onChange }: VisibilityRulesCardProps) {
  return (
    <PitchCard
      title="O que investidores veem antes do match"
      icon={Eye}
      subtitle="Escolha o que aparece no card da sua startup."
    >
      <ul className="divide-y divide-lightgray">
        <Row
          title="Dados gerais"
          description="Nome, segmento, estágio e localização."
          descriptionId="visibility-general-description"
          control={
            <span className={`${CHIP} bg-sage/30 text-deepgreen`}>
              <Globe size={14} aria-hidden="true" />
              Sempre visíveis
            </span>
          }
        />

        {TOGGLES.map(({ key, title, description }) => (
          <Row
            key={key}
            title={title}
            description={description}
            descriptionId={`visibility-${key}-description`}
            titleFor={`visibility-${key}`}
            control={
              <Switch
                id={`visibility-${key}`}
                checked={values[key]}
                describedBy={`visibility-${key}-description`}
                onChange={(checked) => onChange(key, checked)}
              />
            }
          />
        ))}

        <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p id="visibility-documents-title" className="font-semibold text-deepgreen">
              Documentos
            </p>
            <p id="visibility-documents-description" className="mt-0.5 text-sm text-deepgreen/80">
              Links cadastrados na aba Documentos.
            </p>
          </div>
          <div
            role="radiogroup"
            aria-labelledby="visibility-documents-title"
            aria-describedby="visibility-documents-description"
            className="flex shrink-0 flex-wrap gap-2"
          >
            {AUDIENCES.map(({ value, label }) => {
                const selected = values.documents === value;
                return (
                  <label
                    key={value}
                    className={`inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-2xl border px-4 text-sm font-medium text-deepgreen focus-within:ring-2 focus-within:ring-deepgreen ${
                      selected ? "border-deepgreen bg-sage/20" : "border-deepgreen/30 bg-white hover:border-deepgreen"
                    }`}
                  >
                    <input
                      type="radio"
                      name="visibility-documents"
                      value={value}
                      checked={selected}
                      onChange={() => onChange("documents", value)}
                      className="h-4 w-4 accent-deepgreen focus:outline-none"
                    />
                    {label}
                  </label>
                );
              })}
          </div>
        </li>

        <Row
          title="Contatos"
          description="WhatsApp, e-mail e telefone de “Contatos para matches”."
          descriptionId="visibility-contacts-description"
          control={
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-deepgreen">
              <Lock size={14} aria-hidden="true" />
              Sempre visíveis somente após o match
            </span>
          }
        />
      </ul>
    </PitchCard>
  );
}
