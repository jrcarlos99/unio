import { CalendarDays, Eye, Network } from "lucide-react";
import type { InvestorProfileFormValues } from "../../../types/investorProfile";
import { SPECIALTIES_MAX, availabilityLabel } from "../../../utils/investorProfile";
import AvatarIniciais from "../../discovery/AvatarIniciais";
import PitchCard from "../../pitch/PitchCard";
import { CHIP } from "../../pitch/styles";

interface InvestorCardPreviewProps {
  name: string;
  values: InvestorProfileFormValues;
}

export default function InvestorCardPreview({ name, values }: InvestorCardPreviewProps) {
  const network = values.rede.trim();
  const bio = values.bio.trim();
  const specialties = values.especialidades.slice(0, SPECIALTIES_MAX);

  return (
    <PitchCard
      title="Prévia em tempo real"
      icon={Eye}
      subtitle="Assim seu perfil aparece para as startups."
      className="h-full"
      badge={
        <span className={`${CHIP} bg-sage/30 text-deepgreen`}>
          <span className="h-2 w-2 rounded-full bg-deepgreen" aria-hidden="true" />
          Live Preview
        </span>
      }
    >
      <article className="rounded-3xl border border-lightgray bg-white p-5 shadow-soft">
        <div className="flex items-center gap-3">
          <AvatarIniciais nome={name || "?"} />
          <div className="min-w-0">
            <h3 className="break-words text-lg font-bold leading-tight text-deepgreen">{name || "Seu nome"}</h3>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-deepgreen/80">
              Investidor(a) anjo
              {values.mentoria && <span className={`${CHIP} bg-sage/30 text-deepgreen`}>Mentoria ativa</span>}
            </p>
            {network && (
              <p className="mt-0.5 flex items-center gap-1 break-words text-xs text-deepgreen/75">
                <Network size={12} className="shrink-0" aria-hidden="true" />
                {network}
              </p>
            )}
          </div>
        </div>

        {bio ? (
          <blockquote className="mt-4 line-clamp-2 break-words border-l-4 border-sage pl-3 text-sm italic leading-relaxed text-deepgreen/90">
            “{bio}”
          </blockquote>
        ) : (
          <p className="mt-4 text-sm text-deepgreen/75">Sua biografia aparece aqui.</p>
        )}

        {values.mentoria && specialties.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Especialidades">
            {specialties.map((item) => (
              <li key={item} className="rounded-md bg-lightgray/70 px-2 py-0.5 text-xs font-medium text-deepgreen">
                {item}
              </li>
            ))}
          </ul>
        )}

        {values.mentoria && (
          <div className="mt-4 flex items-center gap-2.5 rounded-2xl bg-lightgray/40 p-3">
            <span className="rounded-lg bg-white p-1.5 text-deepgreen" aria-hidden="true">
              <CalendarDays size={16} />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-deepgreen/75">Capacidade</p>
              <p className="font-bold leading-tight text-deepgreen">
                {values.disponibilidade ? availabilityLabel(values.disponibilidade) : "Disponibilidade não informada"}
              </p>
            </div>
          </div>
        )}
      </article>
    </PitchCard>
  );
}