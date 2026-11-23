import { useEffect, useRef } from "react";
import { FOCO_VISIVEL } from "../onboarding/selecao";

const TAMANHOS_AVATAR = {
  sm: "h-9 w-9 text-xs",
  md: "h-12 w-12 text-base",
};

// Avatar de iniciais da contraparte. Decorativo: o nome sempre aparece ao lado.
export function AvatarReuniao({ iniciais, tamanho = "md" }: { iniciais: string; tamanho?: keyof typeof TAMANHOS_AVATAR }) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-sage/40 font-bold text-deepgreen ${TAMANHOS_AVATAR[tamanho]}`}
    >
      {iniciais}
    </span>
  );
}

export function SeloMatch({ valor }: { valor: number }) {
  return (
    <span className="inline-flex items-center rounded-full bg-sage/30 px-2.5 py-0.5 text-xs font-bold text-deepgreen">
      {valor}% match
    </span>
  );
}

interface ConfirmacaoInlineProps {
  titulo: string;
  texto?: string;
  rotuloConfirmar: string;
  rotuloOcupado: string;
  ocupado: boolean;
  onCancelar: () => void;
  onConfirmar: () => void;
}

// Confirmação de ação destrutiva dentro do próprio cartão/drawer (recusar,
// cancelar). O foco vai para a opção segura.
export function ConfirmacaoInline({
  titulo,
  texto,
  rotuloConfirmar,
  rotuloOcupado,
  ocupado,
  onCancelar,
  onConfirmar,
}: ConfirmacaoInlineProps) {
  const refCancelar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    refCancelar.current?.focus();
  }, []);

  return (
    <div role="group" aria-label={titulo} className="rounded-2xl border border-red-200 bg-red-50 p-4">
      <p className="text-sm font-bold text-red-900">{titulo}</p>
      {texto && <p className="mt-1 text-sm text-red-900/90">{texto}</p>}
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button
          ref={refCancelar}
          type="button"
          onClick={onCancelar}
          disabled={ocupado}
          className={`min-h-[40px] rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-900 hover:bg-red-100 ${FOCO_VISIVEL}`}
        >
          Voltar
        </button>
        <button
          type="button"
          onClick={onConfirmar}
          disabled={ocupado}
          aria-busy={ocupado}
          className={`min-h-[40px] rounded-xl bg-red-700 px-4 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-70 ${FOCO_VISIVEL}`}
        >
          {ocupado ? rotuloOcupado : rotuloConfirmar}
        </button>
      </div>
    </div>
  );
}
