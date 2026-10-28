"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowRight, GitBranch } from "lucide-react";
import Logo from "@/components/Logo";

export default function Footer() {
  return (
    <footer className="relative w-full bg-[#FAF9F6] border-t border-slate-200/80 text-slate-900 overflow-hidden pt-20 pb-12">
      <div className="relative z-10 mx-auto max-w-[1440px] px-6 lg:px-12">
        
        {/* ==============================================================
            1. PRE-FOOTER LAUNCHPAD (Attio / Linear Editorial Style)
           ============================================================== */}
        <div className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-14 lg:p-16 shadow-[0_2px_12px_rgba(0,0,0,0.03)] mb-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-mono text-xs text-slate-600 mb-5">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-900" />
              <span>Nexum Protocol v1.1</span>
            </div>

            <h2 className="font-heading text-3xl sm:text-5xl lg:text-6xl font-bold tracking-[-0.035em] text-slate-900 leading-[1.1]">
              Where agreements lock before code begins.
            </h2>

            <p className="mt-4 text-base sm:text-lg text-slate-500 font-normal leading-relaxed max-w-2xl">
              Eliminate scope drift, payment uncertainty, and freelance disputes with isolated AI workspaces and a single cryptographic source of truth.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/login"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white shadow-xs hover:bg-slate-800 transition"
              >
                <span>Launch Workspace</span>
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="#spec"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition"
              >
                <span>Read Architecture Spec</span>
                <ArrowUpRight className="h-4 w-4 text-slate-400" />
              </Link>
            </div>
          </div>
        </div>

        {/* ==============================================================
            2. STRUCTURED ARCHITECTURAL NAVIGATION GRID
           ============================================================== */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-12 gap-10 pb-16 border-b border-slate-200/80">
          
          {/* Brand & Thesis Column */}
          <div className="col-span-2 md:col-span-4 lg:col-span-4 space-y-4">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <Logo className="h-8 w-8" />
              <span className="font-heading text-xl font-bold tracking-tight text-slate-900">
                nexum
              </span>
            </Link>

            <p className="text-xs sm:text-sm text-slate-500 font-normal leading-relaxed max-w-sm">
              The AI-mediated freelance infrastructure for digital deliverables. Isolated AI workspaces, dual SHA-256 consensus, and idempotent PayPal settlement.
            </p>

            {/* Live Operational Beacon */}
            <div className="pt-2 flex items-center gap-2 text-xs font-mono text-slate-600">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>Consensus Rails: 100% Operational</span>
            </div>
          </div>

          {/* Column 1: Platform */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-slate-900">
              Platform
            </h4>
            <ul className="space-y-2.5 text-xs font-medium text-slate-500">
              <li><Link href="#workspace" className="hover:text-slate-900 transition-colors">Dual Workspaces</Link></li>
              <li><Link href="#spec" className="hover:text-slate-900 transition-colors">PRD Synthesis</Link></li>
              <li><Link href="#change-control" className="hover:text-slate-900 transition-colors">Section 14 Engine</Link></li>
              <li><Link href="#recovery" className="hover:text-slate-900 transition-colors">Intelligent Recovery</Link></li>
              <li><Link href="#audit" className="hover:text-slate-900 transition-colors">Audit Ledger</Link></li>
            </ul>
          </div>

          {/* Column 2: Protocol Standards */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-slate-900">
              Protocols
            </h4>
            <ul className="space-y-2.5 text-xs font-medium text-slate-500">
              <li><a href="https://developer.paypal.com/docs/api/orders/v2/" target="_blank" rel="noreferrer" className="hover:text-slate-900 transition-colors inline-flex items-center gap-1">PayPal Orders v2 <ArrowUpRight className="h-3 w-3 text-slate-400" /></a></li>
              <li><Link href="#recovery" className="hover:text-slate-900 transition-colors">OECD Paper 167</Link></li>
              <li><Link href="#consensus" className="hover:text-slate-900 transition-colors">SHA-256 Sign-off</Link></li>
              <li><Link href="#recovery" className="hover:text-slate-900 transition-colors">Idempotency Guard</Link></li>
              <li><Link href="#consent" className="hover:text-slate-900 transition-colors">FR-03 Privacy Firewall</Link></li>
            </ul>
          </div>

          {/* Column 3: Resources */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-slate-900">
              Developers
            </h4>
            <ul className="space-y-2.5 text-xs font-medium text-slate-500">
              <li><Link href="#spec" className="hover:text-slate-900 transition-colors">Specification v1.1</Link></li>
              <li><Link href="#docs" className="hover:text-slate-900 transition-colors">TypeScript SDK</Link></li>
              <li><Link href="#docs" className="hover:text-slate-900 transition-colors">REST API Docs</Link></li>
              <li><Link href="#docs" className="hover:text-slate-900 transition-colors">Webhook Verification</Link></li>
              <li><Link href="#audit" className="hover:text-slate-900 transition-colors">JSON Audit Export</Link></li>
            </ul>
          </div>

          {/* Column 4: System Telemetry */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-slate-900">
              Ecosystem
            </h4>
            <ul className="space-y-2.5 text-xs font-medium text-slate-500">
              <li><a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-slate-900 transition-colors inline-flex items-center gap-1.5"><GitBranch className="h-3.5 w-3.5" /> GitHub</a></li>
              <li><Link href="#changelog" className="hover:text-slate-900 transition-colors">Protocol Changelog</Link></li>
              <li><Link href="#status" className="hover:text-slate-900 transition-colors">Network Status</Link></li>
              <li><Link href="#security" className="hover:text-slate-900 transition-colors">Security Whitepaper</Link></li>
            </ul>
          </div>

        </div>

        {/* ==============================================================
            3. REGULATORY TERMINAL & LEGAL NOTICE (OECD Paper 167)
           ============================================================== */}
        <div className="pt-8 pb-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 text-[11px] text-slate-500 font-mono">
          <div className="max-w-3xl leading-relaxed">
            <span className="text-slate-900 font-semibold">Mandatory Protocol Disclosure:</span> Nexum is not a bank, currency exchange, wallet custodian, or money transmitter. Standard PayPal checkout captures confirm order reservation and do not constitute unconditional escrow or guarantee recipient bank credit. All transactions are settled via PayPal Orders v2 terms under OECD Paper 167 transparency guidelines.
          </div>

          <div className="shrink-0 flex items-center gap-4 text-slate-400">
            <span>2026 // EDITION</span>
            <span>•</span>
            <span>OPEN ARCHITECTURE</span>
          </div>
        </div>

      </div>

      {/* ==============================================================
          4. FAINT TYPOGRAPHIC BRAND WATERMARK (Apple / Attio Keynote Style)
         ============================================================== */}
      <div className="pointer-events-none select-none absolute -bottom-10 inset-x-0 flex justify-center overflow-hidden opacity-[0.035]">
        <span className="font-heading font-extrabold text-[16vw] tracking-[-0.05em] leading-none text-slate-900">
          nexum
        </span>
      </div>

    </footer>
  );
}