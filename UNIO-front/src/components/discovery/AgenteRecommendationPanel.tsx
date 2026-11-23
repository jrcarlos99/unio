import { AlertCircle, BrainCircuit, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getApiErrorMessage } from "../../services/api";
import {
  getAgenteRecommendations,
  type AiRecommendation,
} from "../../services/agenteRecommendationService";
import { FOCO_VISIVEL } from "../onboarding/selecao";

interface AiRecommendationPanelProps {
  candidateLabel: string;
}

export default function AiRecommendationPanel({ candidateLabel }: AiRecommendationPanelProps) {
  const [recommendations, setRecommendations] = useState<AiRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getAgenteRecommendations(5);
      setRecommendations(response.recommendations);
    } catch (reason) {
      setError(getApiErrorMessage(reason, "Não foi possível gerar as recomendações por IA."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="mb-8 rounded-3xl border border-sage/30 bg-gradient-to-br from-deepgreen to-olive p-5 text-offwhite shadow-soft sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="rounded-2xl bg-white/10 p-3" aria-hidden="true">
            <BrainCircuit size={22} />
          </span>
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-sand">
              <Sparkles size={14} /> Match inteligente
            </p>
            <h2 className="mt-1 text-xl font-bold">{candidateLabel} mapeados para você</h2>
            <p className="mt-1 max-w-2xl text-sm text-offwhite/75">
              A IA analisou seu perfil, seu onboarding e os perfis disponíveis na plataforma.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2" aria-busy="true">
          {[1, 2].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl bg-white/10" />)}
        </div>
      ) : error ? (
        <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-black/10 p-4 text-sm">
          <span className="flex items-center gap-2"><AlertCircle size={18} /> {error}</span>
          <button type="button" onClick={() => void load()} className={`shrink-0 rounded-xl bg-white px-3 py-2 font-semibold text-deepgreen ${FOCO_VISIVEL}`}>
            Tentar novamente
          </button>
        </div>
      ) : recommendations.length === 0 ? (
        <p className="mt-5 rounded-2xl bg-black/10 p-4 text-sm text-offwhite/80">
          Ainda não há perfis suficientes para gerar um match.
        </p>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {recommendations.map((recommendation) => (
            <article key={recommendation.candidateId} className="rounded-2xl bg-white p-4 text-deepgreen">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-bold">{recommendation.candidateName}</h3>
                <strong className="shrink-0 rounded-full bg-sage/20 px-2 py-1 text-xs text-deepgreen">
                  {recommendation.compatibility}%
                </strong>
              </div>
              <p className="mt-2 text-sm text-deepgreen/75">{recommendation.summary}</p>
              {recommendation.strengths[0] && (
                <p className="mt-3 text-xs font-semibold text-olive">Ponto forte: {recommendation.strengths[0]}</p>
              )}
              {recommendation.attentionPoints[0] && (
                <p className="mt-1 text-xs text-deepgreen/60">Atenção: {recommendation.attentionPoints[0]}</p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
