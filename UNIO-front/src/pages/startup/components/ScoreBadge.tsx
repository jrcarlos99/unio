import { CLASSIFICATION_LABELS } from "../labels";
import type { ScoreClassification } from "../types";
import { formatScore } from "../utils/format";

interface ScoreBadgeProps {
  score: number;
  classification: ScoreClassification;
}

const STYLES: Record<ScoreClassification, string> = {
  EXCELLENT: "bg-deepgreen text-white border-deepgreen",
  GOOD: "bg-sage text-deepgreen border-sage",
  MODERATE: "bg-lightgray text-deepgreen border-deepgreen/20",
  LOW: "bg-white text-deepgreen border-deepgreen/30",
};

export default function ScoreBadge({ score, classification }: ScoreBadgeProps) {
  const label = CLASSIFICATION_LABELS[classification];
  const formattedScore = formatScore(score);

  return (
    <span
      role="img"
      aria-label={`Compatibilidade ${formattedScore} de 100, classificação ${label}`}
      className={`inline-block whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold ${STYLES[classification]}`}
    >
      {formattedScore} · {label}
    </span>
  );
}
