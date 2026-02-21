"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export const RouteFocusManager = () => {
  const pathname = usePathname();
  const announcerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const main = document.getElementById("main-content");
    if (main instanceof HTMLElement) {
      main.focus();
    }

    const title = document.title?.trim();
    const message = title ? `${title} loaded` : "Page loaded";

    const el = announcerRef.current;
    if (!el) return;
    el.textContent = "";
    requestAnimationFrame(() => {
      el.textContent = message;
    });
  }, [pathname]);

  return (
    <div
      ref={announcerRef}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    />
  );
};

