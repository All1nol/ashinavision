"use client";

import { useState, useCallback, useMemo } from "react";
import katex from "katex";
import type { ConvertResponse } from "@/lib/types";
import type { MathBlock } from "@/lib/tex-parser";
import { OutputPanel } from "./output-panel";
import { StatusAnnouncer } from "./status-announcer";

type BlockResult = {
  response: ConvertResponse | null;
  loading: boolean;
  error: string | null;
};

type TexMathBlocksProps = {
  blocks: MathBlock[];
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

const typeLabel = (block: MathBlock): string => {
  if (block.environmentName) return block.environmentName;
  return block.type === "display" ? "display math" : "inline math";
};

export const TexMathBlocks = ({
  blocks,
  fileName,
  onClear,
}: TexMathBlocksProps) => {
  const [results, setResults] = useState<Record<string, BlockResult>>({});
  const [expandedBlock, setExpandedBlock] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [convertingAll, setConvertingAll] = useState(false);

  const announce = useCallback((message: string) => {
    setAnnouncement("");
    requestAnimationFrame(() => setAnnouncement(message));
  }, []);

  const renderedBlocks = useMemo(
    () =>
      blocks.map((block) => {
        let html = "";
        try {
          html = katex.renderToString(getPreviewLatex(block), {
            throwOnError: false,
            displayMode: block.type !== "inline",
            output: "html",
          });
        } catch {
          html = `<code>${block.latex.substring(0, 120)}</code>`;
        }
        return { ...block, renderedHtml: html };
      }),
    [blocks],
  );

  const handleConvertBlock = useCallback(
    async (block: MathBlock) => {
      setResults((prev) => ({
        ...prev,
        [block.id]: { response: null, loading: true, error: null },
      }));
      setExpandedBlock(block.id);
      announce(
        `Converting expression from line ${block.lineNumber}, please wait…`,
      );

      try {
        const res = await fetch("/api/convert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ latex: block.latex }),
        });

        const data = await res.json();

        if (!res.ok) {
          const message =
            data?.error?.message ?? "An unexpected error occurred.";
          setResults((prev) => ({
            ...prev,
            [block.id]: { response: null, loading: false, error: message },
          }));
          announce(
            `Error converting expression from line ${block.lineNumber}: ${message}`,
          );
          return;
        }

        setResults((prev) => ({
          ...prev,
          [block.id]: {
            response: data as ConvertResponse,
            loading: false,
            error: null,
          },
        }));
        announce(
          `Conversion complete for expression from line ${block.lineNumber}.`,
        );
      } catch {
        setResults((prev) => ({
          ...prev,
          [block.id]: {
            response: null,
            loading: false,
            error: "Network error. Please try again.",
          },
        }));
        announce("Error: Network error.");
      }
    },
    [announce],
  );

  const handleConvertAll = useCallback(async () => {
    setConvertingAll(true);
    announce(
      `Converting all ${blocks.length} expressions, please wait…`,
    );

    for (const block of blocks) {
      if (results[block.id]?.response) continue;
      await handleConvertBlock(block);
    }

    setConvertingAll(false);
    setExpandedBlock(null);
    announce("All expressions have been converted.");
  }, [blocks, results, handleConvertBlock, announce]);

  const convertedCount = Object.values(results).filter(
    (r) => r.response,
  ).length;

  return (
    <div className="flex flex-col gap-4">
      <StatusAnnouncer message={announcement} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-foreground">{fileName}</p>
          <p className="text-xs text-foreground/50">
            {blocks.length} math expression
            {blocks.length !== 1 ? "s" : ""} found
            {convertedCount > 0 && ` · ${convertedCount} converted`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleConvertAll}
            disabled={convertingAll || convertedCount === blocks.length}
            aria-label={`Convert all ${blocks.length} math expressions`}
            className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {convertingAll
              ? `Converting (${convertedCount}/${blocks.length})…`
              : convertedCount === blocks.length
                ? "All Converted"
                : "Convert All"}
          </button>
          <button
            type="button"
            onClick={onClear}
            aria-label="Remove uploaded file and go back"
            className="rounded-lg border border-foreground/20 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50"
          >
            Clear
          </button>
        </div>
      </div>

      <ul
        className="flex flex-col gap-3"
        aria-label="Extracted math expressions"
      >
        {renderedBlocks.map((block) => {
          const result = results[block.id];
          const isExpanded = expandedBlock === block.id;

          return (
            <li
              key={block.id}
              className="rounded-lg border border-foreground/15 bg-background"
            >
              <div className="flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-foreground/50">
                      Line {block.lineNumber} · {typeLabel(block)}
                    </span>
                    {block.contextBefore && (
                      <span className="text-xs text-foreground/40 italic">
                        …{block.contextBefore}
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {result?.response && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedBlock(isExpanded ? null : block.id)
                        }
                        aria-expanded={isExpanded}
                        aria-label={`${isExpanded ? "Collapse" : "Expand"} result for expression on line ${block.lineNumber}`}
                        className="rounded-md border border-foreground/20 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50"
                      >
                        {isExpanded ? "Collapse" : "View Result"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleConvertBlock(block)}
                      disabled={result?.loading || convertingAll}
                      aria-label={`Convert expression on line ${block.lineNumber}`}
                      className="rounded-md bg-foreground/10 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {result?.loading
                        ? "Converting…"
                        : result?.response
                          ? "Reconvert"
                          : "Convert"}
                    </button>
                  </div>
                </div>

                <div
                  className="overflow-x-auto rounded-md bg-foreground/[0.03] px-3 py-2 [&_.katex]:text-[0.85rem]"
                  aria-label={`Math preview: ${block.latex.substring(0, 80)}`}
                  dangerouslySetInnerHTML={{ __html: block.renderedHtml }}
                />

                {result?.error && (
                  <p
                    role="alert"
                    className="text-xs text-red-600 dark:text-red-400"
                  >
                    {result.error}
                  </p>
                )}
              </div>

              {isExpanded && result?.response && (
                <div className="border-t border-foreground/10 p-4">
                  <OutputPanel response={result.response} latex={block.latex} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
