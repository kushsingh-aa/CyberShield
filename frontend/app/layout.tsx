import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import TopNav from "@/components/TopNav";
import { themeInitScript } from "@/lib/theme";

export const metadata: Metadata = {
  title: "CyberShield | Offer Fraud Intelligence",
  description: "Investigate internship offers using explainable risk signals, domain checks, and student-reported patterns.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@300..700&family=Geist+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen p-2 sm:p-4">
        <div className="shell">
          <Suspense fallback={<div className="h-[52px]" />}>
            <TopNav />
          </Suspense>

          <main className="mt-6">{children}</main>

          <footer className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-2 text-[12px] text-[var(--muted)]">
            <span>CyberShield · Student safety lab</span>
            <span>Heuristic estimate, not a legal verdict</span>
          </footer>
        </div>
      </body>
    </html>
  );
}
