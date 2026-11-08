import { LayoutGrid } from "lucide-react";
import type { LeanCanvas, PitchFieldKey, PitchFormErrors } from "../../types/pitch";
import { CANVAS_BLOCK_MAX, LEAN_CANVAS_FIELDS, fieldId } from "../../utils/pitch";
import PitchCard from "./PitchCard";
import TextAreaField from "./TextAreaField";
import { LEAN_CANVAS_BLOCKS } from "./leanCanvasBlocks";

interface LeanCanvasGridProps {
  values: LeanCanvas;
  errors: PitchFormErrors;
  onChange: (field: PitchFieldKey, value: string) => void;
  onBlur: (field: PitchFieldKey) => void;
}

// "Lean Canvas" tab: the 9 editable blocks. The layout follows the width of
// the canvas itself (container queries, so the sidebar is already taken into
// account): 1, 2 and 3 columns, then the classic canvas from 1280px. Stages
// in leanCanvasBlocks.ts. The DOM follows the reading order of the canvas, so
// the tab order is the same at every width.
export default function LeanCanvasGrid({ values, errors, onChange, onBlur }: LeanCanvasGridProps) {
  return (
    <PitchCard
      title="Lean Canvas"
      icon={LayoutGrid}
      subtitle="Seu modelo de negócio em uma página, para os investidores entenderem a startup de relance."
    >
      <div className="@container">
        <div
          data-canvas-grid
          className="grid grid-cols-1 gap-4 @[40rem]:grid-cols-2 @[64rem]:grid-cols-6 @[80rem]:grid-cols-10"
        >
          {LEAN_CANVAS_FIELDS.map((field) => {
            const { title, hint, icon, layout } = LEAN_CANVAS_BLOCKS[field];
            return (
              <div key={field} className={`min-w-0 rounded-2xl border border-lightgray bg-lightgray/30 p-4 ${layout}`}>
                <TextAreaField
                  id={fieldId(field)}
                  label={title}
                  icon={icon}
                  hint={hint}
                  tone="onTinted"
                  autoGrow
                  value={values[field]}
                  maxLength={CANVAS_BLOCK_MAX}
                  error={errors[field]}
                  onChange={(value) => onChange(field, value)}
                  onBlur={() => onBlur(field)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </PitchCard>
  );
}
