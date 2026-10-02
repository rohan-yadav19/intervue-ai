import { fieldControlClassName } from "@/components/ui/fieldStyles";

type SelectOption = {
  value: string;
  label: string;
};

type SelectFieldProps = Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  "className"
> & {
  label: string;
  error?: string;
  options: readonly SelectOption[];
  placeholder?: string;
};

export function SelectField({
  label,
  error,
  id,
  options,
  placeholder = "Select an option",
  ...props
}: SelectFieldProps) {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <label htmlFor={fieldId} className="block text-sm">
      <span className="font-medium">{label}</span>
      <select
        id={fieldId}
        className={fieldControlClassName(Boolean(error))}
        aria-invalid={Boolean(error)}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </label>
  );
}
