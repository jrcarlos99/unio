import { Link } from "react-router-dom";
import { RefreshCw, Target } from "lucide-react";
import type { RespostasInvestidor } from "../../../types/onboarding";
import AvisoEstado from "../../discovery/AvisoEstado";
import PitchCard from "../../pitch/PitchCard";
import { OUTLINE_BUTTON } from "../../pitch/styles";

const REVIEW_THESIS_PATH = "/onboarding/investidor?passo=1";

interface ThesisSummaryProps {
  answers: Partial<RespostasInvestidor> | null;
}

function ReviewLink() {
  return (
    <Link to={REVIEW_THESIS_PATH} className={OUTLINE_BUTTON}>
      <RefreshCw size={16} aria-hidden="true" />
      Revisar minha tese
    </Link>
  );
}

function list(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item !== "") : [];
}

export default function ThesisSummary({ answers }: ThesisSummaryProps) {
  const ticket = answers?.apenasMentor ? "Somente mentoria (sem ticket)" : (answers?.ticketMedio ?? "");
  const items: { label: string; values: string[] }[] = [
    { label: "Segmentos de interesse", values: list(answers?.segmentosInteresse) },
    { label: "Estágios das startups", values: list(answers?.estagiosInteresse) },
    { label: "Ticket médio", values: ticket ? [ticket] : [] },
    { label: "Regiões de interesse", values: list(answers?.regioesInteresse) },
    { label: "O que busca nas startups", values: list(answers?.preferenciasStartup) },
    { label: "Formas de interação", values: list(answers?.formasInteracao) },
  ];

  if (items.every((item) => item.values.length === 0)) {
    return (
      <AvisoEstado
        icone={Target}
        titulo="Sua tese ainda não foi definida"
        texto="Responda o onboarding para receber startups compatíveis com seus segmentos, estágios e ticket."
        acao={<ReviewLink />}
      />
    );
  }

  return (
    <PitchCard
      title="Tese de investimento"
      icon={Target}
      subtitle="Resumo das respostas do seu onboarding. Para alterar, revise sua tese."
      badge={<ReviewLink />}
    >
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map(({ label, values }) => (
          <div key={label} className="rounded-2xl border border-lightgray bg-lightgray/30 p-4">
            <dt className="text-xs text-deepgreen/75">{label}</dt>
            <dd className="mt-2">
              {values.length > 0 ? (
                <ul className="flex flex-wrap gap-1.5">
                  {values.map((value) => (
                    <li key={value} className="rounded-md bg-white px-2 py-0.5 text-sm font-medium text-deepgreen">
                      {value}
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-sm text-deepgreen/75">Não informado</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </PitchCard>
  );
}
