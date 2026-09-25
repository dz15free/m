import { useId } from "react";
import { cn } from "@/lib/utils/cn";

type FieldProps = React.ComponentProps<"input"> & { label: string; hint?: string };

export function Field({ label, hint, className, ...props }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        aria-describedby={hintId}
        className="block min-h-12 w-full rounded-xl border border-line bg-surface px-4 text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-brand-600 focus:ring-3 focus:ring-brand-100"
        {...props}
      />
      {hint && (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
