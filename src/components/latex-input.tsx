"use client";

import { type ChangeEvent, type RefObject } from "react";

const MAX_LENGTH = 20_000;

type LatexInputProps = {
  value: string;
  onChange: (value: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  disabled?: boolean;
};

export const LatexInput = ({
  value,
  onChange,
  textareaRef,
  disabled = false,
}: LatexInputProps) => {
  const charCount = value.length;
  const isOverLimit = charCount > MAX_LENGTH;

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor="latex-input"
        className="text-sm font-semibold text-foreground"
      >
        LaTeX Input
      </label>
      <textarea
        ref={textareaRef}
        id="latex-input"
        name="latex"
        rows={8}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        placeholder="Paste your LaTeX content here, e.g. e^{i\pi} + 1 = 0"
        aria-describedby="latex-char-count"
        className="w-full resize-y rounded-lg border border-foreground/20 bg-background px-4 py-3 font-mono text-sm text-foreground placeholder:text-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 disabled:cursor-not-allowed disabled:opacity-50"
      />
      <p
        id="latex-char-count"
        className={`text-xs ${isOverLimit ? "text-red-600 font-semibold" : "text-foreground/50"}`}
      >
        {charCount.toLocaleString()} / {MAX_LENGTH.toLocaleString()} characters
      </p>
    </div>
  );
};
