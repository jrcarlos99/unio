import { useId } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import type { PontoSemana } from "../../types/dashboard";
import PainelCard from "./PainelCard";
import SeloExemplo from "./SeloExemplo";

// Cores do tailwind.config (o SVG precisa do valor, não da classe)
const VERDE = "#00412E";
const CINZA = "#A8B0A6";
const GRADE = "#E8EAE5";

interface ViewsChartProps {
  semanas: PontoSemana[];
  mediaDiaria: number;
  // Padrão: "Evolução das visualizações" (Visão geral)
  titulo?: string;
  // Palavra usada na média e na dica ("visualizações" ou "visitas")
  unidade?: string;
  // Modo API sem dado do back: selo "Dados de exemplo" (ADR-007)
  exemplo?: boolean;
}

function Legenda() {
  return (
    <ul className="flex items-center gap-4 text-xs text-deepgreen/80">
      <li className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-deepgreen" aria-hidden="true" />
        Atual
      </li>
      <li className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#A8B0A6]" aria-hidden="true" />
        Anterior
      </li>
    </ul>
  );
}

function Dica({ active, payload, unidade }: TooltipContentProps<ValueType, NameType> & { unidade: string }) {
  const ponto = payload?.[0]?.payload as PontoSemana | undefined;
  if (!active || !ponto) return null;
  return (
    <div className="flex items-center gap-2 rounded-xl bg-deepgreen px-3 py-1.5 text-xs text-white shadow-soft">
      <span className="h-1.5 w-1.5 rounded-full bg-sage" aria-hidden="true" />
      {ponto.semana.replace("Sem", "Semana")}: <strong className="font-bold">{ponto.atual} {unidade}</strong>
    </div>
  );
}

// "Evolução das visualizações": área do período atual x linha tracejada do
// anterior. O gráfico é decorativo para leitores de tela; os números vão numa
// tabela escondida visualmente.
export default function ViewsChart({
  semanas,
  mediaDiaria,
  titulo = "Evolução das visualizações",
  unidade = "visualizações",
  exemplo = false,
}: ViewsChartProps) {
  const idGradiente = useId().replace(/:/g, "");
  const ultimo = semanas.length - 1;
  const media = mediaDiaria.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

  return (
    <PainelCard
      titulo={titulo}
      subtitulo={`Média de ${media} ${unidade}/dia nas últimas semanas`}
      extra={
        exemplo ? (
          <div className="flex flex-col items-end gap-2">
            <SeloExemplo />
            <Legenda />
          </div>
        ) : (
          <Legenda />
        )
      }
    >
      <div className="h-64 w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={semanas} margin={{ top: 36, right: 12, left: 12, bottom: 0 }}>
            <defs>
              <linearGradient id={idGradiente} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#96BF8A" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#96BF8A" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={GRADE} strokeDasharray="4 4" />
            <XAxis
              dataKey="semana"
              axisLine={{ stroke: GRADE }}
              tickLine={false}
              tick={{ fill: VERDE, fontSize: 12 }}
              padding={{ left: 8, right: 8 }}
            />
            <YAxis hide domain={[0, "dataMax + 10"]} />
            {/* Dica fixa no alto do gráfico, acima dos pontos */}
            <Tooltip
              content={(props) => <Dica {...props} unidade={unidade} />}
              defaultIndex={ultimo}
              cursor={false}
              position={{ y: 0 }}
            />
            <Area
              type="monotone"
              dataKey="anterior"
              stroke={CINZA}
              strokeWidth={2}
              strokeDasharray="5 5"
              fill="none"
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="atual"
              stroke={VERDE}
              strokeWidth={3}
              fill={`url(#${idGradiente})`}
              isAnimationActive={false}
              dot={(props: { cx?: number; cy?: number; index?: number }) => (
                <circle
                  key={props.index}
                  cx={props.cx}
                  cy={props.cy}
                  r={props.index === ultimo ? 6 : 5}
                  fill={props.index === ultimo ? VERDE : "#fff"}
                  stroke={VERDE}
                  strokeWidth={2}
                />
              )}
              activeDot={{ r: 7, fill: VERDE, stroke: "#fff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <table className="sr-only">
        <caption>{titulo} por semana</caption>
        <thead>
          <tr>
            <th scope="col">Semana</th>
            <th scope="col">Período atual</th>
            <th scope="col">Período anterior</th>
          </tr>
        </thead>
        <tbody>
          {semanas.map((ponto) => (
            <tr key={ponto.semana}>
              <th scope="row">{ponto.semana}</th>
              <td>{ponto.atual}</td>
              <td>{ponto.anterior}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </PainelCard>
  );
}
