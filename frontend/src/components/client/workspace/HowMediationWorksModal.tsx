"use client";

import React from "react";
import { X, CheckCircle2, Shield, Eye, Lock } from "lucide-react";
import { MEDIATION_TABLE_DATA } from "@/lib/workspace-data";

interface HowMediationWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HowMediationWorksModal({
  isOpen,
  onClose,
}: HowMediationWorksModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col my-auto">
        
        {/* Header */}
        <div className="p-6 sm:p-8 pb-5 border-b border-slate-100 flex items-start justify-between bg-gradient-to-b from-slate-50/70 to-white">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider text-[#4f46e5] bg-[#eef2ff] border border-indigo-100">
              <Shield className="w-3.5 h-3.5" />
              <span>Transparent AI Mediation Pipeline</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              How a mediated message travels
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              The client never writes straight to the freelancer. Nexum AI reviews each message, shows the client what will be sent, and delivers it as a clear, linked record. Your original wording is always kept.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition cursor-pointer shrink-0 ml-4"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-8 flex-1">
          
          {/* ==============================================================
              SECTION 1: 5-STEP HORIZONTAL FLOW
             ============================================================== */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Lifecycle of a Mediated Message
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
              {/* Step 1 */}
              <div className="p-4 rounded-2xl border border-indigo-100 bg-[#fbfbfe] space-y-3 flex flex-col justify-between shadow-2xs">
                <div className="space-y-2">
                  <div className="w-7 h-7 rounded-full bg-[#4f46e5] text-white text-xs font-bold flex items-center justify-center shadow-xs">
                    1
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 leading-snug">
                    Client writes
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Types in the project chat, as in any chat. Files can be attached.
                  </p>
                </div>
                <div>
                  <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200">
                    Client
                  </span>
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-4 rounded-2xl border border-indigo-100 bg-[#fbfbfe] space-y-3 flex flex-col justify-between shadow-2xs">
                <div className="space-y-2">
                  <div className="w-7 h-7 rounded-full bg-[#4f46e5] text-white text-xs font-bold flex items-center justify-center shadow-xs">
                    2
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 leading-snug">
                    Nexum checks
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Classifies the message, compares it with the active agreement, links the requirement, and removes anything the client marked private.
                  </p>
                </div>
                <div>
                  <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold text-[#4f46e5] bg-[#eef2ff] border border-indigo-200">
                    Nexum AI
                  </span>
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-4 rounded-2xl border border-indigo-100 bg-[#fbfbfe] space-y-3 flex flex-col justify-between shadow-2xs">
                <div className="space-y-2">
                  <div className="w-7 h-7 rounded-full bg-[#4f46e5] text-white text-xs font-bold flex items-center justify-center shadow-xs">
                    3
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 leading-snug">
                    Client confirms
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Scope and price messages show a preview first. Simple questions can go straight through, depending on the client&apos;s setting.
                  </p>
                </div>
                <div>
                  <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200">
                    Client
                  </span>
                </div>
              </div>

              {/* Step 4 */}
              <div className="p-4 rounded-2xl border border-emerald-200/90 bg-[#f7fdfa] space-y-3 flex flex-col justify-between shadow-2xs">
                <div className="space-y-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shadow-xs">
                    4
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 leading-snug">
                    Freelancer is notified
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Gets a structured card in their own workspace, with the original message one click away.
                  </p>
                </div>
                <div>
                  <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200">
                    Freelancer
                  </span>
                </div>
              </div>

              {/* Step 5 */}
              <div className="p-4 rounded-2xl border border-indigo-100 bg-[#fbfbfe] space-y-3 flex flex-col justify-between shadow-2xs">
                <div className="space-y-2">
                  <div className="w-7 h-7 rounded-full bg-[#4f46e5] text-white text-xs font-bold flex items-center justify-center shadow-xs">
                    5
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 leading-snug">
                    Reply comes back
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Nexum summarises the freelancer&apos;s reply for the client, links any quote or version, and keeps the original available.
                  </p>
                </div>
                <div>
                  <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold text-[#4f46e5] bg-[#eef2ff] border border-indigo-200">
                    Nexum AI
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ==============================================================
              SECTION 2: MESSAGE HANDLING TABLE
             ============================================================== */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Message Handling Matrix
            </h3>

            <div className="rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 font-bold text-[11px] uppercase tracking-wider">Client says</th>
                    <th className="py-3 px-4 font-bold text-[11px] uppercase tracking-wider">Nexum does</th>
                    <th className="py-3 px-4 font-bold text-[11px] uppercase tracking-wider">Approval needed</th>
                    <th className="py-3 px-4 font-bold text-[11px] uppercase tracking-wider">Where it lands</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {MEDIATION_TABLE_DATA.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {row.clientSays}
                      </td>
                      <td className="py-3 px-4 text-slate-600 leading-relaxed">
                        {row.nexumDoes}
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-[11px] text-slate-700">
                          {row.approvalNeeded}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-900 font-mono font-medium">
                        {row.whereItLands}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ==============================================================
              SECTION 3: THREE CORE PRODUCT PRINCIPLES
             ============================================================== */}
          <div className="space-y-3 pt-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Three Core Product Principles
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Principle 1 */}
              <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-2 shadow-2xs">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <Eye className="w-4 h-4 text-[#4f46e5]" />
                  <span>Original wording is kept</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Both sides can open the original message behind any summary. Transparency is preserved without distortion.
                </p>
              </div>

              {/* Principle 2 */}
              <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-2 shadow-2xs">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>AI never decides for you</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  It cannot approve, pay, accept work or change the agreement. Consequential actions require explicit human authorization.
                </p>
              </div>

              {/* Principle 3 */}
              <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-2 shadow-2xs">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <Lock className="w-4 h-4 text-indigo-600" />
                  <span>Private AI chats stay private</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  The shared chat is the project record; each user&apos;s Nexum AI chat is strictly confidential to their organization.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Nexum Flow v1.2 Specification · Dual SHA-256 Consensus Engine
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-bold transition shadow-xs cursor-pointer"
          >
            Got it
          </button>
        </div>

      </div>
    </div>
  );
}

