import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "katex/dist/katex.min.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MathBridge — LaTeX to Accessible HTML",
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
        <header className="border-b border-foreground/10 px-6 py-4">
          <Link href="/" className="text-xl font-bold tracking-tight">
            MathBridge
          </Link>
        </header>
        <main className="flex-1 px-6 py-8">{children}</main>
        <footer className="border-t border-foreground/10 px-6 py-4 text-sm text-foreground/60">
          MathBridge &mdash; Accessible math for everyone
        </footer>
      </body>
    </html>
  );
}
