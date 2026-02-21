import OpenAI from "openai";
import { z } from "zod";
import type { ConvertResponse, OutlineNode, BatchResultItem } from "./types";
import {
  SYSTEM_PROMPT,
  buildUserPrompt,
  BATCH_SYSTEM_PROMPT,
  buildBatchUserPrompt,
} from "./prompt";

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

const batchResultSchema = z.object({
  id: z.string(),
  html: z.string(),
  descriptions: z.object({
    concise: z.string(),
    detailed: z.string(),
  }),
  outline: z.array(outlineNodeSchema).default([]),
  warnings: z.array(z.string()).default([]),
});

/**
 * Finds the end index of a top-level JSON object starting at `start`.
 * Correctly handles nested braces and string escaping.
 * Returns -1 if the object is incomplete.
 */
const findObjectEnd = (str: string, start: number): number => {
  if (str[start] !== "{") return -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < str.length; i++) {
    const ch = str[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
};

/**
 * Extracts completed result objects from the streaming JSON buffer.
 * Looks for top-level objects inside the `"results": [...]` array.
 */
const extractCompletedResults = (
  buffer: string,
  alreadyExtracted: number,
  blockLatexMap: Map<string, string>,
): BatchResultItem[] => {
  const resultsKeyIdx = buffer.indexOf('"results"');
  if (resultsKeyIdx === -1) return [];

  const arrayStart = buffer.indexOf("[", resultsKeyIdx);
  if (arrayStart === -1) return [];

  const items: BatchResultItem[] = [];
  let i = arrayStart + 1;
  let found = 0;

  while (i < buffer.length) {
    while (
      i < buffer.length &&
      (buffer[i] === " " ||
        buffer[i] === "\n" ||
        buffer[i] === "\r" ||
        buffer[i] === "\t" ||
        buffer[i] === ",")
    ) {
      i++;
    }

    if (i >= buffer.length || buffer[i] === "]") break;
    if (buffer[i] !== "{") break;

    const objEnd = findObjectEnd(buffer, i);
    if (objEnd === -1) break;

    found++;
    if (found > alreadyExtracted) {
      try {
        const parsed = batchResultSchema.parse(
          JSON.parse(buffer.substring(i, objEnd + 1)),
        );
        const latexLen = blockLatexMap.get(parsed.id)?.length ?? 0;
        items.push({
          ...parsed,
          outline: clampOutlineRanges(parsed.outline, latexLen),
        });
      } catch {
        // skip malformed result
      }
    }

    i = objEnd + 1;
  }

  return items;
};

export type BatchStreamCallback = (item: BatchResultItem) => void;

export const convertLatexBatchStreaming = async (
  blocks: { id: string; latex: string }[],
  onResult: BatchStreamCallback,
): Promise<void> => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
  const client = new OpenAI({ apiKey });

  const blockLatexMap = new Map(blocks.map((b) => [b.id, b.latex]));

  const stream = await client.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: BATCH_SYSTEM_PROMPT },
      { role: "user", content: buildBatchUserPrompt(blocks) },
    ],
    temperature: 0.2,
    stream: true,
  });

  let fullBuffer = "";
  let extractedCount = 0;

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content ?? "";
    if (!content) continue;
    fullBuffer += content;

    const newResults = extractCompletedResults(
      fullBuffer,
      extractedCount,
      blockLatexMap,
    );

    for (const result of newResults) {
      onResult(result);
      extractedCount++;
    }
  }

  // Final extraction for any trailing results
  const remaining = extractCompletedResults(
    fullBuffer,
    extractedCount,
    blockLatexMap,
  );
  for (const result of remaining) {
    onResult(result);
  }
};
