import { cn } from "@/lib/utils";
import { MESSAGE_STATUS, type MessageStatus } from "@/lib/sms/status";

const STATUS_STYLES: Record<MessageStatus, string> = {
  [MESSAGE_STATUS.PENDING]:
    "border-amber-500/30 bg-amber-500/10 text-amber-400",
  [MESSAGE_STATUS.CLAIMED]: "border-sky-500/30 bg-sky-500/10 text-sky-400",
  [MESSAGE_STATUS.SENT]:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  [MESSAGE_STATUS.FAILED]: "border-red-500/30 bg-red-500/10 text-red-400",
};

export function StatusBadge({
  status,
  className,
}: {
  status: MessageStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        STATUS_STYLES[status],
        className
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
