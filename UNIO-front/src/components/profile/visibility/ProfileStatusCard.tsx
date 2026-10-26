import { CirclePause, CirclePlay, Globe } from "lucide-react";
import type { ProfileStatus } from "../../../types/visibility";
import PitchCard from "../../pitch/PitchCard";

interface ProfileStatusCardProps {
  status: ProfileStatus;
  onSelectActive: () => void;
  onRequestPause: () => void;
}

const OPTIONS = [
  {
    value: "active",
    title: "Ativo",
    description: "Sua startup pode aparecer nas recomendações para investidores.",
    icon: CirclePlay,
  },
  {
    value: "paused",
    title: "Pausado",
    description:
      "Sua startup deixa de aparecer em novas recomendações. Os matches que você já tem continuam com acesso ao seu perfil.",
    icon: CirclePause,
  },
] as const;

export default function ProfileStatusCard({ status, onSelectActive, onRequestPause }: ProfileStatusCardProps) {
  return (
    <PitchCard title="Status do perfil" icon={Globe} subtitle="Escolha se sua startup entra nas recomendações.">
      <fieldset>
        <legend className="sr-only">Status do perfil</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {OPTIONS.map(({ value, title, description, icon: Icon }) => {
            const selected = status === value;
            const descriptionId = `visibility-status-${value}-description`;
            return (
              <label
                key={value}
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors focus-within:ring-2 focus-within:ring-deepgreen ${
                  selected ? "border-deepgreen bg-sage/20" : "border-deepgreen/30 bg-white hover:border-deepgreen"
                }`}
              >
                <input
                  type="radio"
                  name="visibility-status"
                  value={value}
                  checked={selected}
                  aria-describedby={descriptionId}
                  onChange={() => (value === "paused" ? onRequestPause() : onSelectActive())}
                  className="mt-1 h-4 w-4 shrink-0 accent-deepgreen focus:outline-none"
                />
                <span className="min-w-0">
                  <span className="flex items-center gap-2 font-semibold text-deepgreen">
                    <Icon size={18} aria-hidden="true" />
                    {title}
                  </span>
                  <span id={descriptionId} className="mt-1 block text-sm text-deepgreen/80">
                    {description}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
    </PitchCard>
  );
}
