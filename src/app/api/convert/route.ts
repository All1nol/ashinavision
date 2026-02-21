import { NextRequest, NextResponse } from "next/server";
import { parseConvertRequest } from "@/lib/validation";
import { isAllowed } from "@/lib/rate-limiter";
import { convertLatex } from "@/lib/llm-service";
import { sanitizeHtml } from "@/lib/sanitize";
import type { ApiError } from "@/lib/types";

const errorResponse = (code: string, message: string, status: number) => {
  const body: ApiError = { error: { code, message } };
  return NextResponse.json(body, { status });
};

export const POST = async (request: NextRequest) => {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (!isAllowed(ip)) {
    return errorResponse(
      "RATE_LIMITED",
      "Too many requests. Please wait a moment and try again.",
      429
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("INVALID_JSON", "Request body must be valid JSON.", 400);
  }

  const validation = parseConvertRequest(body);
  if (!validation.success) {
    const message = validation.error.issues
      .map((i) => i.message)
      .join("; ");
    return errorResponse("VALIDATION_ERROR", message, 400);
  }

  try {
    const result = await convertLatex(validation.data.latex);

    return NextResponse.json({
      html: sanitizeHtml(result.html),
      descriptions: result.descriptions,
      outline: result.outline,
      warnings: result.warnings,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred";

    if (message.includes("OPENAI_API_KEY")) {
      console.error("LLM configuration error: API key not set");
      return errorResponse("CONFIG_ERROR", "Service is not properly configured.", 500);
    }

    if (message.includes("timed out")) {
      return errorResponse("TIMEOUT", "The conversion request timed out. Please try again.", 504);
    }

    console.error("Conversion error:", message);
    return errorResponse(
      "CONVERSION_ERROR",
      "Failed to convert LaTeX. Please try again.",
      500
    );
  }
};
