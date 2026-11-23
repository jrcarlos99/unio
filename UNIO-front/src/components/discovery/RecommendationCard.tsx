import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, Sparkles, Star, type LucideIcon } from "lucide-react";
import SeloPopularidade from "../popularidade/SeloPopularidade";
import MatchRing from "./MatchRing";

export interface ChipCard {
  texto: string;
  // neutro: cinza; destaque: borda sálvia (estágio); suave: cinza claro (tag)
  estilo: "neutro" | "destaque" | "suave";
}

export interface MetricaCard {
  rotulo: string;
  valor: string;
}

interface RecommendationCardProps {
  // Perfil aberto ao clicar no card
  href: string;
  titulo: string;
  verificado: boolean;
  // "Verificada" (startup) / "Verificado" (investidor)
  rotuloVerificado: string;
  subtitulo: string;
  // Logo da startup ou avatar do investidor
  avatar: ReactNode;
  categoria: string;
  match: number | null;
  // Popularidade visível em % (selo pequeno); nula: sem selo
  popularidade?: number | null;
  melhorMatch: boolean;
  deuMatch: boolean;
  chips: ChipCard[];
  descricao: string;
  principal: MetricaCard & { icone: LucideIcon };
  // Sem o dado no back, a métrica da direita não aparece
  secundaria?: MetricaCard;
  // Botões do rodapé (ficam por cima do link do card)
  acoes: ReactNode;
}

const SELO = "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs";

const ESTILO_CHIP: Record<ChipCard["estilo"], string> = {
  neutro: "bg-lightgray/70 font-medium text-deepgreen",
  destaque: "border border-sage bg-sage/20 font-medium text-deepgreen",
  suave: "bg-lightgray/50 text-deepgreen/75",
};

function Selo({ categoria, melhorMatch, deuMatch }: Pick<RecommendationCardProps, "categoria" | "melhorMatch" | "deuMatch">) {
  if (deuMatch) {
    return (
      <span className={`${SELO} bg-deepgreen font-semibold text-white`}>
        <Sparkles size={12} aria-hidden="true" />
        Deu match!
      </span>
    );
  }
  if (melhorMatch) {
    return (
      <span className={`${SELO} bg-sage/40 font-semibold text-deepgreen`}>
        <Star size={12} fill="currentColor" aria-hidden="true" />
        Melhor match
      </span>
    );
  }
  // Sem categoria (perfil do back sem segmento): sem selo, mas o espaço fica
  if (!categoria) return <span aria-hidden="true" />;
  return (
    <span className={`${SELO} bg-lightgray/70 font-medium text-deepgreen`}>
      <span className="h-1.5 w-1.5 rounded-full bg-deepgreen" aria-hidden="true" />
      {categoria}
    </span>
  );
}

// Estrutura comum dos cards de recomendação (startup para o investidor e
// investidor para a startup): selo + anel de match, identidade, chips,
// descrição, métricas e ações. O título é um link que cobre o card todo
// (clicar fora dos botões abre o perfil); as ações ficam por cima (z-10).
export default function RecommendationCard({
  href,
  titulo,
  verificado,
  rotuloVerificado,
  subtitulo,
  avatar,
  categoria,
  match,
  popularidade,
  melhorMatch,
  deuMatch,
  chips,
  descricao,
  principal,
  secundaria,
  acoes,
}: RecommendationCardProps) {
  const { icone: Icone } = principal;
  return (
    <article
      className={`relative flex h-full flex-col rounded-3xl bg-white p-5 shadow-soft transition hover:shadow-soft-lg ${
        melhorMatch ? "border-2 border-sage" : "border border-lightgray"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <Selo categoria={categoria} melhorMatch={melhorMatch} deuMatch={deuMatch} />
        <MatchRing valor={match} />
      </div>

      <div className="mt-3 flex items-center gap-3">
        {avatar}
        <div className="min-w-0">
          <h3 className="flex items-center gap-1.5 text-lg font-bold leading-tight text-deepgreen">
            <Link
              to={href}
              className="after:absolute after:inset-0 after:rounded-3xl after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-deepgreen focus-visible:after:ring-offset-2"
            >
              {titulo}
            </Link>
            {verificado && <BadgeCheck size={16} className="shrink-0" role="img" aria-label={rotuloVerificado} />}
          </h3>
          <p className="mt-0.5 text-xs text-deepgreen/75">{subtitulo}</p>
          <SeloPopularidade percentual={popularidade} className="mt-1.5" />
        </div>
      </div>

      <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Características">
        {chips.filter((chip) => chip.texto).map((chip) => (
          <li key={chip.texto} className={`rounded-md px-2 py-0.5 text-xs ${ESTILO_CHIP[chip.estilo]}`}>
            {chip.texto}
          </li>
        ))}
      </ul>

      {descricao && <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-deepgreen/80">{descricao}</p>}

      <div className="mt-auto pt-5">
        <div className="flex items-end justify-between gap-3 border-t border-lightgray pt-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="rounded-lg bg-lightgray p-1.5 text-deepgreen" aria-hidden="true">
              <Icone size={16} />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-deepgreen/75">{principal.rotulo}</p>
              <p className="text-lg font-bold leading-tight text-deepgreen">{principal.valor}</p>
            </div>
          </div>
          {secundaria && (
            <div className="shrink-0 text-right">
              <p className="text-xs text-deepgreen/75">{secundaria.rotulo}</p>
              <p className="text-sm font-semibold text-deepgreen">{secundaria.valor}</p>
            </div>
          )}
        </div>

        <div className="relative z-10 mt-4 flex items-start gap-2">{acoes}</div>
      </div>
    </article>
  );
}
