"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import katex from "katex";
import type { ConvertResponse, BatchResultItem } from "@/lib/types";
import type { MathBlock, DocumentSegment } from "@/lib/tex-parser";
import { OutputPanel } from "./output-panel";
import { StatusAnnouncer } from "./status-announcer";

type DocumentReaderProps = {
  segments: DocumentSegment[];
  mathBlocks: MathBlock[];
  fileName: string;
  onClear: () => void;
};

const getPreviewLatex = (block: MathBlock): string => {
  if (!block.environmentName) return block.latex;
  const escaped = block.environmentName.replace("*", "\\*");
  return block.latex
    .replace(new RegExp(`^\\\\begin\\{${escaped}\\}`), "")
    .replace(new RegExp(`\\\\end\\{${escaped}\\}$`), "")
    .trim();
};

export const DocumentReader = ({
  segments,
  mathBlocks,
  fileName,
  onClear,
}: DocumentReaderProps) => {
  const [results, setResults] = useState<Record<string, ConvertResponse>>({});
  const [conversionErrors, setConversionErrors] = useState<
    Record<string, string>
  >({});
  const [converting, setConverting] = useState(false);
  const [convertedCount, setConvertedCount] = useState(0);
  const [expandedBlock, setExpandedBlock] = useState<string | null>(null);
  const [focusedMathIndex, setFocusedMathIndex] = useState(-1);
  const [announcement, setAnnouncement] = useState("");

  const mathBlockRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const abortRef = useRef(false);
  const hasAutoFocused = useRef(false);

  const announce = useCallback((message: string) => {
    setAnnouncement("");
    requestAnimationFrame(() => setAnnouncement(message));
  }, []);

  const renderedPreviews = useMemo(
    () =>
      mathBlocks.map((block) => {
        try {
          return katex.renderToString(getPreviewLatex(block), {
            throwOnError: false,
            displayMode: block.type !== "inline",
            output: "html",
          });
        } catch {
          return `<code>${block.latex.substring(0, 120)}</code>`;
        }
      }),
    [mathBlocks],
  );

  const segmentMathIndices = useMemo(() => {
    let idx = 0;
    return segments.map((seg) => (seg.type === "math" ? idx++ : -1));
  }, [segments]);

  useEffect(() => {
    abortRef.current = false;
    hasAutoFocused.current = false;

    const abortController = new AbortController();

    const convertAllBatch = async () => {
      setConverting(true);
      setConvertedCount(0);
      announce(
        `Converting ${mathBlocks.length} expressions from ${fileName} in one batch, please wait…`,
      );

      try {
        const res = await fetch("/api/convert-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blocks: mathBlocks.map((b) => ({ id: b.id, latex: b.latex })),
          }),
          signal: abortController.signal,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          const message =
            errData?.error?.message ?? "Batch conversion failed.";
          mathBlocks.forEach((b) => {
            setConversionErrors((prev) => ({ ...prev, [b.id]: message }));
          });
          setConverting(false);
          announce(`Error: ${message}`);
          return;
        }

        if (!res.body) {
          throw new Error("No response body");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let sseBuffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          sseBuffer += decoder.decode(value, { stream: true });

          const events = sseBuffer.split("\n\n");
          sseBuffer = events.pop() ?? "";

          for (const event of events) {
            const dataLine = event
              .split("\n")
              .find((l) => l.startsWith("data: "));
            if (!dataLine) continue;

            const json = dataLine.substring(6);
            let parsed: { type: string; data?: BatchResultItem; message?: string };
            try {
              parsed = JSON.parse(json);
            } catch {
              continue;
            }

            if (parsed.type === "result" && parsed.data) {
              const item = parsed.data;
              setResults((prev) => ({
                ...prev,
                [item.id]: {
                  html: item.html,
                  descriptions: item.descriptions,
                  outline: item.outline,
                  warnings: item.warnings,
                } as ConvertResponse,
              }));
              setConvertedCount((prev) => prev + 1);
            } else if (parsed.type === "error") {
              mathBlocks.forEach((b) => {
                setConversionErrors((prev) => ({
                  ...prev,
                  [b.id]: parsed.message ?? "Conversion failed",
                }));
              });
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        mathBlocks.forEach((b) => {
          setConversionErrors((prev) => ({
            ...prev,
            [b.id]: "Network error. Please try again.",
          }));
        });
        announce("Error: Network error.");
      } finally {
        setConverting(false);
        if (!abortRef.current) {
          announce(
            "All expressions converted. Navigate to a math block and use arrow keys to move between expressions.",
          );
        }
      }
    };

    if (mathBlocks.length > 0) {
      convertAllBatch();
    }

    return () => {
      abortRef.current = true;
      abortController.abort();
    };
  }, [mathBlocks, fileName, announce]);

  useEffect(() => {
    if (
      !converting &&
      convertedCount === mathBlocks.length &&
      !hasAutoFocused.current &&
      mathBlocks.length > 0
    ) {
      hasAutoFocused.current = true;
      setFocusedMathIndex(0);
    }
  }, [converting, convertedCount, mathBlocks]);

  useEffect(() => {
    if (focusedMathIndex >= 0 && focusedMathIndex < mathBlocks.length) {
      const el = mathBlockRefs.current[focusedMathIndex];
      el?.focus();
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [focusedMathIndex, mathBlocks.length]);

  const handleToggleExpanded = useCallback(
    (mathIndex: number) => {
      const blockId = mathBlocks[mathIndex]?.id;
      if (!blockId) return;

      const willExpand = expandedBlock !== blockId;
      setExpandedBlock(willExpand ? blockId : null);
      announce(willExpand ? "Details expanded" : "Details collapsed");
    },
    [announce, expandedBlock, mathBlocks],
  );

  const handleMathBlockKeyDown = useCallback(
    (e: React.KeyboardEvent, mathIndex: number) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = Math.min(mathIndex + 1, mathBlocks.length - 1);
        if (next === mathIndex) return;
        setFocusedMathIndex(next);
        setExpandedBlock(null);
        const result = results[mathBlocks[next].id];
        announce(
          `Expression ${next + 1} of ${mathBlocks.length}. ${result?.descriptions.concise ?? "Converting…"}`,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = Math.max(mathIndex - 1, 0);
        if (prev === mathIndex) return;
        setFocusedMathIndex(prev);
        setExpandedBlock(null);
        const result = results[mathBlocks[prev].id];
        announce(
          `Expression ${prev + 1} of ${mathBlocks.length}. ${result?.descriptions.concise ?? "Converting…"}`,
        );
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleToggleExpanded(mathIndex);
      }
    },
    [mathBlocks, results, announce, handleToggleExpanded],
  );

  const progress =
    mathBlocks.length > 0 ? (convertedCount / mathBlocks.length) * 100 : 0;

  return (
    <div className="flex flex-col gap-4">
      <StatusAnnouncer message={announcement} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-foreground">{fileName}</p>
          <p className="text-xs text-foreground/50">
            {mathBlocks.length} math expression
            {mathBlocks.length !== 1 ? "s" : ""}
            {converting
              ? ` · Converting ${convertedCount}/${mathBlocks.length}…`
              : " · All converted"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          aria-label="Remove uploaded file and go back"
          className="rounded-lg border border-foreground/20 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50"
        >
          Clear
        </button>
      </div>

      {converting && (
        <div
          className="overflow-hidden rounded-full bg-foreground/10"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Conversion progress"
        >
          <div
            className="h-1.5 rounded-full bg-foreground/60 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <p className="text-xs text-foreground/40">
        Focus a math block, then use{" "}
        <kbd className="rounded border border-foreground/20 px-1.5 py-0.5 font-mono text-[0.65rem]">
          ↑
        </kbd>{" "}
        <kbd className="rounded border border-foreground/20 px-1.5 py-0.5 font-mono text-[0.65rem]">
          ↓
        </kbd>{" "}
        to navigate between expressions. Press{" "}
        <kbd className="rounded border border-foreground/20 px-1.5 py-0.5 font-mono text-[0.65rem]">
          Enter
        </kbd>{" "}
        to expand details.
      </p>

      <div
        className="flex flex-col gap-2"
        role="region"
        aria-label="Document content"
        aria-busy={converting ? true : undefined}
      >
        {segments.map((segment, segIdx) => {
          if (segment.type === "text") {
            return (
              <div key={`text-${segIdx}`} className="px-2 py-1">
                {segment.content.split("\n\n").map((paragraph, pIdx) => (
                  <p
                    key={pIdx}
                    className="mb-2 text-sm leading-relaxed text-foreground/70 last:mb-0"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            );
          }

          const mathIdx = segmentMathIndices[segIdx];
          const block = segment.block;
          const result = results[block.id];
          const error = conversionErrors[block.id];
          const isExpanded = expandedBlock === block.id;
          const isFocused = focusedMathIndex === mathIdx;
          const isTabbable =
            focusedMathIndex === -1 ? mathIdx === 0 : isFocused;
          const labelId = `math-${block.id}-label`;
          const descId = `math-${block.id}-desc`;
          const statusId = `math-${block.id}-status`;
          const detailsId = `math-details-${block.id}`;

          return (
            <div
              key={block.id}
              role="group"
              aria-labelledby={labelId}
              className={`rounded-lg border transition-all ${
                isFocused
                  ? "border-foreground/40 bg-foreground/[0.04] shadow-sm"
                  : "border-foreground/15 bg-background"
              }`}
            >
              <button
                ref={(el) => {
                  mathBlockRefs.current[mathIdx] = el;
                }}
                type="button"
                tabIndex={isTabbable ? 0 : -1}
                aria-labelledby={labelId}
                aria-describedby={
                  error
                    ? statusId
                    : result
                      ? descId
                      : converting
                        ? statusId
                        : undefined
                }
                aria-expanded={isExpanded}
                aria-controls={isExpanded && result ? detailsId : undefined}
                onClick={() => {
                  setFocusedMathIndex(mathIdx);
                  handleToggleExpanded(mathIdx);
                }}
                onKeyDown={(e) => handleMathBlockKeyDown(e, mathIdx)}
                onFocus={() => setFocusedMathIndex(mathIdx)}
                className="w-full rounded-lg p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50"
              >
                <div className="mb-2 flex items-center justify-between gap-4">
                  <span
                    id={labelId}
                    className="text-xs font-medium text-foreground/40"
                  >
                    #{mathIdx + 1} · Line {block.lineNumber} ·{" "}
                    {block.environmentName ??
                      (block.type === "display" ? "display" : "inline")}
                  </span>
                  {!result && !error && (
                    <span className="animate-pulse text-xs text-foreground/40">
                      Converting…
                    </span>
                  )}
                </div>

                <div
                  className="overflow-x-auto rounded-md bg-foreground/[0.03] px-3 py-2 [&_.katex]:text-[0.85rem]"
                  aria-hidden="true"
                  dangerouslySetInnerHTML={{
                    __html: renderedPreviews[mathIdx],
                  }}
                />

                {result && (
                  <p
                    id={descId}
                    className="mt-3 text-sm leading-relaxed text-foreground/80"
                  >
                    {result.descriptions.concise}
                  </p>
                )}

                {error && (
                  <p
                    id={statusId}
                    className="mt-2 text-xs text-red-600 dark:text-red-400"
                  >
                    {error}
                  </p>
                )}
                {!result && !error && converting && (
                  <span id={statusId} className="sr-only">
                    Converting expression {mathIdx + 1} of {mathBlocks.length}
                  </span>
                )}
              </button>

              {isExpanded && result && (
                <div
                  id={detailsId}
                  className="border-t border-foreground/10 p-4"
                >
                  <OutputPanel
                    response={result}
                    latex={block.latex}
                    idBase={`doc-${block.id}`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
