import { useId, type ReactNode } from "react";

interface PainelCardProps {
  titulo: string;
  subtitulo?: ReactNode;
  // Elemento à direita do título (selo, legenda, link)
  extra?: ReactNode;
  // Nível do título: 2 no corpo da página (padrão); 3 quando o card fica
  // dentro de uma seção que já tem h2 (ex.: envios da moderação)
  nivel?: 2 | 3;
  className?: string;
  children: ReactNode;
}

// Card grande da "Visão geral" (gráfico, completude, funil, investidores) e
// dos painéis do administrador
export default function PainelCard({ titulo, subtitulo, extra, nivel = 2, className = "", children }: PainelCardProps) {
  const idTitulo = useId();
  const Titulo = nivel === 3 ? "h3" : "h2";
  return (
    <section
      aria-labelledby={idTitulo}
      className={`flex flex-col rounded-3xl border border-lightgray bg-white p-5 shadow-soft sm:p-6 ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Titulo id={idTitulo} className="text-xl font-bold text-deepgreen">
            {titulo}
          </Titulo>
          {subtitulo && <p className="mt-1 text-sm text-deepgreen/80">{subtitulo}</p>}
        </div>
        {extra && <div className="shrink-0">{extra}</div>}
      </div>
      <div className="mt-5 flex flex-1 flex-col">{children}</div>
    </section>
  );
}
