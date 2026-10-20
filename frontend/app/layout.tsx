import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "OfferGuard / CyberShield | Fraud Intelligence Lab",
  description: "Investigate internship offers using explainable risk signals, domain checks, and student-reported patterns.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Manrope:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#0a1017] text-[#eef6f7] min-h-screen">
        <Suspense fallback={<aside className="w-[235px] fixed inset-y-0 left-0 bg-[#0d151e] border-r border-[#1f2d36] hidden md:block" />}>
          <Sidebar />
        </Suspense>

        <div className="md:ml-[235px] flex flex-col min-h-screen">
          <Suspense fallback={<header className="h-[62px] border-b border-[#1d2b34] bg-[#0a1017]" />}>
            <Header />
          </Suspense>

          <main className="flex-1 px-4 sm:px-7 max-w-[1750px] w-full mx-auto py-5">
            {children}
          </main>

          <footer className="flex flex-col sm:flex-row items-center justify-between gap-2.5 px-6 sm:px-8 py-5 border-t border-[#1e2b34] text-[#6e838d] font-mono-code text-[8px] tracking-[0.5px] mt-8">
            <div>CYBERSHIELD / OFFERGUARD · STUDENT SAFETY LAB</div>
            <div>
              Evidence over assumptions <b className="text-[#56ecc0] ml-1">✳</b>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
