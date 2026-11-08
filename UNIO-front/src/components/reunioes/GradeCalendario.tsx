import { useEffect, useMemo, useRef, type KeyboardEvent, type MouseEvent } from "react";
import type { Reuniao } from "../../types/reunioes";
import {
  DIAS_CURTOS,
  DIAS_LONGOS,
  chaveDia,
  diaDaSemana,
  distribuirColunas,
  formatarHora,
  inicioDoDia,
  minutosDoDia,
  numeroDoDia,
  somarMinutos,
} from "../../utils/datas";
import { FOCO_VISIVEL } from "../onboarding/selecao";
import EventoBloco from "./EventoBloco";

const HORA_INICIO = 8;
const HORA_FIM = 20;
const HORA_PX = 64;
const ALTURA_TOTAL = (HORA_FIM - HORA_INICIO) * HORA_PX;
const ALTURA_MINIMA_EVENTO = 26;

export interface GradeCalendarioProps {
  dias: string[];
  hoje: string;
  agora: Date;
  // Confirmadas e pendentes (recusadas e canceladas não chegam aqui)
  reunioes: Reuniao[];
  onAbrirEvento: (reuniao: Reuniao) => void;
  // Clique numa célula vazia: início do horário (ISO)
  onCelula: (iso: string) => void;
  // Clique no cabeçalho do dia (semana → dia)
  onSelecionarDia?: (dia: string) => void;
  // Setas além do primeiro/último dia visível
  onMudarDia?: (delta: number) => void;
}

interface BlocoDia {
  chave: string;
  reuniao: Reuniao;
  inicio: string;
}

// Horários que a reunião ocupa na grade: o confirmado, ou os sugeridos
function horariosNaGrade(reuniao: Reuniao) {
  return reuniao.status === "confirmada" && reuniao.horarioConfirmado
    ? [reuniao.horarioConfirmado]
    : reuniao.horariosSugeridos;
}

function posicaoVertical(inicio: string, duracaoMin: number) {
  const minutos = minutosDoDia(inicio) - HORA_INICIO * 60;
  const altura = Math.max((duracaoMin / 60) * HORA_PX, ALTURA_MINIMA_EVENTO);
  const topo = Math.min(Math.max((minutos / 60) * HORA_PX, 0), ALTURA_TOTAL - ALTURA_MINIMA_EVENTO);
  return { topo, altura: Math.min(altura, ALTURA_TOTAL - topo) };
}

