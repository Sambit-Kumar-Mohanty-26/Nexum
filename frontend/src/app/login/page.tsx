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
  Clock,
  MapPin,
  Sparkles,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Zap,
  ShieldCheck,
  KeyRound,
} from "lucide-react";
import Logo from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import { DEMO_USERS } from "@/lib/auth-types";

type ViewMode = "credentials" | "personas";

export default function LoginPage() {
  const router = useRouter();
  const { user, loginAs, loginWithCredentials, logout } = useAuth();

  // Mode tab state
  const [viewMode, setViewMode] = useState<ViewMode>("credentials");

  // Form credentials state
  const [email, setEmail] = useState("alex.rivera@proofloop.demo");
  const [password, setPassword] = useState("demo1234");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Submission & loading state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activePersonaKey, setActivePersonaKey] = useState<"CLIENT" | "FREELANCER_A" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const client = DEMO_USERS.CLIENT;
  const freelancerA = DEMO_USERS.FREELANCER_A;
  const freelancerB = DEMO_USERS.FREELANCER_B;
  const freelancerC = DEMO_USERS.FREELANCER_C;

  // Handle quick-fill credentials into the form
  const handleQuickFill = (personaKey: "CLIENT" | "FREELANCER_A") => {
    const target = DEMO_USERS[personaKey];
    setEmail(target.email);
    setPassword("demo1234");
    setErrorMessage(null);
    setSuccessNotice(`Pre-filled with ${target.name} (${target.role === "CLIENT" ? "Buyer / Client" : "Seller / Freelancer"})`);
    setTimeout(() => setSuccessNotice(null), 3500);
  };

  // Submit standard email & password credentials
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);

    if (!email.trim()) {
      setErrorMessage("Please enter your email address.");
      return;
    }

    if (password.length < 4) {
      setErrorMessage("Password must be at least 4 characters long.");
      return;
    }

    setIsSubmitting(true);
    try {
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

  // 1-Click Persona Login
  const handleSelectAndLogin = async (key: "CLIENT" | "FREELANCER_A") => {
    setActivePersonaKey(key);
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessNotice(null);
    try {
      const ok = await loginAs(key);
      if (ok) {
        router.push("/");
      } else {
        setErrorMessage("Failed to establish session. Please try again.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
      setActivePersonaKey(null);
    }
  };

  return (
    <div className="min-h-screen bg-canvas selection:bg-cobalt/15 selection:text-cobalt">
      {/* ==============================================================
          1. TOP NAVIGATION / HEADER
         ============================================================== */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between px-6 lg:px-10">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 transition hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Overview</span>
            </Link>
            <div className="h-4 w-px bg-slate-200" />
            <Link href="/" className="flex items-center gap-2.5 transition hover:opacity-90">
              <Logo surface="light" />
              <span className="font-heading text-lg font-bold tracking-tight text-ink">nexum</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/90 bg-amber-50 px-3 py-1 text-[11px] font-mono font-medium text-amber-800">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              PayPal Sandbox v1.2
            </span>
          </div>
        </div>
      </header>

      {/* ==============================================================
          2. MAIN CONTENT AREA
         ============================================================== */}
      <main className="relative overflow-hidden pt-10 pb-20 lg:pt-14 lg:pb-28">
        {/* Subtle Background Layering */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(#CBD5E1_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
        <div className="absolute top-0 left-1/2 -z-10 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-b from-blue-100/50 via-indigo-50/20 to-transparent blur-3xl pointer-events-none" />

        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          {/* Header Introduction */}
          <div className="text-center max-w-2xl mx-auto mb-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white px-3 py-1 shadow-xs mb-3.5">
              <Sparkles className="h-3.5 w-3.5 text-cobalt" />
              <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-700">
                Phase 1 Verified Access · Dual Workspaces
              </span>
            </div>

            <h1 className="font-heading text-3xl sm:text-4xl lg:text-[40px] font-bold tracking-tight text-ink">
              Sign In to Nexum Protocol
            </h1>
            <p className="mt-2.5 text-sm sm:text-base text-slate-600 leading-relaxed font-sans">
              Enter your credentials to access your isolated workspace, review immutable PRDs, and participate in cryptographic consensus.
            </p>

            {/* Current Active User Status Bar if already logged in */}
            {user && (
              <div className="mt-4 inline-flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-2 text-xs text-emerald-900 shadow-xs">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>
                  Currently authenticated as <strong>{user.name}</strong> ({user.role}).{" "}
                  <Link href="/" className="font-semibold underline hover:text-emerald-950 ml-1">
                    Go to Workspace
                  </Link>
                  {" or "}
                  <button
                    onClick={() => logout()}
                    className="underline font-semibold hover:text-emerald-950 cursor-pointer"
                  >
                    log out
                  </button>
                  .
                </span>
              </div>
            )}

            {/* Alerts & Feedback */}
            {errorMessage && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-800 text-left flex items-start gap-2 shadow-xs">
                <Info className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successNotice && (
              <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-medium text-blue-800 text-left flex items-center gap-2 shadow-xs">
                <Zap className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                <span>{successNotice}</span>
              </div>
            )}
          </div>

          {/* Mode Switcher / Segmented Tabs */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200/80 shadow-xs">
              <button
                type="button"
                onClick={() => setViewMode("credentials")}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === "credentials"
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200/60"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <KeyRound className="h-3.5 w-3.5" />
                <span>Email & Password Login</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("personas")}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === "personas"
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200/60"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                <span>1-Click Persona Simulator</span>
              </button>
            </div>
          </div>

          {/* ==============================================================
              3. TAB 1: STANDARD CREDENTIALS FORM + QUICK FILL
             ============================================================== */}
          {viewMode === "credentials" && (
            <div className="max-w-xl mx-auto">
              <div className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-10 shadow-sm">
                
                {/* 1-Click Quick Fill Strip */}
                <div className="mb-7 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-blue-600" />
                      1-Click Fast Fill (Demo Personas)
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">Auto-populates inputs</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleQuickFill("CLIENT")}
                      className={`flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                        email === client.email
                          ? "bg-white border-cobalt ring-2 ring-cobalt/15 shadow-xs"
                          : "bg-white/80 border-slate-200 hover:bg-white hover:border-slate-300"
                      }`}
                    >
                      <Image
                        src={client.avatar}
                        alt={client.name}
                        width={32}
                        height={32}
                        className="h-8 w-8 rounded-lg object-cover ring-1 ring-slate-200"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-slate-900 truncate">
                          {client.name}
                        </div>
                        <div className="text-[10px] text-cobalt font-medium truncate">
                          Buyer · Client Role
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickFill("FREELANCER_A")}
                      className={`flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                        email === freelancerA.email
                          ? "bg-white border-emerald-600 ring-2 ring-emerald-500/15 shadow-xs"
                          : "bg-white/80 border-slate-200 hover:bg-white hover:border-slate-300"
                      }`}
                    >
                      <Image
                        src={freelancerA.avatar}
                        alt={freelancerA.name}
                        width={32}
                        height={32}
                        className="h-8 w-8 rounded-lg object-cover ring-1 ring-slate-200"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-slate-900 truncate">
                          {freelancerA.name}
                        </div>
                        <div className="text-[10px] text-emerald-700 font-medium truncate">
                          Seller · Freelancer A
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* The Authentication Form */}
                <form onSubmit={handleCredentialsSubmit} className="space-y-5">
                  {/* Email Field */}
                  <div>
                    <label
                      htmlFor="login-email"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Work or Persona Email
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                        <Mail className="h-4 w-4" />
                      </div>
                      <input
                        id="login-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="alex.rivera@proofloop.demo"
                        required
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-cobalt focus:bg-white focus:outline-none focus:ring-2 focus:ring-cobalt/20 transition"
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="login-password"
                        className="block text-xs font-semibold text-slate-700"
                      >
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setPassword("demo1234");
                          setSuccessNotice("Demo password filled (demo1234)");
                          setTimeout(() => setSuccessNotice(null), 3000);
                        }}
                        className="text-[11px] font-medium text-cobalt hover:underline cursor-pointer"
                      >
                        Use demo password
                      </button>
                    </div>

                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        required
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-10 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-cobalt focus:bg-white focus:outline-none focus:ring-2 focus:ring-cobalt/20 transition font-mono text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        title={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Options Row */}
                  <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-cobalt focus:ring-cobalt/20"
                      />
                      <span>Keep signed in for this session</span>
                    </label>

                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                      SHA-256 session
                    </span>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white shadow-xs transition hover:bg-slate-800 disabled:opacity-50 cursor-pointer mt-2"
                  >
                    {isSubmitting ? (
                      <span>Verifying & Establishing Session...</span>
                    ) : (
                      <>
                        <span>Sign In to Workspace</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* Direct 1-Click Launch Alternative */}
                <div className="mt-8 pt-6 border-t border-slate-100">
                  <div className="text-center mb-4">
                    <span className="text-xs text-slate-400 font-medium">
                      Or bypass credentials with instant 1-click launch:
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleSelectAndLogin("CLIENT")}
                      disabled={isSubmitting}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-cobalt/30 bg-cobalt/5 px-4 text-xs font-semibold text-cobalt hover:bg-cobalt hover:text-white transition disabled:opacity-50 cursor-pointer"
                    >
                      <Building2 className="h-3.5 w-3.5" />
                      <span>Launch Alex (Client)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectAndLogin("FREELANCER_A")}
                      disabled={isSubmitting}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 text-xs font-semibold text-emerald-800 hover:bg-slate-900 hover:text-white transition disabled:opacity-50 cursor-pointer"
                    >
                      <Code2 className="h-3.5 w-3.5" />
                      <span>Launch Rohan (Freelancer)</span>
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ==============================================================
              4. TAB 2: RICH BILATERAL PERSONA SELECTOR CARDS
             ============================================================== */}
          {viewMode === "personas" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
              {/* ---------------- CARD 1: CLIENT ---------------- */}
              <div
                className={`group relative flex flex-col justify-between rounded-3xl border transition-all duration-300 p-8 bg-white ${
                  activePersonaKey === "CLIENT"
                    ? "border-cobalt ring-2 ring-cobalt/20 shadow-xl shadow-cobalt/5"
                    : "border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-md"
                }`}
              >
                <div>
                  {/* Header Tag */}
                  <div className="flex items-center justify-between gap-3 mb-6">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-cobalt/20 bg-cobalt/10 px-3 py-1 text-xs font-mono font-semibold uppercase tracking-wider text-cobalt">
                      <Building2 className="h-3.5 w-3.5" />
                      Buyer · Client Role
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">ID: {client.id}</span>
                  </div>

                  {/* Profile Header */}
                  <div className="flex items-center gap-4 mb-6">
                    <Image
                      src={client.avatar}
                      alt={client.name}
                      width={64}
                      height={64}
                      className="h-16 w-16 rounded-2xl object-cover ring-2 ring-slate-100"
                    />
                    <div>
                      <h2 className="font-heading text-xl font-bold text-ink">{client.name}</h2>
                      <p className="text-xs font-medium text-slate-500">{client.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{client.companyOrHandle}</p>
                    </div>
                  </div>

                  {/* Metadata Pills */}
                  <div className="grid grid-cols-2 gap-2 text-xs mb-6 font-sans">
                    <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                      <span className="text-[11px] text-slate-400 block mb-0.5">Location</span>
                      <span className="font-medium text-slate-700 flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        {client.location}
                      </span>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                      <span className="text-[11px] text-slate-400 block mb-0.5">Stated Budget Ceiling</span>
                      <span className="font-mono font-semibold text-slate-900">$4,500.00 USD</span>
                    </div>
                  </div>

                  {/* Capabilities List */}
                  <div className="space-y-2.5 mb-8 text-xs text-slate-600">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-cobalt shrink-0 mt-0.5" />
                      <span>Run AI Intake Assistant to turn rough ideas into testable PRDs</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-cobalt shrink-0 mt-0.5" />
                      <span>Consent-aware firewall: toggle exact fields shared with talent</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-cobalt shrink-0 mt-0.5" />
                      <span>Fund milestone 1 through PayPal Sandbox Orders v2 checkout</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-cobalt shrink-0 mt-0.5" />
                      <span>Inspect cryptographic SHA-256 agreement seal</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => handleSelectAndLogin("CLIENT")}
                    disabled={isSubmitting}
                    className="w-full inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-cobalt px-6 text-sm font-semibold text-white shadow-xs transition hover:bg-cobalt-hover disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting && activePersonaKey === "CLIENT" ? (
                      <span>Authenticating...</span>
                    ) : (
                      <>
                        <span>Enter as Alex Rivera (Client)</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleQuickFill("CLIENT");
                      setViewMode("credentials");
                    }}
                    className="w-full text-center text-xs text-slate-500 hover:text-slate-900 py-1 transition cursor-pointer"
                  >
                    Load into credentials form →
                  </button>
                </div>
              </div>

              {/* ---------------- CARD 2: FREELANCER A ---------------- */}
              <div
                className={`group relative flex flex-col justify-between rounded-3xl border transition-all duration-300 p-8 bg-white ${
                  activePersonaKey === "FREELANCER_A"
                    ? "border-emerald-600 ring-2 ring-emerald-600/20 shadow-xl shadow-emerald-500/5"
                    : "border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-md"
                }`}
              >
                <div>
                  {/* Header Tag */}
                  <div className="flex items-center justify-between gap-3 mb-6">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-mono font-semibold uppercase tracking-wider text-emerald-800">
                      <Code2 className="h-3.5 w-3.5" />
                      Seller · Freelancer A Role
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">ID: {freelancerA.id}</span>
                  </div>

                  {/* Profile Header */}
                  <div className="flex items-center gap-4 mb-6">
                    <Image
                      src={freelancerA.avatar}
                      alt={freelancerA.name}
                      width={64}
                      height={64}
                      className="h-16 w-16 rounded-2xl object-cover ring-2 ring-slate-100"
                    />
                    <div>
                      <h2 className="font-heading text-xl font-bold text-ink">{freelancerA.name}</h2>
                      <p className="text-xs font-medium text-slate-500">{freelancerA.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{freelancerA.companyOrHandle}</p>
                    </div>
                  </div>

                  {/* Metadata Pills */}
                  <div className="grid grid-cols-2 gap-2 text-xs mb-6 font-sans">
                    <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                      <span className="text-[11px] text-slate-400 block mb-0.5">Location & Timezone</span>
                      <span className="font-medium text-slate-700 flex items-center gap-1">
                        <Clock className="h-3 w-3 text-slate-400" />
                        {freelancerA.location}
                      </span>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                      <span className="text-[11px] text-slate-400 block mb-0.5">Rate Preference</span>
                      <span className="font-mono font-semibold text-slate-900">$65.00 USD / hr</span>
                    </div>
                  </div>

                  {/* Capabilities List */}
                  <div className="space-y-2.5 mb-8 text-xs text-slate-600">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>Review authorized brief (without client private budget leaks)</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>Submit structured milestone pricing proposals & counteroffers</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>Execute dual cryptographic sign-off on canonical JSON</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>Track simulated ledger releases upon milestone acceptance</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => handleSelectAndLogin("FREELANCER_A")}
                    disabled={isSubmitting}
                    className="w-full inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white shadow-xs transition hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting && activePersonaKey === "FREELANCER_A" ? (
                      <span>Authenticating...</span>
                    ) : (
                      <>
                        <span>Enter as Rohan Verma (Freelancer A)</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleQuickFill("FREELANCER_A");
                      setViewMode("credentials");
                    }}
                    className="w-full text-center text-xs text-slate-500 hover:text-slate-900 py-1 transition cursor-pointer"
                  >
                    Load into credentials form →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ==========================================================
              5. SEEDED CANDIDATE PROFILES (B & C) NOTE
             ========================================================== */}
          <div className="mt-12 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs max-w-4xl mx-auto">
            <div className="flex items-start gap-3.5">
              <div className="rounded-lg bg-slate-100 p-2 text-slate-600 shrink-0">
                <Info className="h-5 w-5" />
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <h3 className="font-heading text-sm font-bold text-slate-900">
                    Seeded Matching Candidates (Read-Only Profiles)
                  </h3>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-600 font-medium">
                    FR-04 Compliance
                  </span>
                </div>
                <p className="text-slate-500 leading-relaxed font-sans">
                  In accordance with the Phase 1 specification, candidate profiles <strong>{freelancerB.name}</strong> ({freelancerB.title}) and <strong>{freelancerC.name}</strong> ({freelancerC.title}) are seeded in PostgreSQL for algorithmic discovery and explainable matching. They do not possess demo login privileges to keep the evaluation vertical slice cleanly focused on the Client ↔ Freelancer A bilateral agreement loop.
                </p>
              </div>
            </div>
          </div>

          {/* ==========================================================
              6. FOOTER TRUTHFULNESS & RECOVERY NOTICE
             ========================================================== */}
          <div className="mt-8 text-center text-xs text-slate-400 font-mono">
            <span>Nexum Protocol · Reconcile-Before-Retry Engine · Isolated AI Workspaces</span>
          </div>
        </div>
      </main>
    </div>
  );
}
