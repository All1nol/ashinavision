"use client";

import { type RefObject } from "react";

type ConvertButtonProps = {
  onClick: () => void;
  loading: boolean;
  disabled: boolean;
  buttonRef: RefObject<HTMLButtonElement | null>;
};

export const ConvertButton = ({
  onClick,
  loading,
  disabled,
  buttonRef,
}: ConvertButtonProps) => {
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={loading ? "Converting LaTeX, please wait" : "Convert LaTeX to accessible HTML"}
      className="inline-flex items-center gap-2 rounded-lg bg-foreground px-6 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading && (
        <span
          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"
          aria-hidden="true"
        />
      )}
      {loading ? "Converting\u2026" : "Convert"}
    </button>
  );
};
