"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Zap,
  RotateCcw,
} from "lucide-react";

type SimState = "IDLE" | "TIMEOUT" | "RECONCILING" | "CAPTURED";

export default function FailureSimulator() {
  const [simState, setSimState] = useState<SimState>("IDLE");
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Bidirectional Viewport Observer (Cinematic entrance on scroll)
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  // Run the state machine simulation
  const runSimulation = () => {
    setSimState("TIMEOUT");

    setTimeout(() => {
      setSimState("RECONCILING");
    }, 1200);

    setTimeout(() => {
      setSimState("CAPTURED");
    }, 2800);
  };

  const resetSimulation = () => {
    setSimState("IDLE");
  };

  return (
    <section
      ref={sectionRef}
      id="recovery"
      className="relative w-full bg-[#FAF9F6] py-20 sm:py-28 border-b border-slate-200/80 overflow-hidden"
    >
      <div className="mx-auto max-w-[1440px] px-6 lg:px-12">
        
        {/* ==============================================================
            HEADER: Cinematic Entrance
           ============================================================== */}
        <div
          className="max-w-2xl mb-14"
          style={{
            transition: "opacity 0.85s cubic-bezier(0.16, 1, 0.3, 1), transform 0.85s cubic-bezier(0.16, 1, 0.3, 1), filter 0.85s cubic-bezier(0.16, 1, 0.3, 1)",
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateY(0px)" : "translateY(20px)",
            filter: isVisible ? "blur(0px)" : "blur(8px)",
          }}
        >
          <span className="font-mono text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3 block">
            Section 16 Invariant
          </span>
          <h2 className="font-heading text-3xl sm:text-5xl font-bold tracking-[-0.035em] text-slate-900 leading-[1.12]">
            A network timeout is not proof that payment failed.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-500 font-normal leading-relaxed">
            Marketplaces blindly prompt buyers to &quot;Try Again&quot; on HTTP drops, triggering double charges. Nexum transitions to <strong className="font-mono text-slate-800">UNKNOWN</strong> and reconciles idempotently before retrying.
          </p>
        </div>

        {/* ==============================================================
            INTERACTIVE STATE MACHINE INSTRUMENT (SaaS Quality Copy)
           ============================================================== */}
        <div
          className="rounded-2xl border border-slate-200 bg-white p-7 sm:p-9 shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
          style={{
            transition: "opacity 0.85s cubic-bezier(0.16, 1, 0.3, 1), transform 0.85s cubic-bezier(0.16, 1, 0.3, 1), filter 0.85s cubic-bezier(0.16, 1, 0.3, 1)",
            transitionDelay: isVisible ? "150ms" : "0ms",
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateY(0px)" : "translateY(30px)",
            filter: isVisible ? "blur(0px)" : "blur(10px)",
          }}
        >
          {/* Instrument Top Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div className="space-y-1">
              <span className="font-mono text-[10px] tracking-wider uppercase text-slate-400 font-semibold block">
                Execution Safety Engine
              </span>
              <h3 className="font-heading text-lg font-bold text-slate-900">
                Deterministic Settlement Lifecycle
              </h3>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {simState === "IDLE" ? (
                <button
                  onClick={runSimulation}
                  className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition cursor-pointer"
                >
                  <Zap className="h-3.5 w-3.5 text-slate-300" />
                  <span>Simulate Network Failure</span>
                </button>
              ) : (
                <button
                  onClick={resetSimulation}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
                  <span>Reset Simulation</span>
                </button>
              )}
            </div>
          </div>

          {/* 4-Step Interactive Pipeline Track (SaaS Microcopy) */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Step 1: Pre-Flight Lock */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-2">
                  <span>01 / INITIATE</span>
                  <span className="font-bold text-slate-700">PRE-FLIGHT</span>
                </div>
                <h4 className="font-heading text-sm font-bold text-slate-900">Cryptographic Lock</h4>
                <p className="mt-1.5 text-xs text-slate-500 font-sans leading-relaxed">
                  Idempotency key <code>req_98bfa2</code> locks contract state before calling payment rails.
                </p>
              </div>
              <div className="mt-4 pt-2.5 border-t border-slate-200/60 font-mono text-[10px] text-slate-500 flex items-center justify-between">
                <span>State: Locked</span>
                <span className="text-slate-700 font-medium">$1,200.00</span>
              </div>
            </div>

            {/* Step 2: Timeout Intercepted */}
            <div
              className={`rounded-xl border p-4 flex flex-col justify-between transition-all duration-300 ${
                simState !== "IDLE"
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-slate-50/70 text-slate-400"
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-[10px] font-mono mb-2">
                  <span>02 / INTERCEPT</span>
                  <span className={simState !== "IDLE" ? "text-slate-300 font-bold" : "text-slate-400"}>DROPPED</span>
                </div>
                <h4 className={`font-heading text-sm font-bold ${simState !== "IDLE" ? "text-white" : "text-slate-600"}`}>
                  Network Intercept
                </h4>
                <p className={`mt-1.5 text-xs font-sans leading-relaxed ${simState !== "IDLE" ? "text-slate-300" : "text-slate-400"}`}>
                  Connection severed in transit. Client UI halts duplicate billing attempts immediately.
                </p>
              </div>
              <div className="mt-4 pt-2.5 border-t border-white/10 font-mono text-[10px] flex items-center justify-between">
                <span>{simState !== "IDLE" ? "Double Charge Blocked" : "Safety Armed"}</span>
                <span>0 Retries</span>
              </div>
            </div>

            {/* Step 3: UNKNOWN State */}
            <div
              className={`rounded-xl border p-4 flex flex-col justify-between transition-all duration-300 ${
                simState === "TIMEOUT" || simState === "RECONCILING" || simState === "CAPTURED"
                  ? "border-slate-200 bg-slate-50/70"
                  : "border-slate-200 bg-slate-50/30 text-slate-400"
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-2">
                  <span>03 / RECONCILE</span>
                  <span className="font-bold text-slate-900">ISOLATION</span>
                </div>
                <h4 className="font-heading text-sm font-bold text-slate-900">Automated Invariant</h4>
                <p className="mt-1.5 text-xs text-slate-500 font-sans leading-relaxed">
                  Status shifts to <strong>UNKNOWN</strong>. Daemon enqueues idempotent status check with provider.
                </p>
              </div>
              <div className="mt-4 pt-2.5 border-t border-slate-200/60 font-mono text-[10px] text-slate-700 flex items-center justify-between">
                <span>{simState !== "IDLE" ? "Worker Polling" : "Standby"}</span>
                <span>Idempotent</span>
              </div>
            </div>

            {/* Step 4: Reconciled */}
            <div
              className={`rounded-xl border p-4 flex flex-col justify-between transition-all duration-300 ${
                simState === "CAPTURED"
                  ? "border-slate-900 bg-white shadow-xs"
                  : "border-slate-200 bg-slate-50/30 text-slate-400"
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-2">
                  <span>04 / SETTLE</span>
                  <span className={simState === "CAPTURED" ? "font-bold text-slate-900" : ""}>CONFIRMED</span>
                </div>
                <h4 className="font-heading text-sm font-bold text-slate-900">Verified Settlement</h4>
                <p className="mt-1.5 text-xs text-slate-500 font-sans leading-relaxed">
                  HMAC webhook signature verified. Milestone transitions to paid with zero duplicates.
                </p>
              </div>
              <div className="mt-4 pt-2.5 border-t border-slate-200/60 font-mono text-[10px] text-slate-900 font-semibold flex items-center justify-between">
                <span>{simState === "CAPTURED" ? "Status: CAPTURED" : "Enqueued"}</span>
                <span>0 Duplicates</span>
              </div>
            </div>

          </div>

          {/* Live Dynamic Status Console Bar */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${simState === "IDLE" ? "bg-slate-300" : simState === "CAPTURED" ? "bg-slate-900" : "bg-slate-600 animate-pulse"}`} />
              <span className="text-slate-500">PROTOCOL STATUS:</span>
              <span className="font-bold text-slate-900">
                {simState === "IDLE" && "READY (MONITORING ACTIVE)"}
                {simState === "TIMEOUT" && "CONNECTION DROPPED • RECOVERY ENQUEUED"}
                {simState === "RECONCILING" && "VERIFYING PROVIDER STATUS VIA HMAC..."}
                {simState === "CAPTURED" && "SETTLED • 100% RECONCILED WITH ZERO DUPLICATES"}
              </span>
            </div>

            <div className="text-slate-400 text-[11px]">
              <span>Key: <code>req_98bfa2</code> • Rail: PayPal Orders v2</span>
            </div>
          </div>

        </div>

        {/* ==============================================================
            ATTIO-STYLE 4-METRIC RELIABILITY BAR
           ============================================================== */}
        <div
          className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-8 pt-10 border-t border-slate-200/70"
          style={{
            transition: "opacity 0.85s cubic-bezier(0.16, 1, 0.3, 1), transform 0.85s cubic-bezier(0.16, 1, 0.3, 1)",
            transitionDelay: isVisible ? "300ms" : "0ms",
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateY(0px)" : "translateY(24px)",
          }}
        >
          <div>
            <div className="font-heading text-4xl sm:text-5xl font-bold tracking-tight text-slate-900">
              0
            </div>
            <div className="font-heading text-xs font-bold text-slate-900 uppercase tracking-wider mt-1.5">
              Duplicate Retries
            </div>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed font-sans">
              Strict server-side idempotency stops duplicate card charges.
            </p>
          </div>

          <div>
            <div className="font-heading text-4xl sm:text-5xl font-bold tracking-tight text-slate-900">
              100%
            </div>
            <div className="font-heading text-xs font-bold text-slate-900 uppercase tracking-wider mt-1.5">
              Webhook Verification
            </div>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed font-sans">
              Every PayPal event is cryptographically validated via HMAC-SHA256.
            </p>
          </div>

          <div>
            <div className="font-heading text-4xl sm:text-5xl font-bold tracking-tight text-slate-900">
              &lt; 420ms
            </div>
            <div className="font-heading text-xs font-bold text-slate-900 uppercase tracking-wider mt-1.5">
              Reconciliation
            </div>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed font-sans">
              Automated background daemon checks status without buyer friction.
            </p>
          </div>

          <div>
            <div className="font-heading text-4xl sm:text-5xl font-bold tracking-tight text-slate-900">
              0%
            </div>
            <div className="font-heading text-xs font-bold text-slate-900 uppercase tracking-wider mt-1.5">
              False Escrow Claims
            </div>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed font-sans">
              Full OECD Paper 167 compliance. Capture is never disguised as settled bank credit.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}