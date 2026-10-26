import { formatBrl, toCapitalDigits } from "../../utils/startupProfile";
import { FIELD_BASE, fieldBorder } from "../pitch/styles";
import FormField from "./FormField";

interface CurrencyFieldProps {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  // Whole reais as digits ("500000")
  value: string;
  error?: string;
  onChange: (digits: string) => void;
  onBlur: () => void;
}

// BRL input in whole reais: shows "R$ 500.000", keeps only the digits
export default function CurrencyField({ id, label, required, hint, value, error, onChange, onBlur }: CurrencyFieldProps) {
  return (
    <FormField id={id} label={label} required={required} hint={hint} error={error}>
      {({ describedBy, invalid }) => (
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={formatBrl(value)}
          placeholder="R$ 0"
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onChange={(event) => onChange(toCapitalDigits(event.target.value))}
          onBlur={onBlur}
          className={`${FIELD_BASE} ${fieldBorder(invalid)} min-h-[48px] bg-lightgray px-4 tabular-nums`}
        />
      )}
    </FormField>
  );
}
