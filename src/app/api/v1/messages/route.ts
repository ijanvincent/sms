import { json, jsonError } from "@/lib/http";
import { authenticateRequest } from "@/server/auth/require-api-key";
import { sendMessageSchema } from "@/server/validation/message";
import {
  InvalidRecipientError,
  enqueueMessage,
} from "@/server/services/message-service";

export async function POST(request: Request) {
  const apiKey = await authenticateRequest(request);
  if (!apiKey) {
    return jsonError(401, "unauthorized", "Missing or invalid API key");
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError(400, "invalid_json", "Request body must be valid JSON");
  }

  const parsed = sendMessageSchema.safeParse(payload);
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
    const message = await enqueueMessage(parsed.data, apiKey.id);
    return json(
      {
        id: message.id,
        status: message.status,
        recipient: message.recipient,
        createdAt: message.createdAt,
      },
      202,
    );
  } catch (error) {
    if (error instanceof InvalidRecipientError) {
      return jsonError(422, "invalid_recipient", error.message);
    }
    console.error("Failed to enqueue message", error);
    return jsonError(500, "internal_error", "Failed to enqueue message");
  }
}
