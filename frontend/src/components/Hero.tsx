"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import DualWorkspaceCanvas from "./DualWorkspaceCanvas";

export default function Hero() {
  const headlineWords = ["Welcome", "to", "bilateral", "work."];

  return (
    <section className="relative overflow-hidden bg-white pt-8 pb-12 lg:pt-12 lg:pb-16">
      
      {/* ==============================================================
          PART 1: HERO HEADER (CLEAN WHITE)
         ============================================================== */}
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Subtle Rainbow Flare behind Pill */}
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-16 w-80 rounded-full bg-gradient-to-r from-cyan-400/35 via-purple-500/30 to-blue-500/35 blur-2xl" />

        {/* Pill Badge */}
        <div className="flex justify-center">
          <Link
            href="#spec"
            className="group relative inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white px-3.5 py-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] backdrop-blur transition hover:border-slate-300 hover:shadow-md"
          >
            <span className="font-sans text-xs font-medium text-slate-800">
              Protocol Specification v1.1
            </span>
            <span className="text-slate-300">•</span>
            <span className="font-sans text-xs text-slate-500 group-hover:text-slate-900 transition flex items-center gap-0.5">
              Read whitepaper <ChevronRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
            </span>
          </Link>
        </div>

        {/* Headline */}
        <div className="mx-auto mt-7 max-w-4xl text-center">
          <h1 className="font-heading text-5xl font-bold tracking-[-0.035em] text-ink sm:text-7xl lg:text-8xl flex flex-wrap justify-center gap-x-3.5 gap-y-1">
            {headlineWords.map((word, idx) => (
              <span
                key={idx}
                className="inline-block opacity-0 animate-cinematic"
                style={{ animationDelay: `${idx * 120}ms` }}
              >
                {word}
              </span>
            ))}
          </h1>

          <p
            className="mx-auto mt-5 max-w-2xl text-base text-slate-600 sm:text-lg lg:text-xl font-normal leading-relaxed opacity-0 animate-cinematic"
            style={{ animationDelay: "500ms" }}
          >
            Nexum is the platform that turns vague prompts into binding PRDs, manages mid-flight scope changes, and settles milestones with evidence.
          </p>
        </div>

        {/* Buttons */}
        <div
          className="mt-7 flex items-center justify-center gap-3 opacity-0 animate-cinematic"
          style={{ animationDelay: "620ms" }}
        >
          <Link
            href="#protocol"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200/90 bg-white px-4 text-xs font-semibold text-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition hover:bg-slate-50 hover:border-slate-300"
          >
            Talk to sales
          </Link>

          <Link
            href="/login"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-ink px-5 text-xs font-semibold text-white shadow-sm transition hover:bg-ink-light"
          >
            Start for free
          </Link>
        </div>

      </div>

      {/* ==============================================================
          PART 2: THE PERIWINKLE STAGE (CINEMATIC REVEAL RIGHT AFTER BUTTONS)
         ============================================================== */}
      <div className="relative mt-8 lg:mt-10 w-full bg-attio-vibrant-periwinkle pt-6 pb-16 lg:pt-8 lg:pb-20">
        
        {/* Soft edge blend at top */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white via-white/50 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white via-white/40 to-transparent" />

        {/* The Window reveals smoothly at 750ms after the buttons */}
        <div
          className="relative mx-auto max-w-[1520px] px-2 sm:px-4 lg:px-6 opacity-0 animate-cinematic-box"
          style={{ animationDelay: "750ms" }}
        >
          <DualWorkspaceCanvas />
        </div>

      </div>

    </section>
  );
}