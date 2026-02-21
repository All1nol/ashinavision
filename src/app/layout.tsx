import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "katex/dist/katex.min.css";
import "./globals.css";
import { RouteFocusManager } from "@/components/route-focus-manager";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ashina Vision — LaTeX to Accessible HTML",
  description:
    "Convert LaTeX math content into accessible HTML with plain-English descriptions for screen readers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-foreground focus:ring-2 focus:ring-foreground/50"
        >
          Skip to main content
        </a>
        <RouteFocusManager />
        <header className="border-b border-foreground/10 px-6 py-4">
          <nav aria-label="Main navigation">
            <Link
              href="/"
              className="text-xl font-bold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 rounded-sm"
            >
              Ashina Vision
            </Link>
          </nav>
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 px-6 py-8 focus-visible:outline-none"
        >
          {children}
        </main>
        <footer
          className="border-t border-foreground/10 px-6 py-4 text-sm text-foreground/60"
          aria-label="Site footer"
        >
          Ashina Vision &mdash; Accessible math for everyone
        </footer>
      </body>
    </html>
  );
}
