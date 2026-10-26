import { useRef, type RefObject } from "react";
import { OUTLINE_BUTTON, PRIMARY_BUTTON } from "../../pitch/styles";
import TeamDialog from "../team/TeamDialog";

interface PauseProfileDialogProps {
  fallbackFocusRef: RefObject<HTMLElement | null>;
  onConfirm: () => void;
  onClose: () => void;
}

export default function PauseProfileDialog({ fallbackFocusRef, onConfirm, onClose }: PauseProfileDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <TeamDialog
      role="alertdialog"
      size="sm"
      title="Pausar seu perfil?"
      description="Com o perfil pausado, sua startup deixa de aparecer em novas recomendações. Os matches que você já tem continuam com acesso ao seu perfil. Você pode voltar para “Ativo” quando quiser."
      initialFocusRef={cancelRef}
      fallbackFocusRef={fallbackFocusRef}
      onClose={onClose}
    >
      <div className="px-5 py-4 sm:px-6">
        <p className="mb-4 text-sm text-deepgreen/80">A mudança é guardada quando você salvar as alterações.</p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button ref={cancelRef} type="button" onClick={onClose} className={OUTLINE_BUTTON}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={PRIMARY_BUTTON}
          >
            Pausar perfil
          </button>
        </div>
      </div>
    </TeamDialog>
  );
}
