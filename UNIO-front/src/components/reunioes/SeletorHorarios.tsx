import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { MAX_HORARIOS_SUGERIDOS, type Reuniao } from "../../types/reunioes";
import { formatarFaixaHorario, hojeChave } from "../../utils/datas";
import { tituloReuniao } from "../../utils/reunioes";
import { FOCO_VISIVEL } from "../onboarding/selecao";
import { BOTAO_ICONE, CAMPO, ERRO } from "./estilos";
import { isoDaLinha, proximaLinha, type LinhaHorario } from "./horarios";

interface SeletorHorariosProps {
  idBase: string;
  linhas: LinhaHorario[];
  onAlterar: (linhas: LinhaHorario[]) => void;
  erros: Record<string, string>;
  // Reunião confirmada que se sobrepõe ao horário (só aviso)
  conflitoDe: (iso: string) => Reuniao | null;
}

// Até 3 horários (data e hora), mínimo 1. Mostra erro por linha (passado,
// repetido) e aviso de conflito com outra reunião confirmada, sem bloquear.
export default function SeletorHorarios({ idBase, linhas, onAlterar, erros, conflitoDe }: SeletorHorariosProps) {
  const hoje = hojeChave();
  const noLimite = linhas.length >= MAX_HORARIOS_SUGERIDOS;

  function alterar(id: string, campo: "data" | "hora", valor: string) {
    onAlterar(linhas.map((linha) => (linha.id === id ? { ...linha, [campo]: valor } : linha)));
  }

  return (
    <div>
      <ol className="space-y-3">
        {linhas.map((linha, indice) => {
          const erro = erros[linha.id];
          const iso = isoDaLinha(linha);
          const conflito = !erro && iso ? conflitoDe(iso) : null;
          const idData = `${idBase}-data-${indice}`;
          const idHora = `${idBase}-hora-${indice}`;
          const idMensagem = `${idBase}-msg-${indice}`;
          const descrito = erro || conflito ? idMensagem : undefined;
          return (
            <li key={linha.id} className="rounded-2xl border border-lightgray bg-lightgray/20 p-3">
              <div className="flex items-end gap-2">
                <span className="mb-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-deepgreen text-xs font-bold text-white" aria-hidden="true">
                  {indice + 1}
                </span>
                <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 min-[400px]:grid-cols-[1fr_auto]">
                  <div className="min-w-0">
                    <label htmlFor={idData} className="text-xs font-semibold text-deepgreen/80">
                      Data do horário {indice + 1}
                    </label>
                    <input
                      id={idData}
                      data-campo-horario={linha.id}
                      type="date"
                      min={hoje}
                      value={linha.data}
                      onChange={(event) => alterar(linha.id, "data", event.target.value)}
                      aria-invalid={Boolean(erro)}
                      aria-describedby={descrito}
                      className={`${CAMPO(Boolean(erro))} mt-1`}
                    />
                  </div>
                  <div>
                    <label htmlFor={idHora} className="text-xs font-semibold text-deepgreen/80">
                      Hora
                    </label>
                    <input
                      id={idHora}
                      type="time"
                      step={900}
                      value={linha.hora}
                      onChange={(event) => alterar(linha.id, "hora", event.target.value)}
                      aria-invalid={Boolean(erro)}
                      aria-describedby={descrito}
                      className={`${CAMPO(Boolean(erro))} mt-1 min-[400px]:w-32`}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onAlterar(linhas.filter((item) => item.id !== linha.id))}
                  disabled={linhas.length <= 1}
                  aria-label={`Remover horário ${indice + 1}`}
                  className={`${BOTAO_ICONE} mb-0.5 disabled:cursor-not-allowed disabled:opacity-40`}
                >
                  <Trash2 size={18} aria-hidden="true" />
                </button>
              </div>
              {erro && (
                <p id={idMensagem} className={`${ERRO} ml-8`}>
                  {erro}
                </p>
              )}
              {conflito && conflito.horarioConfirmado && (
                <p
                  id={idMensagem}
                  className="ml-8 mt-2 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900"
                >
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                  <span>
                    Conflito com outra reunião: {tituloReuniao(conflito)},{" "}
                    {formatarFaixaHorario(conflito.horarioConfirmado, conflito.duracaoMin)}. Você ainda pode sugerir
                    este horário.
                  </span>
                </p>
              )}
            </li>
          );
        })}
      </ol>
      <div className="mt-3">
        {noLimite ? (
          <p className="text-xs text-deepgreen/75" aria-live="polite">
            Limite atingido: até {MAX_HORARIOS_SUGERIDOS} horários.
          </p>
        ) : (
          <button
            type="button"
            onClick={() => onAlterar([...linhas, proximaLinha(linhas)])}
            className={`inline-flex min-h-[40px] items-center gap-2 rounded-xl px-3 text-sm font-semibold text-deepgreen hover:bg-lightgray/60 ${FOCO_VISIVEL}`}
          >
            <Plus size={16} aria-hidden="true" />
            Adicionar horário
          </button>
        )}
      </div>
    </div>
  );
}
