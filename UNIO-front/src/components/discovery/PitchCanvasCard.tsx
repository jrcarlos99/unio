import type { LucideIcon } from "lucide-react";

interface PitchCanvasCardProps {
  titulo: string;
  icone: LucideIcon;
  texto: string;
}

// Um quadro de texto do perfil (blocos do Lean Canvas publicado, dados do investidor)
export default function PitchCanvasCard({ titulo, icone: Icone, texto }: PitchCanvasCardProps) {
  return (
    <div className="rounded-2xl border border-lightgray bg-lightgray/30 p-5">
      <h3 className="flex items-center gap-2 text-base font-bold text-deepgreen">
        <Icone size={16} aria-hidden="true" />
        {titulo}
      </h3>
      <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-deepgreen/80">{texto}</p>
    </div>
  );
}
