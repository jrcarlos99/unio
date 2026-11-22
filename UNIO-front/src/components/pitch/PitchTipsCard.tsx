import { Clock, Lightbulb, TrendingUp, Users } from "lucide-react";
import PitchCanvasCard from "../discovery/PitchCanvasCard";
import PitchCard from "./PitchCard";

const TIPS = [
  {
    title: "Duração ideal",
    icon: Clock,
    text: "Mantenha seu vídeo entre 2 a 3 minutos com foco na dor e solução clara.",
  },
  {
    title: "Tração & Validação",
    icon: TrendingUp,
    text: "Cite métricas quantitativas (clientes ativos, taxa de retenção ou faturamento).",
  },
  {
    title: "Time & Diferencial",
    icon: Users,
    text: "Destaque a experiência fundadora e a tecnologia proprietária em campo.",
  },
];

// Static tips below the pitch form. 3 columns only when the card itself has
// room for them (container query): next to the preview the column is narrow
// even on large windows.
export default function PitchTipsCard() {
  return (
    <PitchCard title="Boas práticas para pitches de alto impacto" icon={Lightbulb}>
      <div className="@container">
        <ul className="grid grid-cols-1 gap-4 @[36rem]:grid-cols-3">
          {TIPS.map(({ title, icon, text }) => (
            <li key={title}>
              <PitchCanvasCard titulo={title} icone={icon} texto={text} />
            </li>
          ))}
        </ul>
      </div>
    </PitchCard>
  );
}