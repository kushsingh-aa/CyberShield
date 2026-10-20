import Link from "next/link";
import { ShieldCheck, FileSearch, Flag, Terminal, ExternalLink } from "lucide-react";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 p-0.5 shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-all">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg text-white tracking-tight">CyberShield</span>
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                v2.0 Lab
              </span>
            </div>
            <p className="text-xs text-slate-400">Offer Letter Fraud Intelligence</p>
          </div>
        </Link>

        <nav className="flex items-center space-x-1 sm:space-x-3 text-sm font-medium">
          <Link
            href="/"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <FileSearch className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Check Offer</span>
          </Link>
          <Link
            href="/report"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <Flag className="w-4 h-4 text-amber-400" />
            <span>Student Reports</span>
          </Link>
          <a
            href="http://127.0.0.1:8000/docs"
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <Terminal className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">FastAPI Docs</span>
            <ExternalLink className="w-3 h-3 text-slate-500" />
          </a>
        </nav>
      </div>
    </header>
  );
}
