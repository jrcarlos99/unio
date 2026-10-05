import { Link } from "react-router-dom";
import { CRITERION_LABELS, PROFILE_TYPE_LABELS } from "../labels";
import type { CompatibleInvestor } from "../types";
import { getInitials } from "../utils/format";
import ScoreBadge from "./ScoreBadge";

interface CompatibleInvestorsCardProps {
  investors: CompatibleInvestor[];
  className?: string;
}

const MAX_INVESTORS = 3;

export default function CompatibleInvestorsCard({ investors, className = "" }: CompatibleInvestorsCardProps) {
  const visible = investors.slice(0, MAX_INVESTORS);

  return (
    <section className={`rounded-2xl border border-deepgreen/10 bg-white p-5 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-deepgreen">Investidores mais compatíveis</h2>
        <Link
          to="/home-startup/investidores"
          className="text-sm font-semibold text-deepgreen underline-offset-4 hover:underline"
        >
          Ver todos
        </Link>
      </div>

      {visible.length === 0 ? (
        <p className="mt-4 text-sm text-deepgreen">
          Ainda não encontramos investidores compatíveis. Complete seu perfil para receber
          recomendações.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-deepgreen/10">
          {visible.map((investor) => (
            <li
              key={investor.investorId}
              className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-deepgreen text-sm font-bold text-white"
                >
                  {getInitials(investor.name)}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-deepgreen">{investor.name}</p>
                  <p className="text-xs text-deepgreen/70">
                    {PROFILE_TYPE_LABELS[investor.profileType]}
                  </p>
                  {investor.strengths.length > 0 && (
                    <p className="mt-0.5 text-xs text-deepgreen">
                      Combina em:{" "}
                      {investor.strengths.map((criterion) => CRITERION_LABELS[criterion]).join(", ")}
                    </p>
                  )}
                </div>
              </div>36

              <div className="pl-[52px] sm:pl-0">
                <ScoreBadge score={investor.totalScore} classification={investor.classification} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
