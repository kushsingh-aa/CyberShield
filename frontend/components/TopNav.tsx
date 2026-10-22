"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, ArrowUpRight } from "lucide-react";
import { API_URL } from "@/lib/api";
import ThemeToggle from "@/components/ThemeToggle";

const LINKS = [
  { href: "/", label: "Overview", match: (p: string) => p === "/" || p.startsWith("/result") },
  { href: "/history", label: "History", match: (p: string) => p === "/history" },
  { href: "/report", label: "Reports", match: (p: string) => p === "/report" },
  { href: "/system", label: "System", match: (p: string) => p === "/system" },
];

export default function TopNav() {
  const pathname = usePathname() || "/";
  const [online, setOnline] = useState<boolean | null>(null);
  const [reportCount, setReportCount] = useState<number | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/stats`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        setOnline(true);
        setReportCount(data.community_reports ?? 0);
      })
      .catch(() => setOnline(false));
  }, [pathname]);

  return (
    <header className="flex items-center justify-between gap-4">
      <Link href="/" className="flex items-center gap-2.5 shrink-0">
        <span className="w-8 h-8 rounded-[9px] grid place-items-center bg-[var(--orange)] text-white shadow-[inset_0_1px_0_#ffffff55,0_6px_14px_-6px_#f47a1f]">
          <ShieldCheck className="w-[18px] h-[18px]" strokeWidth={2.2} />
        </span>
        <span className="text-[20px] font-semibold tracking-[-0.04em]">cybershield</span>
      </Link>

      <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar min-w-0">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={`nav-link ${l.match(pathname) ? "active" : ""}`}>
            {l.label}
            {l.href === "/report" && reportCount ? (
              <span className="text-[11px] opacity-60 tnum">{reportCount}</span>
            ) : null}
          </Link>
        ))}
        <a href={`${API_URL}/docs`} target="_blank" rel="noreferrer" className="nav-link">
          API
          <ArrowUpRight className="w-3.5 h-3.5 opacity-60" />
        </a>
      </nav>

      <div className="flex items-center gap-2 shrink-0">
        <span className="chip !hidden md:!inline-flex" title="Backend status">
          <span
            className={`w-2 h-2 rounded-full ${
              online === null ? "bg-[var(--faint)]" : online ? "bg-[var(--green)]" : "bg-[var(--red)]"
            }`}
          />
          {online === null ? "Connecting" : online ? "Engine online" : "Engine offline"}
        </span>
        <ThemeToggle />
        <span className="w-9 h-9 rounded-full hidden md:grid place-items-center text-[12px] font-semibold text-white bg-[linear-gradient(135deg,#ff9a57,#2b59ff)]">
          CS
        </span>
      </div>
    </header>
  );
}
