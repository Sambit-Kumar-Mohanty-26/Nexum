"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Building2,
  Code2,
  ArrowRight,
  Info,
  Sparkles,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Check,
  Zap,
  Layers,
  FileCode2,
  ExternalLink,
} from "lucide-react";
import Logo from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import { DEMO_USERS } from "@/lib/auth-types";

export default function LoginPage() {
  const router = useRouter();
  const { user, loginAs, loginWithCredentials, logout } = useAuth();

  // Selected persona state ("CLIENT" | "FREELANCER_A" | "CUSTOM")
  const [selectedPersona, setSelectedPersona] = useState<"CLIENT" | "FREELANCER_A" | "CUSTOM">("CLIENT");

  // Credentials state
  const [email, setEmail] = useState("alex.rivera@proofloop.demo");
  const [password, setPassword] = useState("demo1234");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const client = DEMO_USERS.CLIENT;
  const freelancerA = DEMO_USERS.FREELANCER_A;
  const freelancerB = DEMO_USERS.FREELANCER_B;
  const freelancerC = DEMO_USERS.FREELANCER_C;

  // Handle persona selection
  const handleSelectPersona = (key: "CLIENT" | "FREELANCER_A") => {
    setSelectedPersona(key);
    const target = DEMO_USERS[key];
    setEmail(target.email);
    setPassword("demo1234");
    setErrorMessage(null);
  };

  // Handle custom input typing
  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (val.trim().toLowerCase() === client.email.toLowerCase()) {
      setSelectedPersona("CLIENT");
    } else if (val.trim().toLowerCase() === freelancerA.email.toLowerCase()) {
      setSelectedPersona("FREELANCER_A");
    } else {
      setSelectedPersona("CUSTOM");
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage("Please enter a valid work email address.");
      return;
    }

    if (password.length < 4) {
      setErrorMessage("Password must be at least 4 characters long.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (selectedPersona === "CLIENT" && email.trim() === client.email) {
        const ok = await loginAs("CLIENT");
        if (ok) return router.push("/");
      } else if (selectedPersona === "FREELANCER_A" && email.trim() === freelancerA.email) {
        const ok = await loginAs("FREELANCER_A");
        if (ok) return router.push("/");
      }

      const result = await loginWithCredentials(email.trim(), password);
      if (result.success) {
        router.push("/");
      } else {
        setErrorMessage(result.error || "Authentication failed. Please verify credentials.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 selection:bg-cobalt/15 selection:text-cobalt flex flex-col justify-between relative overflow-hidden">
      
      {/* ==============================================================
          BACKGROUND ATMOSPHERE: SUBTLE PINSTRIPES & RADIAL GLOWS
         ============================================================== */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(#E2E8F0_1px,transparent_1px)] [background-size:28px_28px] opacity-70" />
      <div className="pointer-events-none absolute top-[-100px] left-1/2 -z-10 h-[600px] w-[1000px] -translate-x-1/2 rounded-full bg-gradient-to-b from-blue-100/50 via-indigo-50/20 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-150px] right-[-100px] -z-10 h-[500px] w-[600px] rounded-full bg-emerald-50/40 blur-3xl" />

      {/* ==============================================================
          1. HEADER NAVIGATION
         ============================================================== */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/70 bg-white/80 backdrop-blur-md transition-all">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6 lg:px-12">
          
          {/* Left: Back Link & Logo */}
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="group inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100/70 hover:text-slate-900"
            >
              <ArrowLeft className="h-3.5 w-3.5 transition group-hover:-translate-x-0.5" />
              <span>Overview</span>
            </Link>
            
            <div className="h-4 w-px bg-slate-200" />
            
            <Link href="/" className="flex items-center gap-2.5 transition hover:opacity-90">
              <Logo surface="light" className="h-6 w-6" />
              <span className="font-heading text-lg font-bold tracking-tight text-ink">nexum</span>
            </Link>
          </div>

          {/* Right: Live Protocol Status Telemetry */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/90 px-3 py-1 text-[11px] font-mono font-medium text-emerald-900 shadow-2xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="hidden sm:inline">Consensus Node:</span>
              <span className="font-semibold">Live</span>
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/90 bg-amber-50/80 px-3 py-1 text-[11px] font-mono font-medium text-amber-800 shadow-2xs">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span>PayPal Sandbox v1.2</span>
            </div>
          </div>

        </div>
      </header>

      {/* ==============================================================
          2. MAIN EXECUTIVE SUITE: SPLIT VAULT (CARD)
         ============================================================== */}
      <main className="flex-1 flex items-center justify-center py-8 lg:py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-5xl">
          
          {/* Main Vault Outer Container */}
          <div className="rounded-3xl border border-slate-200/90 bg-white shadow-[0_12px_40px_-8px_rgba(15,23,42,0.08),0_2px_4px_rgba(15,23,42,0.02)] overflow-hidden grid grid-cols-1 lg:grid-cols-12">
            
            {/* ==========================================================
                LEFT CHAMBER: INTERACTIVE AUTH & WORKSPACE LAUNCHER (7 Cols)
               ========================================================== */}
            <div className="lg:col-span-7 p-7 sm:p-10 flex flex-col justify-between">
              <div>
                
                {/* Vault Title & Spec Badge */}
                <div className="mb-6">
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-mono text-[11px] font-semibold text-slate-700 mb-3 shadow-2xs">
                    <Sparkles className="h-3.5 w-3.5 text-cobalt" />
                    <span>Phase 1 Verification Chamber</span>
                  </div>

                  <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-[-0.025em] text-ink">
                    Sign In to Workspace
                  </h1>
                  <p className="mt-1.5 text-xs sm:text-sm text-slate-500 leading-relaxed font-sans">
                    Access your isolated bilateral workspace. Select a verified persona below or authenticate with credentials.
                  </p>
                </div>

                {/* Active Session Notification */}
                {user && (
                  <div className="mb-6 flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-950 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>
                        Active session: <strong>{user.name}</strong> ({user.role})
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Link href="/" className="font-semibold underline hover:text-emerald-900">
                        Enter Workspace
                      </Link>
                      <button
                        type="button"
                        onClick={() => logout()}
                        className="text-emerald-700 hover:text-emerald-900 underline font-medium cursor-pointer"
                      >
                        Log out
                      </button>
                    </div>
                  </div>
                )}

                {/* Error Banner */}
                {errorMessage && (
                  <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50/80 p-3.5 text-xs font-medium text-rose-800 flex items-start gap-2.5 shadow-2xs">
                    <Info className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{errorMessage}</span>
                  </div>
                )}

                {/* ======================================================
                    STAGE 1: TWIN EXECUTIVE IDENTITY CARDS
                   ====================================================== */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-cobalt" />
                      <span>Select Operating Identity</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">1-Click Fast Switch</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    
                    {/* Persona 1: Alex Rivera (Client) */}
                    <div
                      onClick={() => handleSelectPersona("CLIENT")}
                      role="button"
                      tabIndex={0}
                      className={`group relative flex flex-col justify-between p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer select-none text-left ${
                        selectedPersona === "CLIENT"
                          ? "border-cobalt bg-gradient-to-b from-blue-50/50 to-white ring-2 ring-cobalt/20 shadow-md shadow-cobalt/5"
                          : "border-slate-200 bg-slate-50/40 hover:bg-white hover:border-slate-300 hover:shadow-xs"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Image
                          src={client.avatar}
                          alt={client.name}
                          width={42}
                          height={42}
                          className="h-10 w-10 rounded-xl object-cover ring-2 ring-white shrink-0 shadow-2xs"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-heading text-xs font-bold text-ink truncate">
                              {client.name}
                            </span>
                            {selectedPersona === "CLIENT" && (
                              <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-cobalt text-white">
                                <Check className="h-2 w-2" />
                              </span>
                            )}
                          </div>
                          <div className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-cobalt mt-0.5">
                            <Building2 className="h-3 w-3" />
                            <span>Client / Buyer</span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate mt-0.5">
                            {client.companyOrHandle}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-200/70 flex items-center justify-between text-[10px] font-mono">
                        <span className="text-slate-400">Budget Ceiling:</span>
                        <span className="font-bold text-slate-900">$4,500.00 USD</span>
                      </div>
                    </div>

                    {/* Persona 2: Rohan Verma (Freelancer A) */}
                    <div
                      onClick={() => handleSelectPersona("FREELANCER_A")}
                      role="button"
                      tabIndex={0}
                      className={`group relative flex flex-col justify-between p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer select-none text-left ${
                        selectedPersona === "FREELANCER_A"
                          ? "border-emerald-600 bg-gradient-to-b from-emerald-50/50 to-white ring-2 ring-emerald-500/20 shadow-md shadow-emerald-500/5"
                          : "border-slate-200 bg-slate-50/40 hover:bg-white hover:border-slate-300 hover:shadow-xs"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Image
                          src={freelancerA.avatar}
                          alt={freelancerA.name}
                          width={42}
                          height={42}
                          className="h-10 w-10 rounded-xl object-cover ring-2 ring-white shrink-0 shadow-2xs"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-heading text-xs font-bold text-ink truncate">
                              {freelancerA.name}
                            </span>
                            {selectedPersona === "FREELANCER_A" && (
                              <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-600 text-white">
                                <Check className="h-2 w-2" />
                              </span>
                            )}
                          </div>
                          <div className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-emerald-800 mt-0.5">
                            <Code2 className="h-3 w-3" />
                            <span>Freelancer A</span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate mt-0.5">
                            PayPal Sandbox L3
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-200/70 flex items-center justify-between text-[10px] font-mono">
                        <span className="text-slate-400">Rate Preference:</span>
                        <span className="font-bold text-slate-900">$65.00 / hr</span>
                      </div>
                    </div>

                  </div>
                </div>

                {/* ======================================================
                    STAGE 2: CREDENTIALS INPUT SECTION
                   ====================================================== */}
                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200/70" />
                  </div>
                  <div className="relative flex justify-center text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    <span className="bg-white px-2.5">Credentials Verification</span>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3.5">
                  
                  {/* Email Input */}
                  <div>
                    <label
                      htmlFor="user-email"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <Mail className="h-3.5 w-3.5" />
                      </div>
                      <input
                        id="user-email"
                        type="email"
                        value={email}
                        onChange={(e) => handleEmailChange(e.target.value)}
                        placeholder="alex.rivera@proofloop.demo"
                        required
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/40 pl-9 pr-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-cobalt focus:bg-white focus:outline-none focus:ring-2 focus:ring-cobalt/20 transition font-sans"
                      />
                    </div>
                  </div>

                  {/* Password Input */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label
                        htmlFor="user-password"
                        className="block text-xs font-semibold text-slate-700"
                      >
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setPassword("demo1234")}
                        className="text-[10px] font-mono text-cobalt hover:underline cursor-pointer"
                      >
                        Quick-fill key (demo1234)
                      </button>
                    </div>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <Lock className="h-3.5 w-3.5" />
                      </div>
                      <input
                        id="user-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        required
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/40 pl-9 pr-9 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-cobalt focus:bg-white focus:outline-none focus:ring-2 focus:ring-cobalt/20 transition font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                        title={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Options Row */}
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-0.5">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-[11px]">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-slate-300 text-cobalt focus:ring-cobalt/20"
                      />
                      <span>Stay authenticated</span>
                    </label>

                    <div className="flex items-center gap-1 font-mono text-[10px] text-slate-400">
                      <ShieldCheck className="h-3 w-3 text-emerald-600" />
                      <span>Dual SHA-256</span>
                    </div>
                  </div>

                  {/* Primary Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-xs font-semibold text-white shadow-xs transition hover:bg-slate-800 disabled:opacity-50 cursor-pointer mt-2 group"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        <span>Establishing Verified Session...</span>
                      </span>
                    ) : (
                      <>
                        <span>
                          {selectedPersona === "CLIENT"
                            ? `Enter Workspace as Alex Rivera (Client)`
                            : selectedPersona === "FREELANCER_A"
                            ? `Enter Workspace as Rohan Verma (Freelancer)`
                            : `Sign In with Credentials`}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                      </>
                    )}
                  </button>

                </form>
              </div>

              {/* Legal Notice */}
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>ProofLoop v1.2 Protocol</span>
                <span>OECD Paper 167</span>
              </div>
            </div>

            {/* ==========================================================
                RIGHT CHAMBER: DARK EDITORIAL PROTOCOL LEDGER (5 Cols)
               ========================================================== */}
            <div className="lg:col-span-5 bg-[#0A0E17] text-white p-7 sm:p-9 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-slate-800 relative overflow-hidden">
              
              {/* Ambient Terminal Glows */}
              <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-blue-600/15 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-emerald-500/15 blur-3xl" />

              <div>
                {/* Terminal Header Chrome */}
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-300">
                      Bilateral Consensus Rails
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-500">v1.2 Spec</span>
                </div>

                {/* Live Protocol Pipeline States */}
                <div className="mt-6 space-y-3">
                  
                  {/* Step 1: AI Intake */}
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 transition hover:bg-white/[0.05]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[11px] font-bold text-white flex items-center gap-1.5">
                        <FileCode2 className="h-3.5 w-3.5 text-blue-400" />
                        AI Intake & PRD Hash
                      </span>
                      <span className="font-mono text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded border border-blue-400/20">
                        SHA-256
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                      Prompts synthesized into structured milestones with private client budget protection.
                    </p>
                  </div>

                  {/* Step 2: Dual Consensus */}
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 transition hover:bg-white/[0.05]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[11px] font-bold text-white flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5 text-emerald-400" />
                        Dual Cryptographic Sign-Off
                      </span>
                      <span className="font-mono text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-400/20">
                        LOCKED
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                      Both parties approve canonical JSON. Agreements lock before code begins.
                    </p>
                  </div>

                  {/* Step 3: PayPal Settlement */}
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 transition hover:bg-white/[0.05]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[11px] font-bold text-white flex items-center gap-1.5">
                        <Zap className="h-3.5 w-3.5 text-amber-400" />
                        PayPal Orders v2 Escrow
                      </span>
                      <span className="font-mono text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-400/20">
                        Orders v2
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                      Milestone reservations settled with idempotency keys and state reconciliation.
                    </p>
                  </div>

                </div>

                {/* Seeded Candidate Discovery Note */}
                <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-[11px]">
                  <div className="flex items-center justify-between text-slate-400 font-mono text-[10px] mb-1">
                    <span>SEEDED MATCHING CANDIDATES</span>
                    <span className="text-slate-500">FR-04 Compliance</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed text-[10px]">
                    Profiles <span className="text-slate-200">{freelancerB.name}</span> and <span className="text-slate-200">{freelancerC.name}</span> are seeded in PostgreSQL for algorithmic discovery and explainable matching.
                  </p>
                </div>
              </div>

              {/* Protocol Thesis Quote */}
              <div className="pt-4 mt-4 border-t border-white/10">
                <p className="text-[11px] text-slate-400 font-mono italic leading-relaxed">
                  &ldquo;AI drafts, humans approve, PayPal proves.&rdquo;
                </p>
              </div>

            </div>

          </div>

        </div>
      </main>

      {/* ==============================================================
          3. MINIMAL FOOTER
         ============================================================== */}
      <footer className="py-4 border-t border-slate-200/60 bg-white/70 text-center font-mono text-[11px] text-slate-400">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Nexum Protocol · Reconcile-Before-Retry Engine</span>
          <div className="flex items-center gap-3 text-slate-500">
            <Link href="#spec" className="hover:text-slate-900 transition flex items-center gap-1">
              <span>Architecture Spec v1.2</span>
              <ExternalLink className="h-3 w-3 text-slate-400" />
            </Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
