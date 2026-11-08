import { Search, SlidersHorizontal } from "lucide-react";
import SinoNotificacoes from "../layout/SinoNotificacoes";
import { FOCO_VISIVEL } from "../onboarding/selecao";

interface BarraDescobertaProps {
  busca: string;
  onBusca: (valor: string) => void;
  placeholder: string;
  // Rótulo do campo para leitores de tela
  rotuloBusca: string;
  filtrosVisiveis: boolean;
  onAlternarFiltros: () => void;
  // id dos chips que o botão "Filtros" mostra/esconde
  idFiltros: string;
  filtrosAtivos: number;
}

const BOTAO_CLARO = `inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-lightgray bg-white px-4 text-sm font-semibold text-deepgreen transition hover:border-sage ${FOCO_VISIVEL}`;

// Busca, botão "Filtros" e sino de notificações (Descobrir e Investidores)
export default function BarraDescoberta({
  busca,
  onBusca,
  placeholder,
  rotuloBusca,
  filtrosVisiveis,
  onAlternarFiltros,
  idFiltros,
  filtrosAtivos,
}: BarraDescobertaProps) {
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <label className="relative min-w-0 flex-1">
        <span className="sr-only">{rotuloBusca}</span>
        <Search
          size={18}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-deepgreen/75"
          aria-hidden="true"
        />
        <input
          type="search"
          value={busca}
          onChange={(event) => onBusca(event.target.value)}
          placeholder={placeholder}
          className="min-h-[48px] w-full rounded-2xl border border-lightgray bg-white pl-11 pr-4 text-sm text-deepgreen placeholder:text-deepgreen/60 focus:border-deepgreen focus:outline-none focus:ring-2 focus:ring-deepgreen/20"
        />
      </label>
      <button
        type="button"
        onClick={onAlternarFiltros}
        aria-expanded={filtrosVisiveis}
        aria-controls={idFiltros}
        className={BOTAO_CLARO}
      >
        <SlidersHorizontal size={18} aria-hidden="true" />
        <span className="max-sm:sr-only">Filtros</span>
        {filtrosAtivos > 0 && <span className="rounded-full bg-deepgreen px-1.5 text-xs text-white">{filtrosAtivos}</span>}
      </button>
      <SinoNotificacoes
        className={`relative inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-lightgray bg-white text-deepgreen transition hover:border-sage ${FOCO_VISIVEL}`}
      />
    </div>
  );
}
