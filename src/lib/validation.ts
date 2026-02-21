import { z } from "zod";

const MAX_LATEX_LENGTH = 20_000;
const MAX_BATCH_SIZE = 50;

export const convertRequestSchema = z.object({
  latex: z
    .string()
    .min(1, "LaTeX content is required")
    .max(
      MAX_LATEX_LENGTH,
      `LaTeX content must be at most ${MAX_LATEX_LENGTH} characters`,
    ),
});

export type ValidatedConvertRequest = z.infer<typeof convertRequestSchema>;

export const parseConvertRequest = (body: unknown) => {
  return convertRequestSchema.safeParse(body);
};

export const batchConvertRequestSchema = z.object({
  blocks: z
    .array(
      z.object({
        id: z.string().min(1),
        latex: z.string().min(1).max(MAX_LATEX_LENGTH),
      }),
    )
    .min(1, "At least one block is required")
    .max(MAX_BATCH_SIZE, `Maximum ${MAX_BATCH_SIZE} blocks per batch`),
});

export type ValidatedBatchRequest = z.infer<typeof batchConvertRequestSchema>;

export const parseBatchConvertRequest = (body: unknown) => {
  return batchConvertRequestSchema.safeParse(body);
};
