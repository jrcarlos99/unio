import { FOCO_VISIVEL } from "../onboarding/selecao";

// Button and chip classes of the "Pitch & Lean Canvas" page. Same classes as
// the buttons of pages/startup/VisaoGeral.tsx, plus the disabled state.
export const PRIMARY_BUTTON = `inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-deepgreen px-5 text-sm font-semibold text-white transition hover:bg-sage hover:text-deepgreen disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-deepgreen disabled:hover:text-white ${FOCO_VISIVEL}`;

export const OUTLINE_BUTTON = `inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-lightgray bg-white px-5 text-sm font-semibold text-deepgreen transition hover:border-sage disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-lightgray ${FOCO_VISIVEL}`;

export const CHIP = "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold";

// Text inputs
export const FIELD_BASE =
  "w-full rounded-2xl border text-sm text-deepgreen placeholder:text-deepgreen/60 focus:outline-none focus:ring-2 focus:ring-deepgreen";

export function fieldBorder(hasError: boolean) {
  return hasError ? "border-red-500" : "border-deepgreen/30";
}
