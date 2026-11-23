import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from "recharts";
import PainelCard from "./PainelCard";

// Cores do tailwind.config (o SVG precisa do valor, não da classe), como no ViewsChart
const VERDE = "#00412E";
const GRADE = "#E8EAE5";

interface GaugeCardProps {
  titulo: string;
  subtitulo?: string;
  percentual: number;
  legenda: string;
}

// Medidor de 0 a 100% num PainelCard. O PolarAngleAxis escondido define a
// escala do arco; sem ele, o recharts usaria o próprio valor como 100%. O
// gráfico é decorativo para leitores de tela: o número e a legenda estão em
// texto.
export default function GaugeCard({ titulo, subtitulo, percentual, legenda }: GaugeCardProps) {
  const dados = [{ nome: titulo, valor: percentual }];

  return (
    <PainelCard titulo={titulo} subtitulo={subtitulo}>
      <div className="relative mx-auto h-44 w-44">
        <div className="h-full w-full" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart data={dados} innerRadius="72%" outerRadius="100%" barSize={14} startAngle={90} endAngle={-270}>
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar dataKey="valor" cornerRadius={8} fill={VERDE} background={{ fill: GRADE }} isAnimationActive={false} />
            </RadialBarChart>
          </ResponsiveContainer>
        </div>
        <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-4xl font-bold tracking-tight text-deepgreen">
          {percentual}%
        </p>
      </div>
      <p className="mt-4 text-center text-sm text-deepgreen/80">{legenda}</p>
    </PainelCard>
  );
}
