// Anel circular com o % de compatibilidade. A cor do arco acompanha o valor:
// >= 90 verde profundo, 80 a 89 sálvia, abaixo disso sálvia clara. As cores
// são as do tailwind.config (SVG precisa do valor, não da classe).
const COR_FORTE = "#00412E"; // deepgreen
const COR_MEDIA = "#96BF8A"; // sage
const COR_FRACA = "#C9DDC1"; // sage clara
const COR_TRILHA = "#E8EAE5"; // lightgray

const TAMANHOS = {
  sm: { lado: 48, traco: 4 },
  lg: { lado: 156, traco: 12 },
};

function corDoArco(valor: number) {
  if (valor >= 90) return COR_FORTE;
  if (valor >= 80) return COR_MEDIA;
  return COR_FRACA;
}

interface MatchRingProps {
  valor: number | null;
  tamanho?: keyof typeof TAMANHOS;
}

export default function MatchRing({ valor, tamanho = "sm" }: MatchRingProps) {
  const { lado, traco } = TAMANHOS[tamanho];
  const raio = (lado - traco) / 2;
  const circunferencia = 2 * Math.PI * raio;
  const limitado = valor === null ? 0 : Math.min(Math.max(valor, 0), 100);

  return (
    <div
      role="img"
      aria-label={valor === null ? "Compatibilidade indisponível por falta de dados" : `Compatibilidade de ${limitado}%`}
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: lado, height: lado }}
    >
      <svg width={lado} height={lado} viewBox={`0 0 ${lado} ${lado}`} className="-rotate-90" aria-hidden="true">
        <circle cx={lado / 2} cy={lado / 2} r={raio} fill="none" stroke={COR_TRILHA} strokeWidth={traco} />
        <circle
          cx={lado / 2}
          cy={lado / 2}
          r={raio}
          fill="none"
          stroke={corDoArco(limitado)}
          strokeWidth={traco}
          strokeLinecap="round"
          strokeDasharray={circunferencia}
          strokeDashoffset={circunferencia * (1 - limitado / 100)}
        />
      </svg>
      {tamanho === "sm" ? (
        <span className="absolute text-xs font-bold text-deepgreen" aria-hidden="true">
          {valor === null ? "—" : `${limitado}%`}
        </span>
      ) : (
        <span className="absolute flex flex-col items-center" aria-hidden="true">
          <span className="text-4xl font-bold leading-none text-deepgreen">{valor === null ? "—" : `${limitado}%`}</span>
          <span className="mt-1 text-xs font-medium text-deepgreen/75">Match Score</span>
        </span>
      )}
    </div>
  );
}
