import type { PitchStatus } from "../../types/pitch";
import SeloStatus, { type TomSelo } from "../ui/SeloStatus";

const STATUS: Record<PitchStatus, { label: string; tom: TomSelo }> = {
  DRAFT: { label: "Rascunho", tom: "neutro" },
  IN_REVIEW: { label: "Em revisão", tom: "andamento" },
  PUBLISHED: { label: "Publicado", tom: "ativo" },
  REJECTED: { label: "Removido pela moderação", tom: "perigo" },
};

// Status of the last submission (GET /api/profile/startup/pitch/publication). Same badge as the admin moderation.
export default function PitchStatusBadge({ status }: { status: PitchStatus }) {
  const { label, tom } = STATUS[status];
  return <SeloStatus rotulo={label} tom={tom} />;
}
