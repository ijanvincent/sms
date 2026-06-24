import { MESSAGE_STATUS, type MessageStatus } from "./status";

export interface FailureResolution {
  // Where the message lands after a failed send attempt.
  status: MessageStatus;
  // true => return to the queue for another device to claim.
  requeue: boolean;
}

// Decides what happens to a message after a failed send, given the attempt
// count *after* this failure. Pure and DB-free so the give-up boundary is unit
// testable on its own.
export function resolveFailure(
  attemptsAfterFailure: number,
  maxAttempts: number,
): FailureResolution {
  const giveUp = attemptsAfterFailure >= maxAttempts;
  return giveUp
    ? { status: MESSAGE_STATUS.FAILED, requeue: false }
    : { status: MESSAGE_STATUS.PENDING, requeue: true };
}