// Grade estilo Teams (CSS grid): coluna das horas + uma coluna por dia, de
// 8h às 20h com rolagem própria. Semana (7 dias) ou dia (1). Dia atual
// destacado e linha vermelha da hora atual. Teclado: setas entre dias e
// entre eventos do dia, Enter abre o evento.
export default function GradeCalendario({
  dias,
  hoje,
  agora,
  reunioes,
  onAbrirEvento,
  onCelula,
  onSelecionarDia,
  onMudarDia,
}: GradeCalendarioProps) {
  const refRolagem = useRef<HTMLDivElement>(null);
  const semana = dias.length > 1;
  const colunas = `56px repeat(${dias.length}, minmax(0, 1fr))`;

  // Abre a grade perto da hora atual
  useEffect(() => {
    const hora = Math.min(Math.max(minutosDoDia(new Date()) / 60 - 1, HORA_INICIO), HORA_FIM) - HORA_INICIO;
    refRolagem.current?.scrollTo({ top: hora * HORA_PX });
  }, []);

  const blocosPorDia = useMemo(() => {
    const mapa = new Map<string, BlocoDia[]>(dias.map((dia) => [dia, []]));
    for (const reuniao of reunioes) {
      for (const inicio of horariosNaGrade(reuniao)) {
        mapa.get(chaveDia(inicio))?.push({ chave: `${reuniao.id}|${inicio}`, reuniao, inicio });
      }
    }
    for (const lista of mapa.values()) lista.sort((a, b) => a.inicio.localeCompare(b.inicio));
    return mapa;
  }, [dias, reunioes]);

  const minutosAgora = minutosDoDia(agora);
  const linhaAgora =
    minutosAgora >= HORA_INICIO * 60 && minutosAgora <= HORA_FIM * 60
      ? ((minutosAgora - HORA_INICIO * 60) / 60) * HORA_PX
      : null;

  function aoClicarColuna(event: MouseEvent<HTMLDivElement>, dia: string) {
    if (event.target !== event.currentTarget) return;
    const y = event.clientY - event.currentTarget.getBoundingClientRect().top;
    const meiaHora = Math.floor(y / (HORA_PX / 2));
    onCelula(somarMinutos(inicioDoDia(dia), HORA_INICIO * 60 + meiaHora * 30));
  }

  function focarDia(dia: string) {
    const raiz = refRolagem.current;
    if (!raiz) return;
    const alvo =
      raiz.querySelector<HTMLElement>(`[data-evento][data-dia="${dia}"]`) ??
      raiz.querySelector<HTMLElement>(`[data-cabecalho-dia="${dia}"]`);
    alvo?.focus();
  }

  function aoTeclar(event: KeyboardEvent<HTMLDivElement>) {
    const alvo = event.target as HTMLElement;
    const dia = alvo.dataset.dia ?? alvo.dataset.cabecalhoDia;
    if (!dia) return;
    const indice = dias.indexOf(dia);
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const delta = event.key === "ArrowLeft" ? -1 : 1;
      const proximo = dias[indice + delta];
      if (proximo) focarDia(proximo);
      else onMudarDia?.(delta);
      return;
    }
    if ((event.key === "ArrowUp" || event.key === "ArrowDown") && alvo.dataset.evento !== undefined) {
      event.preventDefault();
      const eventos = Array.from(
        refRolagem.current?.querySelectorAll<HTMLElement>(`[data-evento][data-dia="${dia}"]`) ?? [],
      );
      const atual = eventos.indexOf(alvo);
      const proximo = eventos[atual + (event.key === "ArrowUp" ? -1 : 1)];
      proximo?.focus();
    }
  }

  return (
    <div
      ref={refRolagem}
      onKeyDown={aoTeclar}
      className="max-h-[min(70vh,680px)] overflow-auto rounded-2xl border border-lightgray bg-white"
    >
      <div className={semana ? "min-w-[560px]" : ""}>
        {/* Cabeçalho dos dias */}
        <div
          className="sticky top-0 z-30 grid border-b border-lightgray bg-white"
          style={{ gridTemplateColumns: colunas }}
        >
          <div className="flex items-end justify-center pb-2 text-[10px] font-semibold text-deepgreen/60">GMT-3</div>
          {dias.map((dia) => {
            const ehHoje = dia === hoje;
            const conteudo = (
              <>
                <span className="text-xs font-semibold uppercase text-deepgreen/70">
                  {semana ? DIAS_CURTOS[diaDaSemana(dia)] : DIAS_LONGOS[diaDaSemana(dia)]}
                </span>
                <span
                  className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full text-base font-bold ${
                    ehHoje ? "bg-deepgreen text-white" : "text-deepgreen"
                  }`}
                >
                  {numeroDoDia(dia)}
                </span>
              </>
            );
            const classe = `flex w-full flex-col items-center border-l border-lightgray py-2 ${ehHoje ? "bg-sage/10" : ""}`;
            return semana && onSelecionarDia ? (
              <button
                key={dia}
                type="button"
                data-cabecalho-dia={dia}
                onClick={() => onSelecionarDia(dia)}
                aria-label={`${DIAS_LONGOS[diaDaSemana(dia)]}, dia ${numeroDoDia(dia)}${ehHoje ? ", hoje" : ""}. Ver o dia`}
                aria-current={ehHoje ? "date" : undefined}
                className={`${classe} hover:bg-lightgray/40 ${FOCO_VISIVEL} focus-visible:ring-offset-0`}
              >
                {conteudo}
              </button>
            ) : (
              <div key={dia} className={classe} aria-current={ehHoje ? "date" : undefined}>
                {conteudo}
              </div>
            );
          })}
        </div>

        {/* Corpo */}
        <div className="grid" style={{ gridTemplateColumns: colunas, height: ALTURA_TOTAL }}>
          <div className="relative" aria-hidden="true">
            {Array.from({ length: HORA_FIM - HORA_INICIO + 1 }, (_, i) => (
              <span
                key={i}
                className="absolute right-2 -translate-y-1/2 text-[11px] text-deepgreen/60"
                style={{ top: Math.max(i * HORA_PX, 6) }}
              >
                {String(HORA_INICIO + i).padStart(2, "0")}:00
              </span>
            ))}
          </div>

          {dias.map((dia) => {
            const blocos = blocosPorDia.get(dia) ?? [];
            const posicoes = distribuirColunas(
              blocos.map((b) => ({ chave: b.chave, inicio: b.inicio, duracaoMin: b.reuniao.duracaoMin })),
            );
            const ehHoje = dia === hoje;
            return (
              <div
                key={dia}
                role="group"
                aria-label={`${DIAS_LONGOS[diaDaSemana(dia)]}, dia ${numeroDoDia(dia)}: ${
                  blocos.length === 0 ? "sem reuniões" : `${blocos.length} ${blocos.length === 1 ? "reunião" : "reuniões"}`
                }`}
                onClick={(event) => aoClicarColuna(event, dia)}
                className={`relative cursor-pointer border-l border-lightgray ${ehHoje ? "bg-sage/10" : ""}`}
              >
                {Array.from({ length: HORA_FIM - HORA_INICIO }, (_, i) => (
                  <div key={i} aria-hidden="true" className="pointer-events-none absolute inset-x-0" style={{ top: i * HORA_PX }}>
                    <div className="border-t border-lightgray" />
                    <div className="border-t border-dashed border-lightgray/60" style={{ marginTop: HORA_PX / 2 - 1 }} />
                  </div>
                ))}

                {blocos.map((bloco) => {
                  const { topo, altura } = posicaoVertical(bloco.inicio, bloco.reuniao.duracaoMin);
                  const { coluna, colunas: total } = posicoes.get(bloco.chave) ?? { coluna: 0, colunas: 1 };
                  return (
                    <EventoBloco
                      key={bloco.chave}
                      reuniao={bloco.reuniao}
                      inicio={bloco.inicio}
                      dia={dia}
                      altura={altura}
                      estilo={{
                        top: topo + 1,
                        height: altura - 2,
                        left: `calc(${(coluna / total) * 100}% + 2px)`,
                        width: `calc(${100 / total}% - 4px)`,
                      }}
                      onAbrir={() => onAbrirEvento(bloco.reuniao)}
                    />
                  );
                })}

                {ehHoje && linhaAgora !== null && (
                  <div
                    className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
                    style={{ top: linhaAgora }}
                    role="img"
                    aria-label={`Agora, ${formatarHora(agora)}`}
                  >
                    <span className="-ml-1.5 h-3 w-3 rounded-full bg-red-600" />
                    <span className="h-0.5 flex-1 bg-red-600" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
