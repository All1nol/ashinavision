"use client";

import { useState, useRef, useCallback } from "react";
import type { ConvertResponse } from "@/lib/types";
import { LatexInput } from "./latex-input";
import { PresetButtons } from "./preset-buttons";
import { ConvertButton } from "./convert-button";
import { OutputPanel } from "./output-panel";
import { StatusAnnouncer } from "./status-announcer";

const MAX_LENGTH = 20_000;

export const ConverterClient = () => {
  const [latex, setLatex] = useState("");
  const [response, setResponse] = useState<ConvertResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const convertButtonRef = useRef<HTMLButtonElement>(null);

  const announce = useCallback((message: string) => {
    setAnnouncement("");
    requestAnimationFrame(() => setAnnouncement(message));
  }, []);

  const handlePresetSelect = useCallback(
    (presetLatex: string) => {
      setLatex(presetLatex);
      setResponse(null);
      setError(null);
      announce(`Preset loaded. Press Convert to continue.`);
    },
    [announce]
  );

  const handleConvert = useCallback(async () => {
    if (!latex.trim()) {
      setError("Please enter some LaTeX content.");
      announce("Error: Please enter some LaTeX content.");
      return;
    }

    if (latex.length > MAX_LENGTH) {
      setError(`LaTeX content exceeds the ${MAX_LENGTH.toLocaleString()} character limit.`);
      announce("Error: LaTeX content exceeds the character limit.");
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);
    announce("Converting LaTeX, please wait...");

    try {
      const res = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latex }),
      });

      const data = await res.json();

      if (!res.ok) {
        const message = data?.error?.message ?? "An unexpected error occurred.";
        setError(message);
        announce(`Error: ${message}`);
        return;
      }

      setResponse(data as ConvertResponse);
      announce("Conversion complete. Results are ready below.");
    } catch {
      setError("Network error. Please check your connection and try again.");
      announce("Error: Network error.");
    } finally {
      setLoading(false);
    }
  }, [latex, announce]);

  const isConvertDisabled = !latex.trim() || latex.length > MAX_LENGTH;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <StatusAnnouncer message={announcement} />

      <section aria-labelledby="input-heading">
        <h2
          id="input-heading"
          className="mb-4 text-lg font-semibold text-foreground"
        >
          Input
        </h2>

        <div className="flex flex-col gap-4">
          <PresetButtons
            onSelect={handlePresetSelect}
            convertButtonRef={convertButtonRef}
          />

          <LatexInput
            value={latex}
            onChange={(val) => {
              setLatex(val);
              if (error) setError(null);
            }}
            textareaRef={textareaRef}
            disabled={loading}
          />

          <div className="flex items-center gap-4">
            <ConvertButton
              onClick={handleConvert}
              loading={loading}
              disabled={isConvertDisabled}
              buttonRef={convertButtonRef}
            />
          </div>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-500/30 bg-red-500/10 p-4"
        >
          <p className="text-sm font-medium text-red-800 dark:text-red-200">
            {error}
          </p>
        </div>
      )}

      {response && (
        <section aria-labelledby="output-heading">
          <OutputPanel response={response} latex={latex} />
        </section>
      )}
    </div>
  );
};
