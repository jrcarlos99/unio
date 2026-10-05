import { Link } from "react-router-dom";
import { Circle } from "lucide-react";
import HighlightCard from "../../admin/components/HighlightCard";
import { PROFILE_SECTION_LABELS } from "../labels";
import type { ProfileSection } from "../types";

interface ProfileCompletionCardProps {
  completion: number;
  pendingSections: ProfileSection[];
  className?: string;
}

export default function ProfileCompletionCard({
  completion,
  pendingSections,
  className,
}: ProfileCompletionCardProps) {
  const percent = Math.min(100, Math.max(0, Math.round(completion)));

  return (
    <HighlightCard variant="dark" title="Complete seu perfil" className={className}>
      <p className="mt-2 text-lg font-semibold">
        Perfis completos recebem recomendações mais precisas.
      </p>

      <div className="mt-4 flex items-center gap-3">
        <div
          role="progressbar"
          aria-label="Perfil completo"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-2 flex-1 overflow-hidden rounded-full bg-white/20"
        >
          <div className="h-full rounded-full bg-sage" style={{ width: `${percent}%` }} />
        </div>
        <span className="text-sm font-bold">{percent}%</span>
      </div>

      {pendingSections.length > 0 && (
        <ul className="mt-4 space-y-2" aria-label="Seções pendentes">
          {pendingSections.map((section) => (
            <li key={section} className="flex items-center gap-2 text-sm text-white/90">
              <Circle size={14} aria-hidden="true" className="shrink-0" />
              {PROFILE_SECTION_LABELS[section]}
            </li>
          ))}
        </ul>
      )}

      <Link
        to="/home-startup/perfil"
        className="mt-5 inline-block rounded-full border-2 border-white px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-deepgreen"
      >
        Completar perfil
      </Link>
    </HighlightCard>
  );
}
