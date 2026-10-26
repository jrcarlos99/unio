import { Circle, CircleCheck, Plus } from "lucide-react";
import type { RecommendedDocument } from "../../../types/documents";
import { RECOMMENDED_DOCUMENTS } from "../../../utils/documents";
import { FOCO_VISIVEL } from "../../onboarding/selecao";

interface RecommendedChecklistProps {
  covered: ReadonlySet<RecommendedDocument>;
  canAdd: boolean;
  onAdd: (item: RecommendedDocument) => void;
}

export default function RecommendedChecklist({ covered, canAdd, onAdd }: RecommendedChecklistProps) {
  const done = RECOMMENDED_DOCUMENTS.filter((item) => covered.has(item.id)).length;
  const total = RECOMMENDED_DOCUMENTS.length;

  return (
    <section
      aria-labelledby="documents-checklist-title"
      className="mt-5 rounded-3xl border border-lightgray bg-white p-5 shadow-soft"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="documents-checklist-title" className="text-lg font-bold text-deepgreen">
          Documentos recomendados
        </h3>
        <p className="text-sm font-semibold text-deepgreen">
          {done} de {total}
          <span className="sr-only"> adicionados</span>
        </p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-lightgray" aria-hidden="true">
        <div className="h-full rounded-full bg-deepgreen transition-all" style={{ width: `${(done / total) * 100}%` }} />
      </div>
      <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {RECOMMENDED_DOCUMENTS.map(({ id, label }) => {
          const isDone = covered.has(id);
          return (
            <li
              key={id}
              className="flex min-h-[44px] items-center justify-between gap-2 rounded-2xl bg-lightgray/50 px-3 py-2"
            >
              <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-deepgreen">
                {isDone ? (
                  <CircleCheck size={18} className="shrink-0 text-deepgreen" aria-hidden="true" />
                ) : (
                  <Circle size={18} className="shrink-0 text-deepgreen/60" aria-hidden="true" />
                )}
                {label}
                <span className="sr-only">{isDone ? "(adicionado)" : "(pendente)"}</span>
              </span>
              {!isDone && canAdd && (
                <button
                  type="button"
                  onClick={() => onAdd(id)}
                  aria-label={`Adicionar ${label}`}
                  className={`inline-flex min-h-[32px] shrink-0 items-center gap-1 rounded-full px-2 text-xs font-semibold text-deepgreen underline-offset-2 hover:underline ${FOCO_VISIVEL}`}
                >
                  <Plus size={14} aria-hidden="true" />
                  Adicionar
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
