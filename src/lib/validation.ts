import { z } from "zod";

const MAX_LATEX_LENGTH = 20_000;

export const convertRequestSchema = z.object({
  latex: z
    .string()
    .min(1, "LaTeX content is required")
    .max(MAX_LATEX_LENGTH, `LaTeX content must be at most ${MAX_LATEX_LENGTH} characters`),
});

export type ValidatedConvertRequest = z.infer<typeof convertRequestSchema>;

export const parseConvertRequest = (body: unknown) => {
  return convertRequestSchema.safeParse(body);
};
