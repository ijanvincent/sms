import { cn } from "@/lib/utils";

// A circular ring loader: a faint track with a bright accent arc that sweeps
// around. Built from a conic gradient masked to a thin ring, so it stays crisp
// at any size and carries the brand accent rather than a generic icon spinner.
function Spinner({ className }: { className?: string }) {
  return (
    <span
      data-slot="spinner"
      role="status"
      aria-label="Loading"
      className={cn("spinner-ring size-4 shrink-0", className)}
    />
  );
}

export { Spinner };
