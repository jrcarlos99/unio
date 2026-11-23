import { CHIP } from "../pitch/styles";

// Tons do selo de situação, iguais em todo o app (pitch da startup e
// moderação do administrador)
export type TomSelo = "neutro" | "andamento" | "ativo" | "perigo";

const TONS: Record<TomSelo, { selo: string; ponto: string }> = {
  neutro: { selo: "bg-lightgray text-deepgreen", ponto: "bg-deepgreen/50" },
  andamento: { selo: "bg-sage/30 text-deepgreen ring-1 ring-sage", ponto: "bg-deepgreen" },
  ativo: { selo: "bg-deepgreen text-white", ponto: "bg-sage" },
  // Mesmo vermelho dos toasts de erro e dos erros de campo do app
  perigo: { selo: "bg-red-50 text-red-800 ring-1 ring-red-200", ponto: "bg-red-600" },
};

interface SeloStatusProps {
  rotulo: string;
  tom: TomSelo;
  // Lido antes do rótulo por leitores de tela (ex.: "Status: ", "Situação: ")
  prefixo?: string;
}

// Selo de situação: o ponto é decorativo, o texto diz a situação
export default function SeloStatus({ rotulo, tom, prefixo = "Status: " }: SeloStatusProps) {
  const { selo, ponto } = TONS[tom];
  return (
    <span className={`${CHIP} whitespace-nowrap ${selo}`}>
      <span className={`h-2 w-2 rounded-full ${ponto}`} aria-hidden="true" />
      {prefixo && <span className="sr-only">{prefixo}</span>}
      {rotulo}
    </span>
  );
}
