import OpenAI from "openai";
import { z } from "zod";
import type { ConvertResponse, OutlineNode } from "./types";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompt";

const outlineNodeSchema: z.ZodType<OutlineNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    label: z.string(),
    range: z.object({
      start: z.number(),
      end: z.number(),
    }),
    children: z.array(outlineNodeSchema).optional(),
  })
);

const llmResponseSchema = z.object({
  html: z.string(),
  descriptions: z.object({
    concise: z.string(),
    detailed: z.string(),
  }),
  outline: z.array(outlineNodeSchema).default([]),
  warnings: z.array(z.string()).default([]),
});

const clampOutlineRanges = (
  nodes: OutlineNode[],
  maxLen: number
): OutlineNode[] => {
  return nodes.reduce<OutlineNode[]>((acc, node) => {
    const start = Math.max(0, Math.min(node.range.start, maxLen));
    const end = Math.max(start, Math.min(node.range.end, maxLen));

    if (start === end) return acc;

    acc.push({
      ...node,
      range: { start, end },
      children: node.children
        ? clampOutlineRanges(node.children, maxLen)
        : undefined,
    });
    return acc;
  }, []);
};

export const convertLatex = async (
  latex: string
): Promise<ConvertResponse> => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
  const client = new OpenAI({ apiKey });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const completion = await client.chat.completions.create(
      {
        model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(latex) },
        ],
        temperature: 0.2,
      },
      { signal: controller.signal }
    );

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      throw new Error("LLM returned an empty response");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("LLM response is not valid JSON");
    }

    const result = llmResponseSchema.safeParse(parsed);
    if (!result.success) {
      throw new Error(
        `LLM response does not match expected schema: ${result.error.message}`
      );
    }

    return {
      ...result.data,
      outline: clampOutlineRanges(result.data.outline, latex.length),
    };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("LLM request timed out after 30 seconds");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
};
