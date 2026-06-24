import { Signal } from "lucide-react";

export function Brand() {
  return (
    <div className="flex items-center gap-2">
      <Signal className="size-5 text-emerald-400" />
      <span className="font-heading text-sm font-semibold tracking-tight">
        SMS Gateway
      </span>
    </div>
  );
}
