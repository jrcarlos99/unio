import { useEffect, useRef } from "react";
import { FOCO_VISIVEL } from "../onboarding/selecao";

interface ConfirmarDesfazerProps {
  nome: string;
  ocupado: boolean;
  // Ex.: "As reuniões com BioPay serão canceladas."
  avisoReunioes?: string | null;
  onCancelar: () => void;
  onConfirmar: () => void;
}

// Confirmação de "Desfazer match", dentro do próprio popup do unio
export default function ConfirmarDesfazer({ nome, ocupado, avisoReunioes, onCancelar, onConfirmar }: ConfirmarDesfazerProps) {
  const refCancelar = useRef<HTMLButtonElement>(null);

  // Foco vai para a opção segura
  useEffect(() => {
    refCancelar.current?.focus();
  }, []);

  return (
    <div
      role="group"
      aria-labelledby="titulo-desfazer"
      aria-describedby="texto-desfazer"
      className="rounded-2xl border border-red-200 bg-red-50 p-4"
    >
      <p id="titulo-desfazer" className="font-bold text-red-900">
        Desfazer match com {nome}?
      </p>
      <p id="texto-desfazer" className="mt-1 text-sm text-red-900/90">
        Vocês deixam de ser unios e o contato deixa de ser exibido. Você poderá demonstrar interesse de novo depois.
      </p>
      {avisoReunioes && <p className="mt-2 text-sm font-semibold text-red-900">{avisoReunioes}</p>}
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button
          ref={refCancelar}
          type="button"
          onClick={onCancelar}
          disabled={ocupado}
          className={`min-h-[40px] rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-900 hover:bg-red-100 ${FOCO_VISIVEL}`}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirmar}
          disabled={ocupado}
          aria-busy={ocupado}
          className={`min-h-[40px] rounded-xl bg-red-700 px-4 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-70 ${FOCO_VISIVEL}`}
        >
          {ocupado ? "Desfazendo..." : "Desfazer match"}
        </button>
      </div>
    </div>
  );
}
