import { useLayoutEffect, useRef } from "react";
import type { LucideIcon } from "lucide-react";
import { FIELD_BASE, fieldBorder } from "./styles";

interface TextAreaFieldProps {
  id: string;
  label: string;
  icon?: LucideIcon;
  hint?: string;
  required?: boolean;
  value: string;
  maxLength: number;
  error?: string;
  rows?: number;
  placeholder?: string;
  // Background of the textarea (lightgray on white cards, white on tinted tiles)
  tone?: "default" | "onTinted";
  // Grows with the text (Lean Canvas blocks) instead of scrolling inside a
  // fixed number of rows
  autoGrow?: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
}

// Share of the limit from which the counter is highlighted
const NEAR_LIMIT = 0.9;

// Chrome, Edge and Safari grow the textarea with CSS (field-sizing: content);
// on the others (Firefox) the height is measured by script
const SUPPORTS_FIELD_SIZING = typeof CSS !== "undefined" && CSS.supports("field-sizing", "content");

const AUTO_GROW_CLASS = "min-h-[7rem] md:min-h-[9rem] [field-sizing:content]";

// Fallback of autoGrow: measures the text with the natural height (outside
// the flex stretch) and only sets a min-height when the text needs more room
// than the CSS minimum
function growToContent(textarea: HTMLTextAreaElement) {
  textarea.style.minHeight = "";
  textarea.style.flex = "none";
  const box = textarea.offsetHeight;
  const needed = textarea.scrollHeight + (textarea.offsetHeight - textarea.clientHeight);
  textarea.style.flex = "";
  textarea.style.minHeight = needed > box ? `${needed}px` : "";
}

// Textarea with label, hint, character counter and an error linked through
// aria-describedby. The limit is soft (no native maxLength), so the counter
// can show when the text goes over it.
export default function TextAreaField({
  id,
  label,
  icon: Icon,
  hint,
  required = false,
  value,
  maxLength,
  error,
  rows = 4,
  placeholder,
  tone = "default",
  autoGrow = false,
  onChange,
  onBlur,
}: TextAreaFieldProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    if (autoGrow && !SUPPORTS_FIELD_SIZING && textareaRef.current) growToContent(textareaRef.current);
  }, [autoGrow, value]);

  const hintId = `${id}-hint`;
  const counterId = `${id}-counter`;
  const errorId = `${id}-error`;
  const length = value.length;
  const overLimit = length > maxLength;
  const nearLimit = !overLimit && length >= maxLength * NEAR_LIMIT;
  const counterColor = overLimit
    ? "font-semibold text-red-600"
    : nearLimit
      ? "font-semibold text-deepgreen"
      : "text-deepgreen/75";

  const describedBy = [hint ? hintId : null, counterId, error ? errorId : null].filter(Boolean).join(" ");

  return (
    <div className="flex h-full flex-col">
      <label htmlFor={id} className={`flex items-center gap-2 text-deepgreen ${Icon ? "font-bold" : "font-medium"}`}>
        {Icon && <Icon size={16} className="shrink-0" aria-hidden="true" />}
        {label}
        {required && <span aria-hidden="true">*</span>}
      </label>
      {hint && (
        <p id={hintId} className="mt-0.5 text-xs text-deepgreen/75">
          {hint}
        </p>
      )}
      <textarea
        ref={textareaRef}
        id={id}
        rows={rows}
        value={value}
        placeholder={placeholder}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        className={`${FIELD_BASE} ${fieldBorder(Boolean(error))} ${
          tone === "onTinted" ? "bg-white" : "bg-lightgray"
        } mt-2 min-w-[min(200px,100%)] flex-1 resize-y px-4 py-3 leading-relaxed ${
          autoGrow ? AUTO_GROW_CLASS : "min-h-[96px]"
        }`}
      />
      <div className="mt-1 flex items-start justify-between gap-3">
        {error ? (
          <p id={errorId} className="text-sm text-red-600">
            {error}
          </p>
        ) : (
          <span />
        )}
        <p id={counterId} className={`shrink-0 text-xs tabular-nums ${counterColor}`}>
          <span aria-hidden="true">
            {length}/{maxLength}
          </span>
          <span className="sr-only">
            {length} de {maxLength} caracteres
          </span>
        </p>
      </div>
    </div>
  );
}
