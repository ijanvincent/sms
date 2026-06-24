import { cn } from "@/lib/utils";

const TONE_STYLES = {
  positive: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  info: "border-sky-500/30 bg-sky-500/10 text-sky-400",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  danger: "border-red-500/30 bg-red-500/10 text-red-400",
  neutral: "border-border bg-muted/40 text-muted-foreground",
} as const;

export type StateTone = keyof typeof TONE_STYLES;

export function StateBadge({
  tone,
  label,
  className,
}: {
  tone: StateTone;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        TONE_STYLES[tone],
        className
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
