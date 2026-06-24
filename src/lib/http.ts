import { NextResponse } from "next/server";

export function json<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(
  status: number,
  code: string,
  message: string,
  details?: unknown,
) {
  const error = details === undefined ? { code, message } : { code, message, details };
  return NextResponse.json({ error }, { status });
}
