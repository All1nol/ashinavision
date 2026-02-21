"use client";

import { useState, useCallback } from "react";
import type { ConvertResponse, OutlineNode } from "@/lib/types";
import { CopyButton } from "./copy-button";
import { HtmlViewer } from "./html-viewer";
import { OutlineNavigator } from "./outline-navigator";
import { LatexPreview } from "./latex-preview";
import { StatusAnnouncer } from "./status-announcer";

type Tab = "concise" | "detailed" | "html" | "outline";

const TABS: { id: Tab; label: string }[] = [
  { id: "concise", label: "Concise" },
  { id: "detailed", label: "Detailed" },
  { id: "html", label: "HTML" },
  { id: "outline", label: "Outline" },
];

type OutputPanelProps = {
  response: ConvertResponse;
  latex: string;
  idBase?: string;
};

export const OutputPanel = ({ response, latex, idBase = "output" }: OutputPanelProps) => {
  const [activeTab, setActiveTab] = useState<Tab>("concise");
  const [announcement, setAnnouncement] = useState("");
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);

  const handleAnnounce = useCallback((message: string) => {
    setAnnouncement("");
    requestAnimationFrame(() => setAnnouncement(message));
  }, []);

  const handleSelectNode = useCallback(
    (node: OutlineNode) => {
      setActiveNodeId(node.id);
      handleAnnounce(`Selected: ${node.label}`);
    },
    [handleAnnounce]
  );

  return (
    <div className="flex flex-col gap-4">
      <StatusAnnouncer message={announcement} />

      <h2 className="text-lg font-semibold text-foreground">
        Conversion Results
      </h2>

      {response.warnings.length > 0 && (
        <div
          role="alert"
          className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3"
        >
          <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
            Warnings
          </p>
          <ul className="mt-1 list-inside list-disc text-sm text-yellow-700 dark:text-yellow-300">
            {response.warnings.map((warning, i) => (
              <li key={i}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <div
        role="tablist"
        aria-label="Output sections"
        className="flex gap-1 rounded-lg border border-foreground/10 bg-foreground/[0.02] p-1"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`${idBase}-tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`${idBase}-panel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={(e) => {
              const currentIndex = TABS.findIndex((t) => t.id === activeTab);
              let target: (typeof TABS)[number] | undefined;

              switch (e.key) {
                case "ArrowRight":
                  target = TABS[(currentIndex + 1) % TABS.length];
                  break;
                case "ArrowLeft":
                  target =
                    TABS[(currentIndex - 1 + TABS.length) % TABS.length];
                  break;
                case "Home":
                  target = TABS[0];
                  break;
                case "End":
                  target = TABS[TABS.length - 1];
                  break;
              }

              if (target) {
                e.preventDefault();
                setActiveTab(target.id);
                document
                  .getElementById(`${idBase}-tab-${target.id}`)
                  ?.focus();
              }
            }}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 ${
              activeTab === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-foreground/60 hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        id={`${idBase}-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`${idBase}-tab-${activeTab}`}
        tabIndex={0}
        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 rounded-lg"
      >
        {activeTab === "concise" && (
          <div className="flex flex-col gap-3">
            <div className="rounded-lg border border-foreground/10 bg-foreground/[0.02] p-4">
              <p className="text-sm text-foreground leading-relaxed">
                {response.descriptions.concise}
              </p>
            </div>
            <CopyButton
              text={response.descriptions.concise}
              label="Concise description"
              onAnnounce={handleAnnounce}
            />
          </div>
        )}

        {activeTab === "detailed" && (
          <div className="flex flex-col gap-3">
            <div className="rounded-lg border border-foreground/10 bg-foreground/[0.02] p-4">
              <p className="text-sm text-foreground leading-relaxed">
                {response.descriptions.detailed}
              </p>
            </div>
            <CopyButton
              text={response.descriptions.detailed}
              label="Detailed description"
              onAnnounce={handleAnnounce}
            />
          </div>
        )}

        {activeTab === "html" && (
          <div className="flex flex-col gap-3">
            <HtmlViewer html={response.html} idBase={`${idBase}-html`} />
            <CopyButton
              text={response.html}
              label="HTML"
              onAnnounce={handleAnnounce}
            />
          </div>
        )}

        {activeTab === "outline" && (
          <div className="flex flex-col gap-4">
            <OutlineNavigator
              outline={response.outline}
              activeNodeId={activeNodeId}
              onSelectNode={handleSelectNode}
            />
            <LatexPreview
              latex={latex}
              outline={response.outline}
              activeNodeId={activeNodeId}
            />
          </div>
        )}
      </div>
    </div>
  );
};
