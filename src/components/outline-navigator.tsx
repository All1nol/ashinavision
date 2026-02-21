"use client";

import { useRef, useCallback, type KeyboardEvent } from "react";
import type { OutlineNode } from "@/lib/types";

type OutlineNavigatorProps = {
  outline: OutlineNode[];
  activeNodeId: string | null;
  onSelectNode: (node: OutlineNode) => void;
};

type FlatNode = {
  node: OutlineNode;
  depth: number;
};

const flattenNodes = (
  nodes: OutlineNode[],
  depth: number = 0
): FlatNode[] => {
  return nodes.reduce<FlatNode[]>((acc, node) => {
    acc.push({ node, depth });
    if (node.children) {
      acc.push(...flattenNodes(node.children, depth + 1));
    }
    return acc;
  }, []);
};

export const OutlineNavigator = ({
  outline,
  activeNodeId,
  onSelectNode,
}: OutlineNavigatorProps) => {
  const treeRef = useRef<HTMLUListElement>(null);

  const flatNodes = flattenNodes(outline);

  const focusAndSelectNodeAtIndex = useCallback(
    (index: number) => {
      const treeEl = treeRef.current;
      if (!treeEl) return;
      const buttons = treeEl.querySelectorAll<HTMLButtonElement>(
        '[role="treeitem"]'
      );
      buttons[index]?.focus();

      const target = flatNodes[index];
      if (target) {
        onSelectNode(target.node);
      }
    },
    [flatNodes, onSelectNode]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLUListElement>) => {
      const treeEl = treeRef.current;
      if (!treeEl) return;

      const buttons = Array.from(
        treeEl.querySelectorAll<HTMLButtonElement>('[role="treeitem"]')
      );
      const currentIndex = buttons.findIndex(
        (btn) => btn === document.activeElement
      );

      if (currentIndex === -1) return;

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          const next = Math.min(currentIndex + 1, buttons.length - 1);
          focusAndSelectNodeAtIndex(next);
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          const prev = Math.max(currentIndex - 1, 0);
          focusAndSelectNodeAtIndex(prev);
          break;
        }
        case "ArrowRight": {
          e.preventDefault();
          const currentFlat = flatNodes[currentIndex];
          if (currentFlat?.node.children?.length) {
            focusAndSelectNodeAtIndex(currentIndex + 1);
          }
          break;
        }
        case "ArrowLeft": {
          e.preventDefault();
          const currentDepth = flatNodes[currentIndex]?.depth ?? 0;
          if (currentDepth > 0) {
            for (let i = currentIndex - 1; i >= 0; i--) {
              if (flatNodes[i].depth < currentDepth) {
                focusAndSelectNodeAtIndex(i);
                break;
              }
            }
          }
          break;
        }
        case "Home": {
          e.preventDefault();
          focusAndSelectNodeAtIndex(0);
          break;
        }
        case "End": {
          e.preventDefault();
          focusAndSelectNodeAtIndex(buttons.length - 1);
          break;
        }
      }
    },
    [flatNodes, focusAndSelectNodeAtIndex]
  );

  if (outline.length === 0) return null;

  const firstNodeId = flatNodes[0]?.node.id ?? null;

  const renderNode = (node: OutlineNode, depth: number) => {
    const isActive = node.id === activeNodeId;
    const hasChildren = node.children && node.children.length > 0;
    const isFocusable =
      isActive || (!activeNodeId && node.id === firstNodeId);

    return (
      <li key={node.id} role="none" className="flex flex-col">
        <button
          type="button"
          role="treeitem"
          aria-selected={isActive}
          aria-expanded={hasChildren ? true : undefined}
          aria-level={depth + 1}
          tabIndex={isFocusable ? 0 : -1}
          onClick={() => onSelectNode(node)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelectNode(node);
            }
          }}
          className={`w-full text-left rounded px-2 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 ${
            isActive
              ? "bg-foreground/10 font-semibold text-foreground"
              : "text-foreground/70 hover:bg-foreground/5"
          }`}
          style={{ paddingLeft: `${depth * 1.25 + 0.5}rem` }}
        >
          <span className="mr-1.5 text-foreground/40" aria-hidden="true">
            {hasChildren ? "\u25B8" : "\u2022"}
          </span>
          {node.label}
          <span className="ml-2 text-xs text-foreground/40">
            [{node.range.start}\u2013{node.range.end}]
          </span>
        </button>
        {hasChildren && (
          <ul role="group">
            {node.children!.map((child) => renderNode(child, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-foreground">
        Equation Outline
      </h3>
      <p className="text-xs text-foreground/50">
        Use arrow keys to navigate and highlight. Enter or Space also selects.
      </p>
      <ul
        ref={treeRef}
        role="tree"
        aria-label="Equation structure outline"
        onKeyDown={handleKeyDown}
        className="rounded-lg border border-foreground/10 bg-foreground/[0.02] p-2"
      >
        {outline.map((node) => renderNode(node, 0))}
      </ul>
    </div>
  );
};
