import { ChevronDown } from "lucide-react";
import { FIELD_BASE, fieldBorder } from "../pitch/styles";
import FormField from "./FormField";

interface ProfileSelectFieldProps {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  disabled?: boolean;
  options: string[];
  optionLabel?: (option: string) => string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}

export default function ProfileSelectField({
  id,
  label,
  required,
  hint,
  disabled,
  options,
  optionLabel,
  value,
  error,
  onChange,
  onBlur,
}: ProfileSelectFieldProps) {
  return (
    <FormField id={id} label={label} required={required} hint={hint} error={error}>
      {({ describedBy, invalid }) => (
        <div className="relative">
          <select
            id={id}
            value={value}
            required={required}
            disabled={disabled}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            onChange={(event) => onChange(event.target.value)}
            onBlur={onBlur}
            className={`${FIELD_BASE} ${fieldBorder(invalid)} min-h-[48px] appearance-none bg-lightgray pl-4 pr-10${
              disabled ? " cursor-not-allowed opacity-60" : ""
            }`}
          >
            <option value="" disabled>
              Selecione…
            </option>
            {options.map((option) => (
              <option key={option} value={option}>
                 {optionLabel ? optionLabel(option) : option}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-deepgreen/75"
            aria-hidden="true"
          />
        </div>
      )}
    </FormField>
  );
}
