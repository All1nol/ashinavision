"use client";

import { type RefObject, useMemo } from "react";
import katex from "katex";
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

  const renderedPresets = useMemo(
    () =>
      PRESETS.map((preset) => {
        let html = "";
        try {
          html = katex.renderToString(preset.latex, {
            throwOnError: false,
            displayMode: true,
            output: "html",
          });
        } catch {
          html = `<code>${preset.latex}</code>`;
        }
        return { ...preset, renderedHtml: html };
      }),
    []
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-foreground">
          Sample Presets
        </p>
        <p className="text-xs text-foreground/50">
          Formulas from{" "}
          <a
            href="https://www.researchgate.net/publication/371311655"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground/70 transition-colors"
            tabIndex={0}
          >
            Kortemeyer (2023)
          </a>
          {" "}&mdash; try converting these to see how AI describes them for blind readers.
        </p>
      </div>
      <div
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
        role="group"
        aria-label="Sample LaTeX presets from research paper"
      >
        {renderedPresets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => handlePresetClick(preset.latex)}
            aria-label={`Load ${preset.label} preset: ${preset.latex}`}
            className="group flex flex-col items-center gap-3 rounded-lg border border-foreground/15 bg-background p-4 text-left transition-all hover:border-foreground/30 hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50"
          >
            <span className="self-start text-sm font-semibold text-foreground">
              {preset.label}
            </span>
            <div
              className="flex w-full items-center justify-center overflow-x-auto py-1 text-foreground/70 [&_.katex]:text-[0.9rem]"
              aria-hidden="true"
              dangerouslySetInnerHTML={{ __html: preset.renderedHtml }}
            />
          </button>
        ))}
      </div>
    </div>
  );
};
