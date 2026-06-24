import { MESSAGE_STATUS, type MessageStatus } from "@/lib/sms/status";
import { StateBadge, type StateTone } from "./state-badge";

const STATUS_TONES: Record<MessageStatus, StateTone> = {
  [MESSAGE_STATUS.PENDING]: "warning",
  [MESSAGE_STATUS.CLAIMED]: "info",
  [MESSAGE_STATUS.SENT]: "positive",
  [MESSAGE_STATUS.FAILED]: "danger",
};

export function StatusBadge({
  status,
  className,
}: {
  status: MessageStatus;
  className?: string;
}) {
  return (
    <StateBadge tone={STATUS_TONES[status]} label={status} className={className} />
  );
}
