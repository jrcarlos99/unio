import { useId, useRef, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useDialogo } from "../../hooks/useDialogo";
import { BOTAO_ICONE } from "./estilos";

interface PainelLateralProps {
  titulo: string;
  linhaApoio?: ReactNode;
  selo?: ReactNode;
  onFechar: () => void;
  children: ReactNode;
  rodape?: ReactNode;
}

// Drawer à direita (tela inteira no mobile) usado pelos detalhes da reunião
// e pela solicitação recebida. role="dialog", foco preso e devolvido.
export default function PainelLateral({ titulo, linhaApoio, selo, onFechar, children, rodape }: PainelLateralProps) {
  const idTitulo = useId();
  const refTitulo = useRef<HTMLHeadingElement>(null);
  const { refPainel, aoTeclar } = useDialogo(onFechar, refTitulo);

  // Fecha só quando o clique começa e termina no fundo escuro
  function aoClicarFundo(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onFechar();
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[46] flex justify-end bg-deepgreen/40 backdrop-blur-sm"
      onClick={aoClicarFundo}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <div
        ref={refPainel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        onKeyDown={aoTeclar}
        className="flex h-full w-full animate-fade-in flex-col bg-white font-jakarta text-deepgreen shadow-soft-lg sm:max-w-[460px]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-lightgray px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id={idTitulo} ref={refTitulo} tabIndex={-1} className="text-lg font-bold focus:outline-none">
                {titulo}
              </h2>
              {selo}
            </div>
            {linhaApoio && <p className="mt-0.5 text-xs text-deepgreen/75">{linhaApoio}</p>}
          </div>
          <button type="button" onClick={onFechar} aria-label="Fechar" className={BOTAO_ICONE}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {rodape && <div className="border-t border-lightgray px-5 py-4 sm:px-6">{rodape}</div>}
      </div>
    </div>,
    document.body,
  );
}
