// Message lifecycle: PENDING -> CLAIMED (device picked it up) -> SENT | FAILED.
// Stored as a string column; this is the single source of truth.
export const MESSAGE_STATUS = {
  PENDING: "PENDING",
  CLAIMED: "CLAIMED",
  SENT: "SENT",
  FAILED: "FAILED",
} as const;

export type MessageStatus = (typeof MESSAGE_STATUS)[keyof typeof MESSAGE_STATUS];

export const ALL_MESSAGE_STATUSES = Object.values(MESSAGE_STATUS) as MessageStatus[];

export function isMessageStatus(value: unknown): value is MessageStatus {
  return (
    typeof value === "string" &&
    ALL_MESSAGE_STATUSES.includes(value as MessageStatus)
  );
}
