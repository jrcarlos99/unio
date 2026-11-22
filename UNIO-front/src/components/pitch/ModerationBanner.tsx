import { CircleCheck, Clock, Info, ShieldAlert } from "lucide-react";
import type { PitchPublication } from "../../types/pitch";
import { formatUpdatedAt } from "../../utils/pitch";

interface ModerationBannerProps {
  // Last submission (GET /api/profile/startup/pitch/publication); null while unknown
  publication: PitchPublication | null;
}

const BOX = "flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm";

// Notice below the tabs with the state of the last submission (ADR-013).
// Everything comes from the API: no fixed review time is promised.
export default function ModerationBanner({ publication }: ModerationBannerProps) {
  const requiresApproval = publication?.requiresApproval ?? true;
  const status = publication?.status ?? "DRAFT";
  const submittedAt = formatUpdatedAt(publication?.submittedAt ?? null);
  const reviewedAt = formatUpdatedAt(publication?.reviewedAt ?? null);

  if (status === "REJECTED") {
    return (
      <div role="alert" className={`${BOX} border-red-200 bg-red-50 text-red-800`}>
        <ShieldAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-semibold">Removido pela moderação. Os investidores não veem este pitch.</p>
          {publication?.reason && <p className="mt-0.5">Motivo: {publication.reason}</p>}
          <p className="mt-0.5">Ajuste o conteúdo e envie de novo.</p>
        </div>
      </div>
    );
  }

  if (status === "IN_REVIEW") {
    return (
      <div role="status" className={`${BOX} border-sage/60 bg-sage/15 text-deepgreen`}>
        <Clock size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-semibold">Em revisão{submittedAt ? `, enviado em ${submittedAt}` : ""}.</p>
          <p className="mt-0.5">O pitch aparece para os investidores depois que a moderação aprovar.</p>
        </div>
      </div>
    );
  }

  if (status === "PUBLISHED") {
    return (
      <div role="status" className={`${BOX} border-deepgreen/20 bg-white text-deepgreen`}>
        <CircleCheck size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-semibold">
            Publicado{reviewedAt ? ` em ${reviewedAt}` : submittedAt ? ` em ${submittedAt}` : ""}. Os investidores já veem
            esta versão.
          </p>
          {requiresApproval && (
            <p className="mt-0.5">
              Uma nova versão enviada substitui esta e só aparece para os investidores depois de aprovada.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`${BOX} border-sage/60 bg-sage/15 text-deepgreen`}>
      <Info size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <p>
        {requiresApproval
          ? "Seu pitch passa pela moderação antes de ficar visível para os investidores da rede do Porto Digital."
          : "Ao publicar, seu pitch fica visível para os investidores. A moderação pode remover conteúdo fora das regras."}
      </p>
    </div>
  );
}
