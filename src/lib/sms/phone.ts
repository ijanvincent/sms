// Normalizes PH mobile numbers (09xx / +63 / 63 / bare 9xx) to E.164 (+639XXXXXXXXX).
// PH mobile subscriber numbers are always 10 digits starting with 9.
export function normalizePhMobile(input: string): string | null {
  if (typeof input !== "string") return null;

  const cleaned = input.trim().replace(/(?!^)\+/g, "");
  const hasPlus = cleaned.startsWith("+");
  const digits = cleaned.replace(/\D/g, "");

  let subscriber: string | null = null;
  if (hasPlus || digits.length >= 12) {
    if (digits.startsWith("63") && digits.length === 12) subscriber = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith("0")) {
    subscriber = digits.slice(1);
  } else if (digits.length === 10 && digits.startsWith("9")) {
    subscriber = digits;
  }

  if (!subscriber || subscriber.length !== 10 || !subscriber.startsWith("9")) {
    return null;
  }
  return `+63${subscriber}`;
}

export function isValidPhMobile(input: string): boolean {
  return normalizePhMobile(input) !== null;
}
