import { useId, useRef, useState, type FormEvent, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { Lock, X } from "lucide-react";
import { useDialogo } from "../../hooks/useDialogo";
import { useToast } from "../../hooks/useToast";
import { avaliarReuniao } from "../../services/avaliacoesService";
import type { SessaoReunioes } from "../../services/reunioesService";
import { MAX_CARACTERES_COMENTARIO, NOTAS_AVALIACAO, type NotaAvaliacao } from "../../types/avaliacoes";
import type { Reuniao } from "../../types/reunioes";
import { BOTAO_ICONE, BOTAO_PRIMARIO, BOTAO_SECUNDARIO, ERRO, ROTULO } from "./estilos";

interface AvaliarReuniaoModalProps {
  sessao: SessaoReunioes;
  reuniao: Reuniao;
  onFechar: () => void;
  onAvaliada?: () => void;
}

const LEGENDA: Record<NotaAvaliacao, string> = {
  1: "Ruim",
  2: "Fraca",
  3: "Boa",
  4: "Muito boa",
  5: "Excelente",
};

// Avaliação pós-reunião (RF10, ADR-006): nota de 1 a 5 (radiogroup nativo,
// setas do teclado trocam a nota) e comentário opcional que NUNCA é exibido.
// A avaliação é do outro participante; ninguém vê quem deu qual nota.
export default function AvaliarReuniaoModal({ sessao, reuniao, onFechar, onAvaliada }: AvaliarReuniaoModalProps) {
  const { mostrar } = useToast();
  const id = useId();
  const refTitulo = useRef<HTMLHeadingElement>(null);
  const { refPainel, aoTeclar } = useDialogo(onFechar, refTitulo);
  const [nota, setNota] = useState<NotaAvaliacao | null>(null);
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const nome = reuniao.contraparte.nome;

  async function enviar(event: FormEvent) {
    event.preventDefault();
    if (nota === null || enviando) return;
    setEnviando(true);
    setErro("");
    try {
      await avaliarReuniao(sessao, reuniao.id, nota, comentario);
      mostrar("Obrigada pela avaliação.", "sucesso");
      onAvaliada?.();
      onFechar();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível enviar a avaliação. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  function aoClicarFundo(event: MouseEvent<HTMLDivElement>) {
    event.stopPropagation();
    if (event.target === event.currentTarget) onFechar();
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[48] flex items-end justify-center bg-deepgreen/40 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={aoClicarFundo}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <div
        ref={refPainel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-titulo`}
        aria-describedby={`${id}-apoio`}
        onKeyDown={aoTeclar}
        className="flex max-h-[94vh] w-full animate-fade-in flex-col overflow-hidden rounded-t-3xl bg-white font-jakarta text-deepgreen shadow-soft-lg sm:max-h-[90vh] sm:max-w-[520px] sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-lightgray px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id={`${id}-titulo`} ref={refTitulo} tabIndex={-1} className="text-xl font-bold focus:outline-none">
              Como foi a reunião com {nome}?
            </h2>
            <p id={`${id}-apoio`} className="mt-0.5 text-sm text-deepgreen/75">
              Sua nota entra na popularidade de {nome}, sem mostrar quem avaliou.
            </p>
          </div>
          <button type="button" onClick={onFechar} aria-label="Fechar" className={BOTAO_ICONE}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={enviar} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
            <fieldset>
              <legend className={ROTULO}>Nota</legend>
              <div role="radiogroup" aria-label="Nota de 1 a 5" className="mt-2 grid grid-cols-5 gap-2">
                {NOTAS_AVALIACAO.map((valor) => {
                  const ativo = nota === valor;
                  return (
                    <label key={valor} className="relative">
                      <input
                        type="radio"
                        name={`${id}-nota`}
                        value={valor}
                        checked={ativo}
                        onChange={() => setNota(valor)}
                        aria-label={`Nota ${valor} de 5`}
                        className="peer sr-only"
                      />
                      <span
                        aria-hidden="true"
                        className={`flex min-h-[64px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 text-2xl font-bold transition peer-focus-visible:ring-2 peer-focus-visible:ring-deepgreen peer-focus-visible:ring-offset-2 sm:min-h-[72px] ${
                          ativo
                            ? "border-deepgreen bg-deepgreen text-white"
                            : "border-lightgray bg-white text-deepgreen hover:border-sage"
                        }`}
                      >
                        {valor}
                        <span className={`mt-0.5 text-[10px] font-semibold leading-none sm:text-[11px] ${ativo ? "text-white/85" : "text-deepgreen/75"}`}>
                          {LEGENDA[valor]}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div>
              <label htmlFor={`${id}-comentario`} className={ROTULO}>
                Comentário (opcional)
              </label>
              <textarea
                id={`${id}-comentario`}
                value={comentario}
                maxLength={MAX_CARACTERES_COMENTARIO}
                rows={4}
                onChange={(event) => setComentario(event.target.value)}
                aria-describedby={`${id}-privacidade ${id}-contador`}
                className="mt-1.5 w-full resize-y rounded-2xl border border-lightgray bg-white px-4 py-3 text-sm text-deepgreen placeholder:text-deepgreen/50 focus:border-deepgreen focus:outline-none focus:ring-2 focus:ring-deepgreen/20"
                placeholder="Algo que a equipe da UNIO deva saber sobre esta reunião"
              />
              <div className="mt-1.5 flex items-start justify-between gap-3 text-xs text-deepgreen/75">
                <p id={`${id}-privacidade`} className="flex items-start gap-1.5">
                  <Lock size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                  Seu comentário não fica visível para ninguém. Ele é usado só para a moderação e a melhoria da
                  plataforma.
                </p>
                <p id={`${id}-contador`} className="shrink-0 tabular-nums">
                  {comentario.length}/{MAX_CARACTERES_COMENTARIO}
                  <span className="sr-only"> caracteres</span>
                </p>
              </div>
            </div>

            {erro && (
              <p role="alert" className={ERRO}>
                {erro}
              </p>
            )}
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-lightgray px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <button type="button" onClick={onFechar} disabled={enviando} className={BOTAO_SECUNDARIO}>
              Avaliar depois
            </button>
            <button
              type="submit"
              disabled={nota === null || enviando}
              aria-busy={enviando}
              className={`${BOTAO_PRIMARIO} disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {enviando ? "Enviando..." : "Enviar avaliação"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
