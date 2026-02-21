"use client";

import { useState, useRef, useCallback } from "react";
import type { ConvertResponse } from "@/lib/types";
import type { MathBlock, DocumentSegment } from "@/lib/tex-parser";
import { extractDocumentSegments } from "@/lib/tex-parser";
import { LatexInput } from "./latex-input";
import { PresetButtons } from "./preset-buttons";
import { ConvertButton } from "./convert-button";
import { OutputPanel } from "./output-panel";
import { StatusAnnouncer } from "./status-announcer";
import { FileUpload } from "./file-upload";
import { DocumentReader } from "./document-reader";

const MAX_LENGTH = 20_000;

type InputMode = "paste" | "upload";

export const ConverterClient = () => {
  const [inputMode, setInputMode] = useState<InputMode>("paste");

  const [latex, setLatex] = useState("");
  const [response, setResponse] = useState<ConvertResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const [uploadedSegments, setUploadedSegments] = useState<DocumentSegment[]>(
    [],
  );
  const [uploadedBlocks, setUploadedBlocks] = useState<MathBlock[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [uploadEmpty, setUploadEmpty] = useState(false);

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
      announce("Preset loaded. Press Convert to continue.");
    },
    [announce],
  );

  const handleConvert = useCallback(async () => {
    if (!latex.trim()) {
      setError("Please enter some LaTeX content.");
      announce("Error: Please enter some LaTeX content.");
      return;
    }

    if (latex.length > MAX_LENGTH) {
      setError(
        `LaTeX content exceeds the ${MAX_LENGTH.toLocaleString()} character limit.`,
      );
      announce("Error: LaTeX content exceeds the character limit.");
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);
    announce("Converting LaTeX, please wait…");

    try {
      const res = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latex }),
      });

      const data = await res.json();

      if (!res.ok) {
        const message =
          data?.error?.message ?? "An unexpected error occurred.";
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

  const handleFileLoaded = useCallback(
    (content: string, fileName: string) => {
      const { segments, mathBlocks } = extractDocumentSegments(content);
      setUploadedSegments(segments);
      setUploadedBlocks(mathBlocks);
      setUploadedFileName(fileName);
      setUploadEmpty(mathBlocks.length === 0);

      if (mathBlocks.length === 0) {
        announce(
          `File ${fileName} loaded, but no math expressions were found.`,
        );
      } else {
        announce(
          `File ${fileName} loaded. Found ${mathBlocks.length} math expression${mathBlocks.length !== 1 ? "s" : ""}. Converting automatically…`,
        );
      }
    },
    [announce],
  );

  const handleClearUpload = useCallback(() => {
    setUploadedSegments([]);
    setUploadedBlocks([]);
    setUploadedFileName("");
    setUploadEmpty(false);
    announce("File cleared.");
  }, [announce]);

  const handleModeChange = useCallback(
    (mode: InputMode) => {
      setInputMode(mode);
      announce(
        `Switched to ${mode === "paste" ? "paste LaTeX" : "upload file"} mode.`,
      );
    },
    [announce],
  );

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

        <div
          role="tablist"
          aria-label="Input method"
          className="mb-4 flex gap-1 rounded-lg border border-foreground/10 bg-foreground/[0.02] p-1 max-w-xs"
        >
          <button
            type="button"
            role="tab"
            id="tab-paste"
            aria-selected={inputMode === "paste"}
            aria-controls="panel-paste"
            tabIndex={inputMode === "paste" ? 0 : -1}
            onClick={() => handleModeChange("paste")}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") {
                e.preventDefault();
                handleModeChange("upload");
                document.getElementById("tab-upload")?.focus();
              }
            }}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 ${
              inputMode === "paste"
                ? "bg-background text-foreground shadow-sm"
                : "text-foreground/60 hover:text-foreground"
            }`}
          >
            Paste LaTeX
          </button>
          <button
            type="button"
            role="tab"
            id="tab-upload"
            aria-selected={inputMode === "upload"}
            aria-controls="panel-upload"
            tabIndex={inputMode === "upload" ? 0 : -1}
            onClick={() => handleModeChange("upload")}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") {
                e.preventDefault();
                handleModeChange("paste");
                document.getElementById("tab-paste")?.focus();
              }
            }}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 ${
              inputMode === "upload"
                ? "bg-background text-foreground shadow-sm"
                : "text-foreground/60 hover:text-foreground"
            }`}
          >
            Upload .tex File
          </button>
        </div>

        {inputMode === "paste" && (
          <div
            id="panel-paste"
            role="tabpanel"
            aria-labelledby="tab-paste"
            className="flex flex-col gap-4"
          >
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
        )}

        {inputMode === "upload" && (
          <div
            id="panel-upload"
            role="tabpanel"
            aria-labelledby="tab-upload"
            className="flex flex-col gap-4"
          >
            {uploadedBlocks.length === 0 && !uploadEmpty ? (
              <FileUpload onFileLoaded={handleFileLoaded} />
            ) : uploadEmpty ? (
              <div className="flex flex-col items-center gap-4 rounded-lg border border-foreground/15 p-8">
                <p className="text-sm text-foreground/60">
                  No math expressions found in{" "}
                  <span className="font-semibold text-foreground">
                    {uploadedFileName}
                  </span>
                  . The parser looks for{" "}
                  <code className="rounded bg-foreground/10 px-1 py-0.5 font-mono text-xs">
                    $...$
                  </code>
                  ,{" "}
                  <code className="rounded bg-foreground/10 px-1 py-0.5 font-mono text-xs">
                    $$...$$
                  </code>
                  ,{" "}
                  <code className="rounded bg-foreground/10 px-1 py-0.5 font-mono text-xs">
                    \[...\]
                  </code>
                  , and named math environments like{" "}
                  <code className="rounded bg-foreground/10 px-1 py-0.5 font-mono text-xs">
                    equation
                  </code>
                  ,{" "}
                  <code className="rounded bg-foreground/10 px-1 py-0.5 font-mono text-xs">
                    align
                  </code>
                  , etc.
                </p>
                <button
                  type="button"
                  onClick={handleClearUpload}
                  className="rounded-lg border border-foreground/20 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50"
                >
                  Try Another File
                </button>
              </div>
            ) : (
              <DocumentReader
                segments={uploadedSegments}
                mathBlocks={uploadedBlocks}
                fileName={uploadedFileName}
                onClear={handleClearUpload}
              />
            )}
          </div>
        )}
      </section>

      {inputMode === "paste" && error && (
        <div
          role="alert"
          className="rounded-lg border border-red-500/30 bg-red-500/10 p-4"
        >
          <p className="text-sm font-medium text-red-800 dark:text-red-200">
            {error}
          </p>
        </div>
      )}

      {inputMode === "paste" && response && (
        <section aria-labelledby="output-heading">
          <OutputPanel response={response} latex={latex} idBase="single-output" />
        </section>
      )}
    </div>
  );
};
