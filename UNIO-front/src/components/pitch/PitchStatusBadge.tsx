import type { PitchStatus } from "../../types/pitch";
import { CHIP } from "./styles";

const STATUS: Record<PitchStatus, { label: string; badge: string; dot: string }> = {
  DRAFT: { label: "Rascunho", badge: "bg-lightgray text-deepgreen", dot: "bg-deepgreen/50" },
  IN_REVIEW: { label: "Em revisão", badge: "bg-sage/30 text-deepgreen ring-1 ring-sage", dot: "bg-deepgreen" },
  PUBLISHED: { label: "Publicado", badge: "bg-deepgreen text-white", dot: "bg-sage" },
  // Same red as the error toasts and field errors of the app
  REJECTED: { label: "Removido pela moderação", badge: "bg-red-50 text-red-800 ring-1 ring-red-200", dot: "bg-red-600" },
};

// Status of the last submission (GET /api/profile/startup/pitch/publication). The dot is decorative; the text says it.
export default function PitchStatusBadge({ status }: { status: PitchStatus }) {
  const { label, badge, dot } = STATUS[status];
  return (
    <span className={`${CHIP} ${badge}`}>
      <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden="true" />
      <span className="sr-only">Status: </span>
      {label}
    </span>
  );
}