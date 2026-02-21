"use client";

import { type RefObject } from "react";
import { PRESETS } from "@/lib/presets";

type PresetButtonsProps = {
  onSelect: (latex: string) => void;
  convertButtonRef: RefObject<HTMLButtonElement | null>;
};

export const PresetButtons = ({
  onSelect,
  convertButtonRef,
}: PresetButtonsProps) => {
  const handlePresetClick = (latex: string) => {
    onSelect(latex);
    requestAnimationFrame(() => {
      convertButtonRef.current?.focus();
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold text-foreground">Sample Presets</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Sample LaTeX presets">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => handlePresetClick(preset.latex)}
            aria-label={`Load ${preset.label} preset`}
            className="rounded-md border border-foreground/20 bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50"
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
};
