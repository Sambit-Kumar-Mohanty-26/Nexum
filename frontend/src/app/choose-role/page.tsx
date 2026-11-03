"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, UserCheck, ArrowRight, ShieldCheck, Sparkles, Check } from "lucide-react";
import Logo from "@/components/Logo";

export default function ChooseRolePage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<"CLIENT" | "FREELANCER">("CLIENT");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirmRole = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to set role.");
      }

      if (selectedRole === "FREELANCER") {
        router.replace("/freelancer/dashboard");
      } else {
        router.replace("/client/dashboard");
      }
    } catch (err: any) {
      console.error("Role confirmation error:", err);
      setError(err.message || "An unexpected error occurred.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden text-slate-100 font-sans">
      {/* Background glow effects */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-xl rounded-3xl p-8 sm:p-10 shadow-2xl relative z-10">
        {/* Top Logo & Protocol Badge */}
        <div className="flex items-center justify-between mb-8">
          <Logo />
          <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-500/30 rounded-full text-indigo-400 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Google Verified Account</span>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
            Select Your Workspace Role
          </h1>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Choose your primary account type to personalize your verified dashboard and automated agreement tools.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center font-medium">
            {error}
          </div>
        )}

        {/* Role Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {/* Client Option */}
          <div
            onClick={() => setSelectedRole("CLIENT")}
            className={`cursor-pointer rounded-2xl p-5 border transition-all duration-200 relative flex flex-col justify-between ${
              selectedRole === "CLIENT"
                ? "bg-indigo-600/15 border-indigo-500 shadow-lg shadow-indigo-500/10"
                : "bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/70 hover:border-slate-600"
            }`}
          >
            {selectedRole === "CLIENT" && (
              <div className="absolute top-4 right-4 w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center">
                <Check className="w-3 h-3 stroke-[3]" />
              </div>
            )}
            <div>
              <div className="w-11 h-11 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
                <Briefcase className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-white text-base mb-1">Client / Buyer</h3>
              <p className="text-slate-400 text-xs leading-relaxed mb-4">
                Hire talent, post detailed projects, fund milestone escrows, and inspect deliverables with AI assistance.
              </p>
            </div>
            <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>Full Payment Escrow Control</span>
            </div>
          </div>

          {/* Freelancer Option */}
          <div
            onClick={() => setSelectedRole("FREELANCER")}
            className={`cursor-pointer rounded-2xl p-5 border transition-all duration-200 relative flex flex-col justify-between ${
              selectedRole === "FREELANCER"
                ? "bg-purple-600/15 border-purple-500 shadow-lg shadow-purple-500/10"
                : "bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/70 hover:border-slate-600"
            }`}
          >
            {selectedRole === "FREELANCER" && (
              <div className="absolute top-4 right-4 w-5 h-5 rounded-full bg-purple-500 text-white flex items-center justify-center">
                <Check className="w-3 h-3 stroke-[3]" />
              </div>
            )}
            <div>
              <div className="w-11 h-11 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-4">
                <UserCheck className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-white text-base mb-1">Freelancer / Talent</h3>
              <p className="text-slate-400 text-xs leading-relaxed mb-4">
                Browse verified client briefs, submit AI-assisted proposals, negotiate scopes, and receive guaranteed payouts.
              </p>
            </div>
            <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              <span>Bilateral Milestone Protection</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleConfirmRole}
          className="w-full h-12 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
        >
          {isSubmitting ? (
            <span>Provisioning Workspace...</span>
          ) : (
            <>
              <span>Continue as {selectedRole === "CLIENT" ? "Client" : "Freelancer"}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <p className="text-center text-slate-500 text-[11px] mt-4">
          Secured by Nexum Protocol · Canonical SHA-256 Consensus Engine
        </p>
      </div>
    </div>
  );
}

