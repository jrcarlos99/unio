import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import HighlightCard from "../../admin/components/HighlightCard";
import { CRITERION_LABELS, CRITERION_TIPS } from "../labels";
import type { CompatibilityCriterion } from "../types";

interface AttentionPointCardProps {
  criterion: CompatibilityCriterion;
  className?: string;
}

export default function AttentionPointCard({ criterion, className }: AttentionPointCardProps) {
  return (
    <HighlightCard variant="light" title="Seu ponto de atenção" className={className}>
      <p className="mt-2 flex items-center gap-2 text-lg font-semibold text-deepgreen">
        <AlertTriangle size={20} aria-hidden="true" className="shrink-0" />
        {CRITERION_LABELS[criterion]}
      </p>
      <p className="mt-1 text-sm text-deepgreen">{CRITERION_TIPS[criterion]}</p>

      <Link
        to="/home-startup/perfil"
        className="mt-4 inline-block rounded-full border-2 border-deepgreen px-5 py-2 text-sm font-semibold text-deepgreen transition-colors hover:bg-deepgreen hover:text-white"
      >
        Revisar perfil
      </Link>
    </HighlightCard>
  );
}