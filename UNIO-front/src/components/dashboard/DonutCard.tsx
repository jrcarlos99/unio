import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import PainelCard from "./PainelCard";

export interface FatiaDonut {
  rotulo: string;
  quantidade: number;
}

// Cores do tailwind.config (o SVG precisa do valor, não da classe), como no
// ViewsChart. Cada fatia tem a classe equivalente para o ponto da legenda.
// O cinza é o mesmo da série "Anterior" do ViewsChart.
const SERIES = [
  { cor: "#00412E", opacidade: 1, ponto: "bg-deepgreen" },
  { cor: "#96BF8A", opacidade: 1, ponto: "bg-sage" },
  { cor: "#00412E", opacidade: 0.6, ponto: "bg-deepgreen/60" },
  { cor: "#A8B0A6", opacidade: 1, ponto: "bg-[#A8B0A6]" },
  { cor: "#96BF8A", opacidade: 0.5, ponto: "bg-sage/50" },
];

interface DonutCardProps {
  titulo: string;
  subtitulo?: string;
  dados: FatiaDonut[];
}

// Rosca com legenda num PainelCard. O gráfico é decorativo para leitores de
// tela: a legenda traz cada rótulo com o número.
export default function DonutCard({ titulo, subtitulo, dados }: DonutCardProps) {
  return (
    <PainelCard titulo={titulo} subtitulo={subtitulo}>
      <div className="flex flex-wrap items-center gap-5">
        <div className="h-32 w-32 shrink-0" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={dados}
                dataKey="quantidade"
                nameKey="rotulo"
                innerRadius="60%"
                outerRadius="100%"
                paddingAngle={2}
                isAnimationActive={false}
              >
                {dados.map((fatia, indice) => {
                  const serie = SERIES[indice % SERIES.length];
                  return <Cell key={fatia.rotulo} fill={serie.cor} fillOpacity={serie.opacidade} />;
                })}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <ul className="min-w-0 flex-1 space-y-2">
          {dados.map((fatia, indice) => (
            <li key={fatia.rotulo} className="flex items-center gap-2 text-sm text-deepgreen">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${SERIES[indice % SERIES.length].ponto}`} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{fatia.rotulo}</span>
              <strong className="font-bold">{fatia.quantidade.toLocaleString("pt-BR")}</strong>
            </li>
          ))}
        </ul>
      </div>
    </PainelCard>
  );
}
