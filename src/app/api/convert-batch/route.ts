import { NextRequest } from "next/server";
import { parseBatchConvertRequest } from "@/lib/validation";
import { isAllowed } from "@/lib/rate-limiter";
import { convertLatexBatchStreaming } from "@/lib/llm-service";

const encoder = new TextEncoder();

const sseEvent = (data: unknown): Uint8Array =>
  encoder.encode(`data: ${JSON.stringify(data)}\n\n`);

export const POST = async (request: NextRequest) => {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (!isAllowed(ip)) {
    return new Response(
      JSON.stringify({
        error: {
          code: "RATE_LIMITED",
          message: "Too many requests. Please wait a moment and try again.",
        },
      }),
      { status: 429, headers: { "Content-Type": "application/json" } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({
        error: {
          code: "INVALID_JSON",
          message: "Request body must be valid JSON.",
        },
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const validation = parseBatchConvertRequest(body);
  if (!validation.success) {
    const message = validation.error.issues.map((i) => i.message).join("; ");
    return new Response(
      JSON.stringify({ error: { code: "VALIDATION_ERROR", message } }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const { blocks } = validation.data;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        await convertLatexBatchStreaming(blocks, (result) => {
          controller.enqueue(sseEvent({ type: "result", data: result }));
        });

        controller.enqueue(sseEvent({ type: "done" }));
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "An unexpected error occurred";

        if (message.includes("OPENAI_API_KEY")) {
          console.error("LLM configuration error: API key not set");
          controller.enqueue(
            sseEvent({
              type: "error",
              message: "Service is not properly configured.",
            }),
          );
        } else {
          console.error("Batch conversion error:", message);
          controller.enqueue(
            sseEvent({
              type: "error",
              message: "Batch conversion failed. Please try again.",
            }),
          );
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
};
