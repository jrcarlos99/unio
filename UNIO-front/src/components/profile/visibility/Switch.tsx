import { FOCO_VISIVEL } from "../../onboarding/selecao";

interface SwitchProps {
  id: string;
  checked: boolean;
  describedBy?: string;
  onChange: (checked: boolean) => void;
}

export default function Switch({ id, checked, describedBy, onChange }: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-describedby={describedBy}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
        checked ? "bg-deepgreen" : "bg-deepgreen/60"
      } ${FOCO_VISIVEL}`}
    >
      <span
        aria-hidden="true"
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}
