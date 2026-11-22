import { useId, useRef, useState, type FormEvent, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { BOTAO_ICONE, BOTAO_PRIMARIO, BOTAO_SECUNDARIO, ERRO, ROTULO } from "../../../components/reunioes/estilos";
import { useDialogo } from "../../../hooks/useDialogo";
import { getApiErrorMessage } from "../../../services/api";
import { MOTIVO_MAX, erroDoMotivo } from "../../../services/moderacao.mapping";

interface ModalConfirmacaoProps {
  titulo: string;
  descricao: string;
  rotuloConfirmar: string;
  // Recusar, suspender e remover: motivo obrigatório (3 a 255 caracteres)
  exigeMotivo: boolean;
  // Ação que tira algo do ar: botão vermelho
  destrutiva?: boolean;
  onConfirmar: (motivo: string) => Promise<void>;
  onFechar: () => void;
}

const BOTAO_DESTRUTIVO =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-red-700 px-5 text-sm font-bold text-white transition hover:bg-red-800 disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2";

// Confirmação das ações de moderação (ADR-013): diz o que vai acontecer, pede
// o motivo quando o back exige e mostra o erro do back sem fechar.
export default function ModalConfirmacao({
  titulo,
  descricao,
  rotuloConfirmar,
  exigeMotivo,
  destrutiva = false,
  onConfirmar,
  onFechar,
}: ModalConfirmacaoProps) {
  const id = useId();
  const refTitulo = useRef<HTMLHeadingElement>(null);
  const { refPainel, aoTeclar } = useDialogo(onFechar, refTitulo);
  const [motivo, setMotivo] = useState("");
  const [tentou, setTentou] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  const erroMotivo = exigeMotivo ? erroDoMotivo(motivo) : null;

  async function confirmar(event: FormEvent) {
    event.preventDefault();
    if (enviando) return;
    setTentou(true);
    if (erroMotivo) {
      document.getElementById(`${id}-motivo`)?.focus();
      return;
    }
    setEnviando(true);
    setErro("");
    try {
      await onConfirmar(motivo.trim());
      onFechar();
    } catch (falha) {
      setErro(getApiErrorMessage(falha, "Não foi possível concluir a ação. Tente novamente."));
      setEnviando(false);
    }
  }

  function aoClicarFundo(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget && !enviando) onFechar();
  }

  const mostrarErroMotivo = tentou && erroMotivo;

  return createPortal(
    <div
      className="fixed inset-0 z-[48] flex items-end justify-center bg-deepgreen/40 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={aoClicarFundo}
    >
      <div
        ref={refPainel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-titulo`}
        aria-describedby={`${id}-descricao`}
        onKeyDown={aoTeclar}
        className="flex max-h-[94vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white font-jakarta text-deepgreen shadow-soft-lg sm:max-w-[520px] sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-lightgray px-5 py-4 sm:px-6">
          <h2 id={`${id}-titulo`} ref={refTitulo} tabIndex={-1} className="text-xl font-bold focus:outline-none">
            {titulo}
          </h2>
          <button type="button" onClick={onFechar} aria-label="Fechar" className={BOTAO_ICONE} disabled={enviando}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={confirmar} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
            <p id={`${id}-descricao`} className="text-sm text-deepgreen/85">
              {descricao}
            </p>
            {exigeMotivo && (
              <div>
                <label htmlFor={`${id}-motivo`} className={ROTULO}>
                  Motivo (obrigatório)
                </label>
                <textarea
                  id={`${id}-motivo`}
                  value={motivo}
                  onChange={(event) => setMotivo(event.target.value)}
                  maxLength={MOTIVO_MAX}
                  rows={3}
                  required
                  aria-invalid={mostrarErroMotivo ? true : undefined}
                  aria-describedby={`${id}-motivo-ajuda${mostrarErroMotivo ? ` ${id}-motivo-erro` : ""}`}
                  className={`mt-1 w-full rounded-2xl border bg-white px-4 py-3 text-sm text-deepgreen focus:outline-none focus:ring-2 focus:ring-deepgreen/20 ${
                    mostrarErroMotivo ? "border-red-600" : "border-lightgray focus:border-deepgreen"
                  }`}
                />
                <p id={`${id}-motivo-ajuda`} className="mt-1 text-xs text-deepgreen/75">
                  {motivo.trim().length} de {MOTIVO_MAX} caracteres. Fica no log de auditoria.
                </p>
                {mostrarErroMotivo && (
                  <p id={`${id}-motivo-erro`} className={ERRO}>
                    {erroMotivo}
                  </p>
                )}
              </div>
            )}
            {erro && (
              <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {erro}
              </p>
            )}
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-lightgray px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <button type="button" onClick={onFechar} className={BOTAO_SECUNDARIO} disabled={enviando}>
              Cancelar
            </button>
            <button type="submit" className={destrutiva ? BOTAO_DESTRUTIVO : BOTAO_PRIMARIO} disabled={enviando}>
              {enviando ? "Enviando..." : rotuloConfirmar}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
