"use client";

import React, { useState } from "react";
import Image from "next/image";
import { ShieldCheck, CreditCard, CheckCircle2, User, Bell } from "lucide-react";
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#111827] tracking-tight">
          Settings & Preferences
        </h1>
        <p className="text-xs sm:text-sm text-[#64748B] mt-1">
          Manage your verified merchant profile, consensus identity, and PayPal payment rails credentials.
        </p>
      </div>

      {toast && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Responsive 2-Column Balanced Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Personal & Company Profile */}
        <div className="lg:col-span-7 space-y-6">
          <section className="p-6 rounded-xl border border-[#E3EAF3] bg-white shadow-precision space-y-5">
            <div className="flex items-center gap-2.5 pb-4 border-b border-[#E3EAF3]">
              <User className="w-4 h-4 text-[#245BFF]" />
              <h2 className="font-bold text-[#111827] text-sm">Merchant Identity & Organization</h2>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-[#E3EAF3] shadow-2xs shrink-0">
                <Image
                  src={client.avatar}
                  alt={client.name}
                  width={56}
                  height={56}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-[#111827] text-base">{name}</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200">
                    Verified Merchant
                  </span>
                </div>
                <p className="text-xs text-[#64748B] mt-0.5">
                  {client.email} · Account ID: <code className="font-mono text-slate-700 bg-slate-100 px-1 py-0.5 rounded">{client.id}</code>
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
                  className="w-full h-10 px-3 rounded-xl border border-[#E3EAF3] bg-[#F8FAFD] text-xs text-[#111827] focus:bg-white focus:outline-none focus:border-[#245BFF] font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Company / Legal Entity</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#E3EAF3] bg-[#F8FAFD] text-xs text-[#111827] focus:bg-white focus:outline-none focus:border-[#245BFF] font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Timezone</label>
                <input
                  type="text"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#E3EAF3] bg-[#F8FAFD] text-xs text-[#111827] focus:bg-white focus:outline-none focus:border-[#245BFF] font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Registered Location</label>
                <input
                  type="text"
                  value={client.location}
                  disabled
                  className="w-full h-10 px-3 rounded-xl border border-[#E3EAF3] bg-slate-100 text-xs text-slate-500 cursor-not-allowed font-medium"
                />
              </div>

              <div className="sm:col-span-2 flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#245BFF] hover:bg-[#1748E8] text-white shadow-precision hover:shadow-precision-hover transition cursor-pointer active:scale-98"
                >
                  Save Profile Changes
                </button>
              </div>
            </form>
          </section>

          {/* Hiring Preferences & Notifications */}
          <section className="p-6 rounded-xl border border-[#E3EAF3] bg-white shadow-precision space-y-4">
            <div className="flex items-center gap-2.5 pb-4 border-b border-[#E3EAF3]">
              <Bell className="w-4 h-4 text-[#245BFF]" />
              <h2 className="font-bold text-[#111827] text-sm">Hiring Notifications & Webhooks</h2>
            </div>

            <div className="space-y-3 text-xs">
              <label className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAFD] border border-[#E3EAF3] cursor-pointer">
                <div>
                  <div className="font-semibold text-slate-800">Milestone Submission Alerts</div>
                  <div className="text-[11px] text-[#64748B]">Notify when contractors submit deliverables for review</div>
                </div>
                <input type="checkbox" defaultChecked className="accent-[#245BFF] w-4 h-4" />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAFD] border border-[#E3EAF3] cursor-pointer">
                <div>
                  <div className="font-semibold text-slate-800">PayPal Webhook Settlement Notices</div>
                  <div className="text-[11px] text-[#64748B]">Send alerts upon successful order captures or authorizations</div>
                </div>
                <input type="checkbox" defaultChecked className="accent-[#245BFF] w-4 h-4" />
              </label>
            </div>
          </section>
        </div>

        {/* Right Column (5 cols): PayPal Sandbox & Consensus Security */}
        <div className="lg:col-span-5 space-y-6">
          {/* 1. PayPal Sandbox Integration */}
          <section className="p-6 rounded-xl border border-[#E3EAF3] bg-white shadow-precision space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-[#E3EAF3]">
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <h2 className="font-bold text-[#111827] text-sm">PayPal Sandbox REST API v2</h2>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Active
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-lg bg-[#F8FAFD] border border-[#E3EAF3]">
                <div className="text-[10px] uppercase font-bold text-slate-400 font-sans">Environment</div>
                <div className="font-bold text-[#111827] text-xs mt-1">PayPal Sandbox</div>
              </div>

              <div className="p-3 rounded-lg bg-[#F8FAFD] border border-[#E3EAF3]">
                <div className="text-[10px] uppercase font-bold text-slate-400 font-sans">Client ID</div>
                <div className="font-bold text-[#111827] text-xs mt-1 truncate">sb-client-***261C</div>
              </div>

              <div className="p-3 rounded-lg bg-[#F8FAFD] border border-[#E3EAF3]">
                <div className="text-[10px] uppercase font-bold text-slate-400 font-sans">Capture Mode</div>
                <div className="font-bold text-[#111827] text-xs mt-1">CAPTURE (Pre-Funded)</div>
              </div>

              <div className="p-3 rounded-lg bg-[#F8FAFD] border border-[#E3EAF3]">
                <div className="text-[10px] uppercase font-bold text-slate-400 font-sans">Idempotency</div>
                <div className="font-bold text-emerald-700 text-xs mt-1">Enforced ✓</div>
              </div>
            </div>

            <p className="text-[11px] text-[#64748B] leading-relaxed pt-1 border-t border-[#E3EAF3]">
              * Note: PayPal Sandbox executes against simulated buyer/merchant accounts. Captured orders are recorded to the ProofLoop consensus state machine as simulated ledger payouts.
            </p>
          </section>

          {/* 2. Consensus & Agreement Security */}
          <section className="p-6 rounded-xl border border-[#E3EAF3] bg-white shadow-precision space-y-4">
            <div className="flex items-center gap-2.5 pb-4 border-b border-[#E3EAF3]">
              <ShieldCheck className="w-4 h-4 text-[#245BFF]" />
              <h2 className="font-bold text-[#111827] text-sm">Bilateral Consensus & Ledger</h2>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAFD] border border-[#E3EAF3]">
                <div>
                  <div className="font-bold text-[#111827]">Canonical Agreement Hash</div>
                  <div className="font-mono text-[11px] text-[#245BFF] mt-0.5">canonical_v1.2_#9f8c2b7e</div>
                </div>
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                  Dual Locked ✓
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAFD] border border-[#E3EAF3]">
                <div>
                  <div className="font-bold text-[#111827]">Consensus Validation</div>
                  <div className="text-[11px] text-[#64748B] mt-0.5">Dual SHA-256 state machine replay</div>
                </div>
                <span className="text-[11px] font-bold text-slate-700">Level 3 Node</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
