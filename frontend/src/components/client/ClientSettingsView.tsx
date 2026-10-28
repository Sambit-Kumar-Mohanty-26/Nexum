"use client";

import React, { useState } from "react";
import Image from "next/image";
import { ShieldCheck, CreditCard, CheckCircle2, User } from "lucide-react";
import { DemoUser } from "@/lib/auth-types";

interface ClientSettingsViewProps {
  client: DemoUser;
}

export default function ClientSettingsView({ client }: ClientSettingsViewProps) {
  const [name, setName] = useState(client.name);
  const [company, setCompany] = useState(client.companyOrHandle);
  const [timezone, setTimezone] = useState(client.timezone);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(!msg ? null : msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    showToast("Profile preferences updated successfully.");
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
          Client Workspace Settings & Profile
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Manage your verified merchant profile, consensus identity, and PayPal payment rails credentials.
        </p>
      </div>

      {toast && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* 1. Personal & Company Profile */}
      <section className="p-6 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-5">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
          <User className="w-4 h-4 text-blue-600" />
          <h3 className="font-bold text-slate-900 text-sm">Merchant Identity & Organization</h3>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-slate-200 shadow-xs shrink-0">
            <Image
              src={client.avatar}
              alt={client.name}
              width={64}
              height={64}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-slate-900 text-base">{name}</h4>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200">
                Verified US Merchant
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {client.email} · Account ID: <code className="font-mono text-slate-600">{client.id}</code>
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Company / Legal Entity</label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Timezone</label>
            <input
              type="text"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Registered Location</label>
            <input
              type="text"
              value={client.location}
              disabled
              className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-100 text-xs text-slate-500 cursor-not-allowed font-medium"
            />
          </div>

          <div className="sm:col-span-2 flex justify-end pt-2">
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-xs cursor-pointer"
            >
              Save Profile Changes
            </button>
          </div>
        </form>
      </section>

      {/* 2. PayPal Sandbox Integration */}
      <section className="p-6 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <CreditCard className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-sm">PayPal Sandbox REST API v2</h3>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Connected & Active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] uppercase font-bold text-slate-400">Environment</div>
            <div className="font-bold text-slate-900 text-xs mt-1">PayPal Sandbox (Test Network)</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] uppercase font-bold text-slate-400">Sandbox Client ID</div>
            <div className="font-bold text-slate-900 text-xs mt-1">sb-client-***261C</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] uppercase font-bold text-slate-400">Payment Capture Mode</div>
            <div className="font-bold text-slate-900 text-xs mt-1">CAPTURE (Pre-Funded Milestone)</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] uppercase font-bold text-slate-400">Idempotency Enforced</div>
            <div className="font-bold text-emerald-700 text-xs mt-1">PayPal-Request-Id Active ✓</div>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
          * Note: PayPal Sandbox executes against simulated buyer/merchant accounts. Captured orders are recorded to the ProofLoop consensus state machine as simulated ledger payouts.
        </p>
      </section>

      {/* 3. Consensus & Agreement Security */}
      <section className="p-6 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <h3 className="font-bold text-slate-900 text-sm">Bilateral Consensus & Cryptographic Ledger</h3>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <div className="font-bold text-slate-900">Active Canonical Agreement Hash</div>
              <div className="font-mono text-[11px] text-blue-700 mt-0.5">canonical_v1.2_#9f8c2b7e</div>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
              Dual Locked ✓
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <div className="font-bold text-slate-900">Consensus Engine Validation</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Dual SHA-256 state machine & monotonic clock</div>
            </div>
            <span className="text-[11px] font-bold text-slate-700">Level 3 Node</span>
          </div>
        </div>
      </section>
    </div>
  );
}
