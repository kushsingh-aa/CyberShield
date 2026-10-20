"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

export default function Header() {
  const pathname = usePathname();

  let crumb = "Investigate offer";
  if (pathname === "/report") crumb = "Threat reports";
  if (pathname === "/system") crumb = "System design";
  if (pathname?.startsWith("/result")) crumb = "Investigation findings";

  return (
    <header className="h-[62px] flex items-center justify-between border-b border-[#1d2b34] text-[#7e929c] text-[10px] px-6 lg:px-8 bg-[#0a1017]/90 backdrop-blur-md sticky top-0 z-20">
      <div className="flex items-center">
        {/* Mobile Logo Fallback */}
        <div className="flex md:hidden items-center mr-3 space-x-2">
          <Link href="/" className="brand-shield !w-7 !h-8 !text-sm">✓</Link>
        </div>
        <span>Workspace</span>
        <span className="mx-2 text-[#3f515b]">/</span>
        <b className="text-[#e4eef1]">{crumb}</b>
      </div>

      <div className="flex items-center gap-2 font-mono-code text-[8px] tracking-[0.7px]">
        <span className="inline-block w-1.5 h-1.5 bg-[#56ecc0] rounded-full shadow-[0_0_8px_#56ecc066]" />
        <span className="hidden sm:inline text-[#8fa2ab]">RULE ENGINE ONLINE</span>
        <strong className="ml-2 w-7 h-7 grid place-items-center bg-[#20413d] rounded-lg text-[#56ecc0] font-bold text-[10px]">
          CS
        </strong>
      </div>
    </header>
  );
}
