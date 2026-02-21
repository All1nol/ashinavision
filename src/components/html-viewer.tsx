"use client";

import { useState } from "react";
import DOMPurify from "isomorphic-dompurify";

type HtmlViewerProps = {
  html: string;
};

export const HtmlViewer = ({ html }: HtmlViewerProps) => {
  const [viewAsPlainText, setViewAsPlainText] = useState(false);

  const sanitized = DOMPurify.sanitize(html, {
    ALLOW_ARIA_ATTR: true,
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <label
          htmlFor="plain-text-toggle"
          className="text-sm font-medium text-foreground"
        >
          View as plain text
        </label>
        <button
          id="plain-text-toggle"
          type="button"
          role="switch"
          aria-checked={viewAsPlainText}
          onClick={() => setViewAsPlainText((prev) => !prev)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
            viewAsPlainText ? "bg-foreground" : "bg-foreground/20"
          }`}
        >
          <span
            aria-hidden="true"
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition-transform ${
              viewAsPlainText ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      <div
        className="rounded-lg border border-foreground/10 bg-foreground/[0.02] p-4 overflow-x-auto"
        role="region"
        aria-label="Converted HTML output"
      >
        {viewAsPlainText ? (
          <pre className="whitespace-pre-wrap break-words font-mono text-sm text-foreground/80">
            {html}
          </pre>
        ) : (
          <div
            className="prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: sanitized }}
          />
        )}
      </div>
    </div>
  );
};
