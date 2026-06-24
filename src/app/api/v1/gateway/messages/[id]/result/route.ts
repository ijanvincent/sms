import { json, jsonError } from "@/lib/http";
import { authenticateRequest } from "@/server/auth/require-api-key";
import { resultSchema } from "@/server/validation/gateway";
import {
  DeviceMismatchError,
  MessageNotClaimedError,
  MessageNotFoundError,
  reportResult,
} from "@/server/services/gateway-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const apiKey = await authenticateRequest(request);
  if (!apiKey) {
    return jsonError(401, "unauthorized", "Missing or invalid API key");
  }

  const { id } = await params;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError(400, "invalid_json", "Request body must be valid JSON");
  }

  const parsed = resultSchema.safeParse(payload);
  if (!parsed.success) {
    return jsonError(
      422,
      "validation_error",
      "Invalid request body",
      parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    );
  }

  try {
    const message = await reportResult(
      id,
      parsed.data.deviceId,
      parsed.data.status,
      parsed.data.error,
    );
    return json({ id: message.id, status: message.status, attempts: message.attempts });
  } catch (error) {
    if (error instanceof MessageNotFoundError) {
      return jsonError(404, "message_not_found", error.message);
    }
    if (error instanceof MessageNotClaimedError) {
      return jsonError(409, "message_not_claimed", error.message);
    }
    if (error instanceof DeviceMismatchError) {
      return jsonError(403, "device_mismatch", error.message);
    }
    console.error("Failed to report result", error);
    return jsonError(500, "internal_error", "Failed to report result");
  }
}
