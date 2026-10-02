import { fieldControlClassName } from "@/components/ui/fieldStyles";

type TextFieldProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "className"
> & {
  label: string;
  error?: string;
};

export function TextField({ label, error, id, ...props }: TextFieldProps) {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <label htmlFor={fieldId} className="block text-sm">
      <span className="font-medium">{label}</span>
      <input
        id={fieldId}
        className={fieldControlClassName(Boolean(error))}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </label>
  );
}
