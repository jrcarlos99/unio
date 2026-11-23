import PainelCard from "./PainelCard";

export interface ItemBarra {
  rotulo: string;
  quantidade: number;
}

interface BarListCardProps {
  titulo: string;
  subtitulo?: string;
  dados: ItemBarra[];
  // Classes do grid (col-span) de quem usa o card
  className?: string;
}

// Lista de barras horizontais num PainelCard, com o mesmo visual do
// InterestFunnel: cada barra proporcional ao maior valor da lista. As barras
// são decorativas; o número de cada item está em texto.
export default function BarListCard({ titulo, subtitulo, dados, className }: BarListCardProps) {
  const maior = Math.max(1, ...dados.map((item) => item.quantidade));

  return (
    <PainelCard titulo={titulo} subtitulo={subtitulo} className={className}>
      <ol className="space-y-4">
        {dados.map((item) => (
          <li key={item.rotulo}>
            <div className="flex items-baseline justify-between gap-3 text-sm text-deepgreen">
              <span>{item.rotulo}</span>
              <strong className="shrink-0 font-bold">{item.quantidade.toLocaleString("pt-BR")}</strong>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-lg bg-lightgray/50" aria-hidden="true">
              <div className="h-full rounded-lg bg-deepgreen" style={{ width: `${(item.quantidade / maior) * 100}%` }} />
            </div>
          </li>
        ))}
      </ol>
    </PainelCard>
  );
}
