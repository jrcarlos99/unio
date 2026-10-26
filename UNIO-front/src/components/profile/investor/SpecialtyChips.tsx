import { Check } from "lucide-react";
import { FOCO_VISIVEL, alternarItem } from "../../onboarding/selecao";

interface SpecialtyChipsProps {
  id: string;
  label: string;
  options: string[];
  selected: string[];
  max: number;
  disabled?: boolean;
  error?: string;
  onChange: (selected: string[]) => void;
}

export default function SpecialtyChips({
  id,
  label,
  options,
  selected,
  max,
  disabled = false,
  error,
  onChange,
}: SpecialtyChipsProps) {
  const labelId = `${id}-label`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const full = selected.length >= max;
  const chips = [...selected.filter((item) => !options.includes(item)), ...options];

  return (
    <div>
      <p id={labelId} className="font-medium text-deepgreen">
        {label}
      </p>
      <p id={hintId} className="mt-0.5 text-xs text-deepgreen/75" aria-live="polite">
        {full
          ? `Limite de ${max} atingido. Remova uma para escolher outra.`
          : `Escolha até ${max} (${selected.length}/${max}).`}
      </p>
      <div
        id={id}
        role="group"
        tabIndex={-1}
        aria-labelledby={labelId}
        aria-describedby={[hintId, error ? errorId : null].filter(Boolean).join(" ")}
        className="mt-3 flex flex-wrap gap-2 focus:outline-none"
      >
        {chips.map((option) => {
          const pressed = selected.includes(option);
          const blocked = !pressed && full;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={pressed}
              aria-disabled={blocked || undefined}
              disabled={disabled}
              onClick={() => {
                if (!blocked) onChange(alternarItem(selected, option));
              }}
              className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors ${FOCO_VISIVEL} ${
                pressed
                  ? "bg-deepgreen text-white"
                  : "bg-lightgray/70 text-deepgreen hover:bg-sage/40"
              } ${blocked ? "cursor-not-allowed opacity-60 hover:bg-lightgray/70" : ""} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {option}
              {pressed && <Check size={16} aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      {error && (
        <p id={errorId} className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
