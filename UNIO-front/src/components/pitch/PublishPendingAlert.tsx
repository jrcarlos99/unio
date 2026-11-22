import { RotateCw, TriangleAlert } from "lucide-react";
import { OUTLINE_BUTTON } from "./styles";

interface PublishPendingAlertProps {
  // Reason returned by the API for the failed POST .../pitch/publication
  reason: string | null;
  // New edits after the save: retrying only the POST would skip them
  hasNewChanges: boolean;
  retrying: boolean;
  onRetry: () => void;
}

// Shown when the PUT worked but the POST .../pitch/publication failed: the
// changes are saved, but not submitted yet.
export default function PublishPendingAlert({ reason, hasNewChanges, retrying, onRetry }: PublishPendingAlertProps) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-2">
        <TriangleAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-semibold">Suas alterações foram salvas, mas não foram enviadas para publicação.</p>
          {reason && <p className="mt-0.5">{reason}</p>}
          {hasNewChanges && (
            <p className="mt-0.5">Você fez novas alterações. Envie de novo para salvar e enviar tudo.</p>
          )}
        </div>
      </div>
      {!hasNewChanges && (
        <button type="button" onClick={onRetry} disabled={retrying} className={`${OUTLINE_BUTTON} shrink-0`}>
          <RotateCw size={16} aria-hidden="true" />
          {retrying ? "Enviando…" : "Tentar enviar novamente"}
        </button>
      )}
    </div>
  );
}