import type { LucideIcon } from "lucide-react";
import { FIELD_BASE, fieldBorder } from "../pitch/styles";
import FormField from "./FormField";

interface ProfileTextFieldProps {
  id: string;
  label: string;
  icon?: LucideIcon;
  required?: boolean;
  hint?: string;
  placeholder?: string;
  autoComplete?: string;
  type?: "text" | "url";
  disabled?: boolean;
  maxLength: number;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}

// Single-line text field of the profile form (optional icon on the left)
export default function ProfileTextField({
  id,
  label,
  icon: Icon,
  required,
  hint,
  placeholder,
  autoComplete = "off",
  type = "text",
  disabled,
  maxLength,
  value,
  error,
  onChange,
  onBlur,
}: ProfileTextFieldProps) {
  return (
    <FormField id={id} label={label} required={required} hint={hint} error={error}>
      {({ describedBy, invalid }) => (
        <div className="relative">
          {Icon && (
            <Icon
              size={16}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-deepgreen/75"
              aria-hidden="true"
            />
          )}
          <input
            id={id}
            type={type}
            value={value}
            placeholder={placeholder}
            autoComplete={autoComplete}
            maxLength={maxLength}
            required={required}
            disabled={disabled}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            onChange={(event) => onChange(event.target.value)}
            onBlur={onBlur}
            className={`${FIELD_BASE} ${fieldBorder(invalid)} min-h-[48px] bg-lightgray pr-4 ${Icon ? "pl-11" : "pl-4"}${
              disabled ? " cursor-not-allowed opacity-60" : ""
             }`}
          />
        </div>
      )}
    </FormField>
  );
}
