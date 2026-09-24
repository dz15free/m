import { cn } from "@/lib/utils/cn";

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-card bg-surface p-5 shadow-card", className)}
      {...props}
    />
  );
}
