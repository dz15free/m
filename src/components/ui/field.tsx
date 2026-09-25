import { useId } from "react";
import { cn } from "@/lib/utils/cn";

const control =
  "block min-h-12 w-full rounded-xl border border-line bg-surface px-4 text-ink outline-none transition-colors " +
  "placeholder:text-muted/70 focus:border-brand-600 focus:ring-3 focus:ring-brand-100 " +
  "aria-invalid:border-red-600 aria-invalid:focus:ring-red-100";

type Common = { label: string; hint?: string; error?: string | null; className?: string };

function Frame({
  id,
  label,
  hint,
  error,
  className,
  children,
}: Common & { id: string; children: React.ReactNode }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-msg`} className="text-xs font-medium text-red-700">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-msg`} className="text-xs text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

export function Field({ label, hint, error, className, ...props }: Common & Omit<React.ComponentProps<"input">, "className">) {
  const id = useId();
  return (
    <Frame id={id} label={label} hint={hint} error={error} className={className}>
      <input
        id={id}
        aria-describedby={hint || error ? `${id}-msg` : undefined}
        aria-invalid={error ? true : undefined}
        className={control}
        {...props}
      />
    </Frame>
  );
}

/** قائمة أصلية (native select): أفضل تجربة على الهاتف وبلا مكتبة. */
export function SelectField({
  label,
  hint,
  error,
  className,
  children,
  ...props
}: Common & Omit<React.ComponentProps<"select">, "className">) {
  const id = useId();
  return (
    <Frame id={id} label={label} hint={hint} error={error} className={className}>
      <select
        id={id}
        aria-describedby={hint || error ? `${id}-msg` : undefined}
        aria-invalid={error ? true : undefined}
        className={cn(control, "appearance-none bg-[length:1.25rem] bg-no-repeat pe-10", "select-chevron")}
        {...props}
      >
        {children}
      </select>
    </Frame>
  );
}
