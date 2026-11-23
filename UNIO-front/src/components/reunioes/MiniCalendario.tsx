import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatarMesAno, mesDaChave, numeroDoDia, semanasDoMes, somarMeses } from "../../utils/datas";
import { FOCO_VISIVEL } from "../onboarding/selecao";
import { BOTAO_ICONE } from "./estilos";

interface MiniCalendarioProps {
  diaSelecionado: string;
  hoje: string;
  // Dia → quantidade de reuniões (confirmadas e pendentes)
  reunioesPorDia: Map<string, number>;
  onEscolher: (dia: string) => void;
}

const INICIAIS_DIAS = [
  { curta: "S", longa: "segunda" },
  { curta: "T", longa: "terça" },
  { curta: "Q", longa: "quarta" },
  { curta: "Q", longa: "quinta" },
  { curta: "S", longa: "sexta" },
  { curta: "S", longa: "sábado" },
  { curta: "D", longa: "domingo" },
];

// Mês com navegação; ponto nos dias com reunião; clique leva ao dia
export default function MiniCalendario({ diaSelecionado, hoje, reunioesPorDia, onEscolher }: MiniCalendarioProps) {
  const [mes, setMes] = useState(() => mesDaChave(diaSelecionado));
  const [selecaoAnterior, setSelecaoAnterior] = useState(diaSelecionado);

  // A seleção mudou por fora (Hoje, anterior, próximo): mostra o mês dela
  if (selecaoAnterior !== diaSelecionado) {
    setSelecaoAnterior(diaSelecionado);
    setMes(mesDaChave(diaSelecionado));
  }

  const semanas = semanasDoMes(mes.ano, mes.mes);
  const titulo = formatarMesAno(mes.ano, mes.mes);

  return (
    <section aria-label="Mini calendário" className="rounded-3xl border border-lightgray bg-white p-4 shadow-soft">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold capitalize" aria-live="polite">
          {titulo}
        </h2>
        <div className="flex">
          <button
            type="button"
            onClick={() => setMes(somarMeses(mes.ano, mes.mes, -1))}
            aria-label="Mês anterior"
            className={`${BOTAO_ICONE} h-8 w-8`}
          >
            <ChevronLeft size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setMes(somarMeses(mes.ano, mes.mes, 1))}
            aria-label="Próximo mês"
            className={`${BOTAO_ICONE} h-8 w-8`}
          >
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      <table className="mt-2 w-full table-fixed border-collapse text-center text-xs">
        <thead>
          <tr>
            {INICIAIS_DIAS.map((dia) => (
              <th key={dia.longa} scope="col" className="pb-1 font-semibold text-deepgreen/60">
                <abbr title={dia.longa} className="no-underline">
                  {dia.curta}
                </abbr>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {semanas.map((semana) => (
            <tr key={semana[0]}>
              {semana.map((dia) => {
                const doMes = mesDaChave(dia).mes === mes.mes;
                const selecionado = dia === diaSelecionado;
                const ehHoje = dia === hoje;
                const total = reunioesPorDia.get(dia) ?? 0;
                return (
                  <td key={dia} className="p-0.5">
                    <button
                      type="button"
                      onClick={() => onEscolher(dia)}
                      aria-pressed={selecionado}
                      aria-current={ehHoje ? "date" : undefined}
                      aria-label={`${numeroDoDia(dia)}${ehHoje ? ", hoje" : ""}${
                        total ? `, ${total} ${total === 1 ? "reunião" : "reuniões"}` : ""
                      }`}
                      className={`relative mx-auto flex h-8 w-8 flex-col items-center justify-center rounded-full text-xs transition ${FOCO_VISIVEL} ${
                        selecionado
                          ? "bg-deepgreen font-bold text-white"
                          : ehHoje
                            ? "font-bold text-deepgreen ring-1 ring-deepgreen"
                            : doMes
                              ? "text-deepgreen hover:bg-lightgray"
                              : "text-deepgreen/40 hover:bg-lightgray"
                      }`}
                    >
                      {numeroDoDia(dia)}
                      {total > 0 && (
                        <span
                          aria-hidden="true"
                          className={`absolute bottom-0.5 h-1 w-1 rounded-full ${selecionado ? "bg-white" : "bg-sage"}`}
                        />
                      )}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
