"use client";

import React, { useState } from "react";
import {
  ExternalLink,
  ShieldCheck,
  Send,
  Lock,
  MessageSquare,
} from "lucide-react";
import { FreelancerProposalItem } from "@/lib/freelancer-proposals-types";

interface ProposalMessagesTabProps {
  proposal: FreelancerProposalItem;
  onOpenWorkspace: () => void;
  showToast: (msg: string) => void;
}

export default function ProposalMessagesTab({
  proposal,
  onOpenWorkspace,
  showToast,
}: ProposalMessagesTabProps) {
  const [quickReply, setQuickReply] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<
    Array<{ id: string; senderRole: string; content: string; timestamp: string }>
  >(() => proposal.conversationMessages || []);

  const isAccepted = proposal.status === "ACCEPTED";
  const hasClientStarted =
    Boolean(proposal.hasClientInitiated) ||
    proposal.status === "INTERVIEW" ||
    proposal.status === "INTERVIEW_DISCUSSION" ||
    (proposal.messagesCount && proposal.messagesCount > 0) ||
    messages.length > 0;

  const isUnlocked = isAccepted || hasClientStarted;
  const clientName = proposal.client.companyName || proposal.client.name || "Client";

  const handleSendQuickReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isUnlocked) {
      showToast("Direct messaging unlocks once the client initiates a discussion or accepts your proposal.");
      return;
    }
    if (!quickReply.trim() || isSending) return;

    try {
      setIsSending(true);
      const res = await fetch(`/api/workspace/projects/${proposal.projectId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: "freelancer",
          senderRole: "FREELANCER",
          content: quickReply.trim(),
        }),
      });

      const newMsg = {
        id: `msg-${Date.now()}`,
        senderRole: "FREELANCER",
        content: quickReply.trim(),
        timestamp: "Just now",
      };

      setMessages((prev) => [...prev, newMsg]);
      showToast("Mediated message sent to project workspace.");
      setQuickReply("");
    } catch {
      showToast("Failed to deliver message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Proposal Discussions & Clarifications</span>
            {!isUnlocked ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <Lock className="w-3 h-3 text-amber-600" />
                Locked: Waiting for Client
              </span>
            ) : hasClientStarted && !isAccepted ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                <MessageSquare className="w-3 h-3 text-indigo-600" />
                Client Started Discussion
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                Workspace Active
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isUnlocked
              ? "The workspace is open for discussions. All client communications are mediated by Nexum AI."
              : "Freelancers cannot initiate unsolicited messages. If the client starts talking, the workspace opens immediately for both."}
          </p>
        </div>

        {isUnlocked && (
          <button
            type="button"
            onClick={onOpenWorkspace}
            className="flex items-center gap-1.5 py-1.5 px-3.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-xs font-bold text-white transition shadow-xs cursor-pointer shrink-0"
          >
            <span>Open Full Workspace</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {!isUnlocked ? (
        /* Locked Notice State */
        <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-sm font-bold text-slate-900">
              Direct Messaging is Locked
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Approval rules restrict freelancers from initiating unsolicited messages. If <strong className="text-slate-800">{clientName}</strong> starts talking through messaging, the workspace will open immediately for both of you.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Protects proposal terms and preserves bilateral verification consensus.</span>
          </div>
        </div>
      ) : (
        /* Unlocked Messages Feed */
        <div className="space-y-3">
          {messages.length > 0 ? (
            messages.map((m) => {
              const isClient = m.senderRole === "CLIENT";
              return (
                <div
                  key={m.id}
                  className={`p-4 rounded-2xl border shadow-2xs space-y-2 ${
                    isClient
                      ? "bg-white border-slate-200/90"
                      : "bg-indigo-50/60 border-indigo-100 ml-6"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isClient ? "bg-indigo-600" : "bg-emerald-500"
                        }`}
                      />
                      <span className="text-xs font-bold text-slate-900">
                        {isClient ? clientName : "You (Freelancer)"}
                      </span>
                      <span className="text-[10px] text-slate-400">{m.timestamp}</span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isClient
                          ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}
                    >
                      {isClient ? "Client Inquiry" : "Your Reply"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {m.content}
                  </p>
                </div>
              );
            })
          ) : (
            <div className="p-6 text-center rounded-2xl bg-white border border-slate-200/90 shadow-2xs text-slate-500 space-y-2">
              <MessageSquare className="w-6 h-6 text-indigo-500 mx-auto" />
              <p className="text-xs font-bold text-slate-800">Workspace Discussions Open</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                You can coordinate specifications, ask questions, or propose milestone adjustments with {clientName}.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Composer (Disabled when not unlocked) */}
      <form
        onSubmit={handleSendQuickReply}
        className={`p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3 ${
          !isUnlocked ? "opacity-60 bg-slate-50/50" : ""
        }`}
      >
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            {!isUnlocked && <Lock className="w-3.5 h-3.5 text-slate-400" />}
            <span>Reply via Nexum AI Mediation</span>
          </h4>
          {!isUnlocked && (
            <span className="text-[10px] font-semibold text-slate-400">
              Disabled until client initiates or accepts
            </span>
          )}
        </div>
        <textarea
          rows={3}
          disabled={!isUnlocked}
          value={quickReply}
          onChange={(e) => setQuickReply(e.target.value)}
          placeholder={
            isUnlocked
              ? `Write a message to ${clientName}... Nexum AI will review before delivery.`
              : `Direct messaging unlocks when ${clientName} starts talking or accepts this proposal.`
          }
          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 outline-hidden focus:ring-2 focus:ring-[#4f46e5]/20 focus:border-[#4f46e5] disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
        />
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            AI reviews tone and protects private notes
          </span>
          <button
            type="submit"
            disabled={!isUnlocked || isSending}
            className="flex items-center gap-1.5 py-1.5 px-3.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-xs font-bold text-white transition shadow-xs cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            <Send className="w-3 h-3" />
            <span>{isSending ? "Sending..." : "Send Mediated Reply"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

