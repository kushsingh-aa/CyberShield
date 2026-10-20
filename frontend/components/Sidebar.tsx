"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();
  const [reportCount, setReportCount] = useState(0);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API || "http://127.0.0.1:8000";
    fetch(`${apiUrl}/api/stats`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.community_reports !== undefined) {
          setReportCount(data.community_reports);
        }
      })
      .catch(() => {});
  }, [pathname]);

  return (
    <aside className="w-[235px] shrink-0 fixed inset-y-0 left-0 bg-[#0d151e] border-r border-[#1f2d36] p-6 flex flex-col z-30 hidden md:flex">
      {/* Brand */}
      <Link href="/" className="flex items-center gap-2.5 text-[#eef6f7] no-underline font-extrabold text-[17px] tracking-[-0.6px] mb-10 group">
        <span className="brand-shield group-hover:scale-105 transition-transform">✓</span>
        <div>
          <span className="leading-tight block">
            Cyber<span className="text-[#56ecc0]">Shield</span>
          </span>
          <small className="block font-mono-code text-[8px] tracking-[1.4px] text-[#7e929d] mt-0.5">
            FRAUD INTELLIGENCE LAB
          </small>
        </div>
      </Link>

      {/* Navigation */}
      <div className="font-mono-code text-[9px] tracking-[1.4px] text-[#80939d] px-3 mb-2.5 uppercase">
        WORKSPACE
      </div>

      <nav className="space-y-1">
        <Link
          href="/"
          className={`nav-item ${pathname === "/" || pathname?.startsWith("/result") ? "active" : ""}`}
        >
          <span>⌕ &nbsp; Investigate offer</span>
        </Link>

        <Link
          href="/report"
          className={`nav-item ${pathname === "/report" ? "active" : ""}`}
        >
          <span>◉ &nbsp; Threat reports</span>
          <b>{reportCount}</b>
        </Link>

        <Link
          href="/system"
          className={`nav-item ${pathname === "/system" ? "active" : ""}`}
        >
          <span>⌘ &nbsp; System design</span>
        </Link>

        <a
          href="http://127.0.0.1:8000/docs"
          target="_blank"
          rel="noreferrer"
          className="nav-item"
        >
          <span>⌁ &nbsp; FastAPI Swagger</span>
          <span className="text-[9px] text-[#56ecc0]">↗</span>
        </a>
      </nav>

      {/* Bottom Privacy Card */}
      <div className="mt-auto pt-6">
        <div className="p-3.5 bg-[#12202a] border border-[#263640] rounded-[9px] mb-4">
          <span className="block text-[18px] text-[#56ecc0] mb-1.5">◈</span>
          <b className="text-[11px] text-[#eef6f7] block">Privacy-first design</b>
          <p className="text-[10px] leading-[1.6] text-[#8c9fa8] mt-1.5 mb-0">
            PII auto-redaction & local student records. Avoid uploading sensitive personal credentials.
          </p>
        </div>

        <small className="font-mono-code text-[8px] text-[#7d909a] tracking-[0.5px] flex items-center">
          <span className="inline-block w-1.5 h-1.5 bg-[#56ecc0] rounded-full mr-2 shadow-[0_0_8px_#56ecc066]" />
          LOCAL LAB ENVIRONMENT
        </small>
      </div>
    </aside>
  );
}
