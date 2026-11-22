import { useCallback } from "react";
import { ExternalLink, FileText, Megaphone } from "lucide-react";
import { useCarregamento } from "../../hooks/useDescoberta";
import { obterPitchPublicado } from "../../services/pitchPublicacaoService";
import { LEAN_CANVAS_FIELDS } from "../../utils/pitch";
import { LEAN_CANVAS_BLOCKS } from "../pitch/leanCanvasBlocks";
import { FOCO_VISIVEL } from "../onboarding/selecao";
import PitchCanvasCard from "./PitchCanvasCard";
import SecaoPerfil from "./SecaoPerfil";

interface PitchPublicadoSecaoProps {
  startupId: string;
}

const AVISO = "rounded-2xl border border-dashed border-deepgreen/20 bg-lightgray/30 px-4 py-6 text-center text-sm text-deepgreen/80";

// Pitch e Lean Canvas publicados da startup, vistos pelo investidor
// (GET /api/discovery/startups/{id}/pitch, D063 do back, ADR-013). O back só
// devolve o que a moderação deixou publicado; 404 vira "ainda não publicou".
export default function PitchPublicadoSecao({ startupId }: PitchPublicadoSecaoProps) {
  const carregar = useCallback(() => obterPitchPublicado(startupId), [startupId]);
  const { carregando, erro, dados: pitch, recarregar } = useCarregamento(
    carregar,
    "Não foi possível carregar o pitch da startup.",
  );

  let conteudo;
  if (carregando) {
    conteudo = (
      <p role="status" className="text-sm text-deepgreen/80">
        Carregando pitch...
      </p>
    );
  } else if (erro) {
    conteudo = (
      <div role="alert" className="text-sm text-red-700">
        <p>{erro}</p>
        <button
          type="button"
          onClick={recarregar}
          className={`mt-2 min-h-[44px] rounded-2xl border border-lightgray bg-white px-4 font-semibold text-deepgreen hover:border-sage ${FOCO_VISIVEL}`}
        >
          Tentar novamente
        </button>
      </div>
    );
  } else if (!pitch) {
    conteudo = <p className={AVISO}>Esta startup ainda não publicou o pitch.</p>;
  } else {
    const blocos = LEAN_CANVAS_FIELDS.filter((campo) => pitch.leanCanvas[campo]);
    conteudo = (
      <div className="space-y-5">
        <div>
          <p className="text-lg font-semibold leading-relaxed text-deepgreen">{pitch.shortPitch}</p>
          {pitch.videoUrl && (
            <a
              href={pitch.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-lightgray bg-white px-4 text-sm font-semibold text-deepgreen hover:border-sage ${FOCO_VISIVEL}`}
            >
              <ExternalLink size={16} aria-hidden="true" />
              Assistir ao vídeo do pitch
              <span className="sr-only">(abre em outra aba)</span>
            </a>
          )}
        </div>

        <div>
          <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-deepgreen">
            <FileText size={16} aria-hidden="true" />
            Lean Canvas
          </h3>
          {blocos.length === 0 ? (
            <p className={AVISO}>A startup ainda não preencheu o Lean Canvas.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {blocos.map((campo) => {
                const { title, icon } = LEAN_CANVAS_BLOCKS[campo];
                return <PitchCanvasCard key={campo} titulo={title} icone={icon} texto={pitch.leanCanvas[campo]} />;
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <SecaoPerfil titulo="Pitch e Lean Canvas" icone={Megaphone}>
      {conteudo}
    </SecaoPerfil>
  );
}
