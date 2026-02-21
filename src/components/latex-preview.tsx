"use client";

import { useEffect, useRef, useMemo } from "react";
import type { OutlineNode } from "@/lib/types";

type LatexPreviewProps = {
  latex: string;
  outline: OutlineNode[];
  activeNodeId: string | null;
};

const findNodeById = (
  nodes: OutlineNode[],
  id: string
): OutlineNode | null => {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
};

export const LatexPreview = ({
  latex,
  outline,
  activeNodeId,
}: LatexPreviewProps) => {
  const highlightRef = useRef<HTMLElement>(null);

  const activeNode = useMemo(
    () => (activeNodeId ? findNodeById(outline, activeNodeId) : null),
    [outline, activeNodeId]
  );

  useEffect(() => {
    highlightRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [activeNodeId]);

  if (!latex) return null;

  const renderHighlightedLatex = () => {
    if (!activeNode) {
      return (
        <code className="text-foreground/80">{latex}</code>
      );
    }

    const { start, end } = activeNode.range;
    const before = latex.slice(0, start);
    const highlighted = latex.slice(start, end);
    const after = latex.slice(end);

    return (
      <code>
        <span className="text-foreground/80">{before}</span>
        <mark
          ref={highlightRef}
          className="rounded bg-yellow-300/40 px-0.5 text-foreground dark:bg-yellow-500/30"
        >
          {highlighted}
        </mark>
        <span className="text-foreground/80">{after}</span>
      </code>
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-foreground">LaTeX Preview</h3>
      <pre
        className="overflow-x-auto rounded-lg border border-foreground/10 bg-foreground/[0.02] p-4 font-mono text-sm whitespace-pre-wrap break-words"
        role="region"
        aria-label="LaTeX source with highlighted segment"
        tabIndex={0}
      >
        {renderHighlightedLatex()}
      </pre>
    </div>
  );
};
