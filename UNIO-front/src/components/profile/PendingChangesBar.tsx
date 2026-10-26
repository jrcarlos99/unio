import { Check, CircleAlert, Info } from "lucide-react";
import { OUTLINE_BUTTON, PRIMARY_BUTTON } from "../pitch/styles";

interface PendingChangesBarProps {
  saving: boolean;
  error: string | null;
  helperText?: string;
  saveLabel?: string;
  onDiscard: () => void;
  onSave: () => void;
}

export default function PendingChangesBar({
  saving,
  error,
  helperText = "As alterações ficam visíveis para os investidores assim que forem salvas.",
  saveLabel = "Salvar alterações",
  onDiscard,
  onSave,
}: PendingChangesBarProps) {
  return (
    <div className="sticky bottom-4 z-20 mt-6">
      <section
        aria-label="Alterações pendentes"
        className="flex flex-col gap-4 rounded-3xl border border-lightgray bg-white p-4 shadow-soft-lg sm:flex-row sm:items-center sm:justify-between sm:p-5"
      >
        <div className="flex min-w-0 items-start gap-3">
          <span className="rounded-xl bg-sage/30 p-2 text-deepgreen" aria-hidden="true">
            <Info size={18} />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-deepgreen">Você tem alterações pendentes</p>
            <p className="text-sm text-deepgreen/80">{helperText}</p>
            <p role="alert" className="text-sm text-red-600 empty:hidden">
              {error && (
                <span className="mt-1 inline-flex items-start gap-1.5">
                  <CircleAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                  {error}
                </span>
              )}
            </p>
            <p className="sr-only" role="status" aria-live="polite">
              {saving ? "Salvando alterações…" : ""}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col-reverse gap-2 sm:flex-row">
          <button type="button" onClick={onDiscard} disabled={saving} className={OUTLINE_BUTTON}>
            Descartar
          </button>
          <button type="button" onClick={onSave} disabled={saving} className={PRIMARY_BUTTON}>
            <Check size={18} aria-hidden="true" />
            {saving ? "Salvando…" : saveLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
