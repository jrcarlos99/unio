import { useRef, useState, type RefObject } from "react";
import { CircleAlert } from "lucide-react";
import { FOCO_VISIVEL } from "../../onboarding/selecao";
import { OUTLINE_BUTTON } from "../../pitch/styles";
import TeamDialog from "./TeamDialog";

interface RemoveMemberDialogProps {
  memberName: string;
  fallbackFocusRef: RefObject<HTMLElement | null>;
  onConfirm: () => Promise<string | null>;
  onClose: () => void;
}

const DANGER_BUTTON = `inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-red-700 px-5 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50 ${FOCO_VISIVEL}`;

export default function RemoveMemberDialog({ memberName, fallbackFocusRef, onConfirm, onClose }: RemoveMemberDialogProps) {
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  async function handleConfirm() {
    setRemoving(true);
    setError(null);
    const message = await onConfirm();
    if (message) {
      setError(message);
      setRemoving(false);
    } else {
      onClose();
    }
  }

  return (
    <TeamDialog
      role="alertdialog"
      size="sm"
      title={`Remover ${memberName} da equipe?`}
      description="Essa ação não pode ser desfeita."
      busy={removing}
      initialFocusRef={cancelRef}
      fallbackFocusRef={fallbackFocusRef}
      onClose={onClose}
    >
      <div className="px-5 py-4 sm:px-6">
        {error && (
          <p role="alert" className="mb-3 flex items-start gap-2 text-sm text-red-700">
            <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button ref={cancelRef} type="button" onClick={onClose} disabled={removing} className={OUTLINE_BUTTON}>
            Cancelar
          </button>
          <button type="button" onClick={() => void handleConfirm()} disabled={removing} className={DANGER_BUTTON}>
            {removing ? "Removendo…" : "Remover"}
          </button>
        </div>
      </div>
    </TeamDialog>
  );
}
