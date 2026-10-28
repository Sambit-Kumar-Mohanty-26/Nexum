"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  Sparkles,
  GitBranch,
  Lock,
  Check,
} from "lucide-react";

const navItems = [
  { id: "prd", label: "Synthesize PRD" },
  { id: "change-control", label: "Mid-flight change control" },
  { id: "consensus", label: "Dual SHA-256 consensus" },
  { id: "recovery", label: "Intelligent recovery" },
  { id: "audit", label: "Audit ledger & telemetry" },
];

export default function ProductSuite() {
  const [activeId, setActiveId] = useState<string>("prd");
  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({});

  // Accurate viewport scroll spy
  useEffect(() => {
    const handleScroll = () => {
      let currentActive = navItems[0].id; // Always defaults to the first item (Synthesize PRD)

      for (const item of navItems) {
        const el = sectionRefs.current[item.id];
        if (el) {
          const rect = el.getBoundingClientRect();
          // Activates when the stage reaches the sticky top threshold (220px)
          if (rect.top <= 220) {
            currentActive = item.id;
          }
        }
      }

      setActiveId(currentActive);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    const el = sectionRefs.current[id];
    if (el) {
      window.scrollTo({
        top: el.offsetTop - 120,
        behavior: "smooth",
      });
    }
  };

  return (
    <section className="relative w-full bg-white py-24 lg:py-32 border-b border-slate-200/80">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-12">
        
        {/* ==============================================================
            SECTION HEADER (Attio's exact editorial typography)
           ============================================================== */}
        <div className="max-w-4xl mb-20 lg:mb-28">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-slate-50 px-3.5 py-1 text-xs font-mono font-medium text-slate-700 mb-5">
            <span>Platform Architecture</span>
          </div>

          <h2 className="font-heading text-4xl sm:text-6xl font-bold tracking-[-0.035em] text-ink leading-[1.08]">
            The intelligent system that never sleeps.{" "}
            <span className="text-slate-400 font-normal">
              Turns vague prompts into binding PRDs. Intercepts scope creep before it starts.
            </span>
          </h2>
        </div>

        {/* ==============================================================
            ATTIO TWO-COLUMN STICKY LAYOUT:
            Left: Sticky Index Links
            Right: Deep Scrolling Feature Showcases
           ============================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          
          {/* =========================================================
              LEFT COLUMN: Sticky Navigation Rail
             ========================================================= */}
          <div className="hidden lg:block lg:col-span-3 sticky top-28 self-start space-y-1">
            {navItems.map((item) => {
              const isActive = activeId === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => scrollTo(item.id)}
                  className={`w-full text-left py-2.5 px-3.5 rounded-lg text-[15px] transition-all duration-200 flex items-center justify-between cursor-pointer ${
                    isActive
                      ? "font-bold text-ink bg-slate-100/80 shadow-xs"
                      : "font-medium text-slate-400 hover:text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="h-1.5 w-1.5 rounded-full bg-cobalt" />
                  )}
                </button>
              );
            })}
          </div>

          {/* =========================================================
              RIGHT COLUMN: Scrolling Stages & High-Density UI Mockups
             ========================================================= */}
          <div className="lg:col-span-9 space-y-28 lg:space-y-36">
            
            {/* --------------------------------------------------------
                STAGE 1: PRD SYNTHESIS
               -------------------------------------------------------- */}
            <div
              id="prd"
              ref={(el) => { sectionRefs.current["prd"] = el; }}
              className="scroll-mt-28 space-y-8"
            >
              {/* Stage Headline */}
              <div>
                <h3 className="font-heading text-2xl sm:text-3xl font-bold text-ink">
                  Turn vague chats into testable acceptance criteria.
                </h3>
                <p className="mt-2 text-base text-slate-600 max-w-2xl font-normal leading-relaxed">
                  Direct client chats create memory leaks. Nexum’s intake agent parses natural conversation into structured JSON requirements with machine-verifiable pass/fail criteria.
                </p>
              </div>

              {/* Stage Visual: Split-Screen Interface */}
              <div className="rounded-2xl border border-slate-200/90 bg-[#FAF9F6] p-4 sm:p-6 shadow-attio">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  
                  {/* Left: Raw Client Input */}
                  <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                        <div className="h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                          C
                        </div>
                        <span className="font-heading text-xs font-bold text-ink">Client Natural Input</span>
                      </div>
                      <p className="mt-3 text-xs text-slate-700 italic leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                        “I need a Next.js digital storefront with Stripe and PayPal checkout. Maximum budget is $5,500, but I want to offer $4,000 first. Must be done by Nov 20.”
                      </p>
                    </div>

                    <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-500">
                      <span>Firewall: Active</span>
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <Check className="h-3 w-3" /> Budget Ceiling Redacted
                      </span>
                    </div>
                  </div>

                  {/* Right: Extracted Schema PRD */}
                  <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                      <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-cobalt uppercase">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Synthesized PRD v1.1</span>
                      </div>
                      <span className="rounded bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-mono font-bold">
                        100% Schema Valid
                      </span>
                    </div>

                    <div className="mt-3 space-y-2 font-mono text-xs">
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                        <span className="text-slate-900 font-medium">FR-01: Next.js 15 App Router SSR Catalog</span>
                        <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-bold">PARSED</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                        <span className="text-slate-900 font-medium">FR-02: PayPal Orders v2 Webhook Deduplication</span>
                        <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-bold">PARSED</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                        <span className="text-slate-900 font-medium">NFR-03: Edge Latency sub-800ms TTFB</span>
                        <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-bold">PARSED</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Sub-Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <h4 className="font-heading text-sm font-bold text-ink">No Conversational Ambiguity</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Every milestone contains unambiguous pass/fail criteria. If requirements shift, the state machine detects material diffs automatically.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <h4 className="font-heading text-sm font-bold text-ink">Zero Strategy Leakage</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Internal notes and maximum willing spend are cryptographically stripped before sending the proposal brief to the freelancer.
                  </p>
                </div>
              </div>
            </div>

            {/* --------------------------------------------------------
                STAGE 2: SECTION 14 NODE WORKFLOW CANVAS (ATTIO-STYLE)
               -------------------------------------------------------- */}
            <div
              id="change-control"
              ref={(el) => { sectionRefs.current["change-control"] = el; }}
              className="scroll-mt-28 space-y-8"
            >
              <div>
                <h3 className="font-heading text-2xl sm:text-3xl font-bold text-ink">
                  Mid-flight scope changes routed without rewriting history.
                </h3>
                <p className="mt-2 text-base text-slate-600 max-w-2xl font-normal leading-relaxed">
                  When a client requests extra features during development, Section 14 evaluates the agreement and branches it into follow-on milestones. Completed work is permanently sealed.
                </p>
              </div>

              {/* ATTIO-STYLE INLINE NODE CANVAS */}
              <div className="relative rounded-2xl border border-slate-200/90 bg-[#FAF9F6] p-6 sm:p-10 shadow-attio overflow-hidden flex justify-center">
                
                {/* Flex Container ensuring perfect alignment */}
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-center w-full max-w-[850px]">
                  
                  {/* Node 1: Trigger */}
                  <div className="w-full md:w-48 shrink-0 rounded-xl border border-blue-200 bg-white p-3.5 shadow-sm z-10">
                    <div className="flex items-center justify-between">
                      <span className="rounded bg-blue-50 text-blue-700 px-1.5 py-0.5 text-[9px] font-mono font-bold">
                        TRIGGER
                      </span>
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                    </div>
                    <div className="mt-2 font-heading text-xs font-bold text-ink">Scope Modification</div>
                    <p className="text-[10px] text-slate-500 mt-0.5 font-mono truncate">“Add Multi-Currency in M2”</p>
                  </div>

                  {/* Connector 1 (Straight line) */}
                  <div className="hidden md:flex h-px w-10 lg:w-14 bg-slate-300 shrink-0 relative">
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-slate-300" />
                  </div>
                  {/* Mobile Fallback Arrow */}
                  <div className="md:hidden h-6 w-px bg-slate-300 my-2 relative">
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-slate-300" />
                  </div>

                  {/* Node 2: Section 14 AI Classifier */}
                  <div className="w-full md:w-56 shrink-0 rounded-xl border-2 border-cobalt bg-white p-4 shadow-md z-10">
                    <div className="flex items-center justify-between">
                      <span className="rounded bg-cobalt text-white px-1.5 py-0.5 text-[9px] font-mono font-bold">
                        SEC 14 ENGINE
                      </span>
                      <GitBranch className="h-3.5 w-3.5 text-cobalt" />
                    </div>
                    <div className="mt-2 font-heading text-xs font-bold text-ink">Deterministic Routing</div>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                      Detects M1 is accepted & M2 is active. Routes to M4 fork.
                    </p>
                  </div>

                  {/* Connector 2 (Curved Bezier Fork) */}
                  <div className="hidden md:block w-10 lg:w-16 h-[92px] shrink-0 relative">
                    {/* vectorEffect="non-scaling-stroke" keeps the line 1.5px thick even if the SVG stretches */}
                    <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                      <path d="M 0 50 C 50 50, 50 0, 100 0" fill="none" stroke="#cbd5e1" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                      <path d="M 0 50 C 50 50, 50 100, 100 100" fill="none" stroke="#cbd5e1" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                      <circle cx="100" cy="0" r="2.5" fill="#cbd5e1" vectorEffect="non-scaling-stroke" />
                      <circle cx="100" cy="100" r="2.5" fill="#cbd5e1" vectorEffect="non-scaling-stroke" />
                    </svg>
                  </div>
                  {/* Mobile Fallback Fork */}
                  <div className="md:hidden flex flex-col items-center my-2">
                     <div className="h-6 w-px bg-slate-300" />
                  </div>

                  {/* Nodes 3 & 4: Output Branches */}
                  <div className="flex flex-col gap-4 w-full md:w-52 shrink-0 z-10">
                    
                    {/* Branch A: Completed Milestone (Immutable) */}
                    <div className="rounded-xl border border-emerald-200 bg-white p-3.5 shadow-sm h-[76px] flex flex-col justify-center">
                      <div className="flex items-center justify-between">
                        <span className="rounded bg-emerald-50 text-emerald-700 px-1.5 py-0.5 text-[9px] font-mono font-bold">
                          M1 LOCKED
                        </span>
                        <Lock className="h-3.5 w-3.5 text-emerald-600" />
                      </div>
                      <div className="mt-1.5 font-heading text-[11px] font-bold text-ink">History Preserved</div>
                      <p className="text-[9.5px] text-slate-400 font-mono mt-0.5">Completed work never reopened</p>
                    </div>

                    {/* Branch B: Follow-on Milestone (Active) */}
                    <div className="rounded-xl border-2 border-cobalt bg-white p-3.5 shadow-md h-[76px] flex flex-col justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-blue-50/40 pointer-events-none" />
                      <div className="relative flex items-center justify-between">
                        <span className="rounded bg-cobalt text-white px-1.5 py-0.5 text-[9px] font-mono font-bold">
                          M4 FOLLOW-ON
                        </span>
                        <Sparkles className="h-3.5 w-3.5 text-cobalt" />
                      </div>
                      <div className="relative mt-1.5 font-heading text-[11px] font-bold text-ink">+$800.00 • +5 Business Days</div>
                      <p className="relative text-[9.5px] text-cobalt font-mono mt-0.5">Dual approval required</p>
                    </div>

                  </div>

                </div>
              </div>

              {/* Sub-Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <h4 className="font-heading text-sm font-bold text-ink">6 Deterministic Routes</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    New feature, unaccepted revision, follow-on milestone, clarification, scope reduction, or defect correction. No unstructured ambiguity.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <h4 className="font-heading text-sm font-bold text-ink">Dual Sign-Off Reset</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Any material cost or timeline adjustment generates a new agreement snapshot that both parties must cryptographically sign.
                  </p>
                </div>
              </div>
            </div>

            {/* --------------------------------------------------------
                STAGE 3: DUAL CONSENSUS KANBAN BOARD
               -------------------------------------------------------- */}
            <div
              id="consensus"
              ref={(el) => { sectionRefs.current["consensus"] = el; }}
              className="scroll-mt-28 space-y-8"
            >
              <div>
                <h3 className="font-heading text-2xl sm:text-3xl font-bold text-ink">
                  No contract is active until both parties sign the same hash.
                </h3>
                <p className="mt-2 text-base text-slate-600 max-w-2xl font-normal leading-relaxed">
                  Every proposal, counteroffer, and milestone allocation snapshots scope and terms into a SHA-256 hash. If one party alters a single character, consensus is immediately voided.
                </p>
              </div>

              {/* Milestone Kanban Board */}
              <div className="rounded-2xl border border-slate-200/90 bg-[#FAF9F6] p-4 sm:p-6 shadow-attio overflow-x-auto">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5 min-w-[700px]">
                  
                  {/* Column 1: M1 */}
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="font-bold text-slate-900">M1: Core DB</span>
                      <span className="rounded bg-emerald-50 text-emerald-700 px-1.5 py-0.2 text-[9px] font-bold">ACCEPTED</span>
                    </div>
                    <p className="text-xs text-slate-600">Schema migrations & OAuth2 tenant isolation.</p>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between font-mono text-[11px]">
                      <span className="font-bold text-slate-900">$1,200.00</span>
                      <span className="text-emerald-600 text-[10px]">Paid (Cap #82)</span>
                    </div>
                  </div>

                  {/* Column 2: M2 */}
                  <div className="rounded-xl border border-cobalt bg-white p-3.5 shadow-md space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="font-bold text-slate-900">M2: Catalog</span>
                      <span className="rounded bg-blue-50 text-blue-700 px-1.5 py-0.2 text-[9px] font-bold">IN PROGRESS</span>
                    </div>
                    <p className="text-xs text-slate-600">SSR product catalog and checkout pipeline.</p>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between font-mono text-[11px]">
                      <span className="font-bold text-slate-900">$1,600.00</span>
                      <span className="text-cobalt text-[10px]">Due Nov 12</span>
                    </div>
                  </div>

                  {/* Column 3: M3 */}
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="font-bold text-slate-900">M3: Orders v2</span>
                      <span className="rounded bg-slate-100 text-slate-600 px-1.5 py-0.2 text-[9px] font-bold">QUEUED</span>
                    </div>
                    <p className="text-xs text-slate-600">PayPal webhook deduplication listener.</p>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between font-mono text-[11px]">
                      <span className="font-bold text-slate-900">$1,200.00</span>
                      <span className="text-slate-400 text-[10px]">Locked v1.2</span>
                    </div>
                  </div>

                  {/* Column 4: M4 Follow-on */}
                  <div className="rounded-xl border border-purple-200 bg-purple-50/30 p-3.5 shadow-sm space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="font-bold text-slate-900">M4: Follow-on</span>
                      <span className="rounded bg-purple-100 text-purple-700 px-1.5 py-0.2 text-[9px] font-bold">PROPOSED</span>
                    </div>
                    <p className="text-xs text-slate-600">Multi-currency conversion checkout module.</p>
                    <div className="pt-2 border-t border-purple-100 flex items-center justify-between font-mono text-[11px]">
                      <span className="font-bold text-purple-700">+$800.00</span>
                      <span className="text-purple-600 text-[10px]">Review Req</span>
                    </div>
                  </div>

                </div>
              </div>

              {/* Sub-Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <h4 className="font-heading text-sm font-bold text-ink">Cryptographic Version Snapshots</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    v1.0 Draft $\rightarrow$ v1.1 Counteroffer $\rightarrow$ v1.2 Consensus. Full immutable lineage with zero unrecorded commitments.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <h4 className="font-heading text-sm font-bold text-ink">Non-Autonomous AI Security</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    AI suggests pricing curves and drafts specs, but is cryptographically prevented from signing agreements or releasing funds.
                  </p>
                </div>
              </div>
            </div>

            {/* --------------------------------------------------------
                STAGE 4: INTELLIGENT RECOVERY & STATE MACHINE
               -------------------------------------------------------- */}
            <div
              id="recovery"
              ref={(el) => { sectionRefs.current["recovery"] = el; }}
              className="scroll-mt-28 space-y-8"
            >
              <div>
                <h3 className="font-heading text-2xl sm:text-3xl font-bold text-ink">
                  A network timeout does not mean payment failed.
                </h3>
                <p className="mt-2 text-base text-slate-600 max-w-2xl font-normal leading-relaxed">
                  Traditional platforms prompt users to “Try Again” after an HTTP timeout, double-charging credit cards. Nexum transitions to UNKNOWN and uses idempotent reconciliation.
                </p>
              </div>

              {/* State Machine Terminal Showcase */}
              <div className="rounded-2xl border border-slate-800/90 bg-[#0C1017] p-5 shadow-terminal font-mono text-xs text-white">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span className="ml-2 text-slate-300 text-[11px]">recovery.state-machine</span>
                  </div>
                  <span className="rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2 py-0.5 text-[10px]">
                    ZERO BLIND RETRIES
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-[11px] leading-relaxed">
                  <p className="text-slate-400">&gt; POST /v2/checkout/orders/capture (idempotencyKey: req_98bfa2)</p>
                  <p className="text-amber-400 font-semibold">⚠ [HTTP 504 GATEWAY TIMEOUT] Server dropped response mid-capture.</p>
                  <p className="text-slate-300">● Transitioning PaymentAttempt #882 state $\rightarrow$ <strong className="text-amber-300">UNKNOWN (Reconciliation Required)</strong></p>
                  <p className="text-red-400">🛡 SAFEGUARD TRIGGERED: Buyer UI blocked from submitting duplicate charge.</p>
                  <p className="text-blue-400">● Background daemon polling: GET /v2/checkout/orders/9AB7204...</p>
                  <p className="text-emerald-400 font-semibold">✔ Webhook verified: PAYMENT.CAPTURE.COMPLETED (captureId: 7CD9921)</p>
                  <p className="text-slate-300">● Final state: <strong className="text-emerald-400">CAPTURED</strong>. Exact fee reconciled. 0 extra charges occurred.</p>
                </div>
              </div>

              {/* Sub-Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <h4 className="font-heading text-sm font-bold text-ink">Payment Readiness Card</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Prior to checkout, contract amounts are locked server-side. Unobservable fields are transparently labeled rather than guessed.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <h4 className="font-heading text-sm font-bold text-ink">OECD Compliance Standard</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Clear legal separation between payment capture and bank credit. Standard PayPal capture is never mislabeled as unconditional escrow.
                  </p>
                </div>
              </div>
            </div>

            {/* --------------------------------------------------------
                STAGE 5: AUDIT LEDGER & TELEMETRY
               -------------------------------------------------------- */}
            <div
              id="audit"
              ref={(el) => { sectionRefs.current["audit"] = el; }}
              className="scroll-mt-28 space-y-8"
            >
              <div>
                <h3 className="font-heading text-2xl sm:text-3xl font-bold text-ink">
                  Every decision mathematically sealed in an audit ledger.
                </h3>
                <p className="mt-2 text-base text-slate-600 max-w-2xl font-normal leading-relaxed">
                  Cryptographic event streaming ensures neither party can deny approvals, dispute deliveries retroactively, or hide private negotiation terms.
                </p>
              </div>

              {/* Metrics & Ledger Stream */}
              <div className="rounded-2xl border border-slate-200/90 bg-[#FAF9F6] p-6 shadow-attio">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-6 border-b border-slate-200/80">
                  <div>
                    <span className="font-mono text-[10px] text-slate-400 uppercase">Dual Consensus</span>
                    <div className="font-heading text-2xl font-bold text-ink mt-0.5">100%</div>
                    <span className="text-[10px] text-emerald-600 font-medium">Matching hashes</span>
                  </div>
                  <div>
                    <span className="font-mono text-[10px] text-slate-400 uppercase">Scope Creep</span>
                    <div className="font-heading text-2xl font-bold text-emerald-600 mt-0.5">0.0%</div>
                    <span className="text-[10px] text-slate-500">M1/M2 locked</span>
                  </div>
                  <div>
                    <span className="font-mono text-[10px] text-slate-400 uppercase">Blind Retries</span>
                    <div className="font-heading text-2xl font-bold text-ink mt-0.5">0</div>
                    <span className="text-[10px] text-emerald-600 font-medium">Duplicates blocked</span>
                  </div>
                  <div>
                    <span className="font-mono text-[10px] text-slate-400 uppercase">Edge Latency</span>
                    <div className="font-heading text-2xl font-bold text-ink mt-0.5">&lt;410ms</div>
                    <span className="text-[10px] text-slate-500">Global sync</span>
                  </div>
                </div>

                <div className="mt-4 pt-2 font-mono text-[11px] text-slate-500 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-800 font-medium">[14:22:01] PRD_VERSION_LOCKED</span>
                    <span className="text-slate-400">hash=7f8a...3b9e</span>
                    <span className="text-emerald-600">VERIFIED</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-800 font-medium">[14:23:40] DUAL_APPROVAL_VERIFIED</span>
                    <span className="text-slate-400">sig_c89b + sig_f71a</span>
                    <span className="text-emerald-600">CONSENSUS</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-800 font-medium">[14:24:11] CAPTURE_CONFIRMED</span>
                    <span className="text-slate-400">order=9AB7204</span>
                    <span className="text-emerald-600">SETTLED</span>
                  </div>
                </div>
              </div>

              {/* Sub-Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <h4 className="font-heading text-sm font-bold text-ink">Exportable Audit Packages</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Download full JSON audit trails for tax reporting, OECD compliance, and milestone deliverable evidence.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <h4 className="font-heading text-sm font-bold text-ink">Post-Project Verified Reviews Only</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Reputation scores can only be submitted after actual milestone captures. No fabricated reviews or self-awarded stars.
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}