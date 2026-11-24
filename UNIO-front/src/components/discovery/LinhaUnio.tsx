import type { ReactNode } from "react";
import { ChevronRight, Sparkles } from "lucide-react";
import SeloPopularidade from "../popularidade/SeloPopularidade";
import MatchRing from "./MatchRing";

interface LinhaUnioProps {
  id: string;
  nome: string;
  avatar: ReactNode;
  subtitulo: string;
  match: number | null;
  // Popularidade visível em % (selo pequeno); nula: sem selo
  popularidade?: number | null;
  onAbrir: () => void;
}

// id do botão da linha, para devolver o foco a ela quando o popup fecha
export function idLinhaUnio(id: string) {
  return `unio-${id}`;
}

// Cartão em linha de "Meus unios" (startup para o investidor ou investidor
// para a startup). O cartão inteiro é um botão que abre o popup do unio.
export default function LinhaUnio({ id, nome, avatar, subtitulo, match, popularidade, onAbrir }: LinhaUnioProps) {
  return (
    <li>
      <button
        type="button"
        id={idLinhaUnio(id)}
        onClick={onAbrir}
        aria-haspopup="dialog"
        className="flex w-full flex-wrap items-center gap-4 rounded-3xl border border-lightgray bg-white p-4 text-left shadow-soft transition hover:shadow-soft-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deepgreen focus-visible:ring-offset-2 sm:flex-nowrap sm:p-5"
      >
        {avatar}
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-bold text-deepgreen">{nome}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-deepgreen px-2.5 py-0.5 text-xs font-semibold text-white">
              <Sparkles size={12} aria-hidden="true" />
              Deu match!
            </span>
            <SeloPopularidade percentual={popularidade} />
          </span>
          <span className="mt-0.5 block text-sm text-deepgreen/75">{subtitulo}</span>
        </span>
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-deepgreen">
          Ver contato
          <ChevronRight size={16} aria-hidden="true" />
        </span>
        <MatchRing valor={match} />
      </button>
    </li>
  );
}
