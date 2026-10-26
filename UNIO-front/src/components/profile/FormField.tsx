import type { ReactNode } from "react";

export interface FieldA11y {
  describedBy: string | undefined;
  invalid: boolean;
}

interface FormFieldProps {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  // Renders the control with the ids it has to reference
  children: (a11y: FieldA11y) => ReactNode;
}

// Label + hint + error around one control, linked through aria-describedby
export default function FormField({ id, label, required = false, hint, error, children }: FormFieldProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div>
      <label htmlFor={id} className="block font-medium text-deepgreen">
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      {hint && (
        <p id={hintId} className="mt-0.5 text-xs text-deepgreen/75">
          {hint}
        </p>
      )}
      <div className="mt-2">{children({ describedBy, invalid: Boolean(error) })}</div>
      {error && (
        <p id={errorId} className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
