"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, X, Send, Bot, User, ShieldAlert, ExternalLink } from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: "m_init",
    sender: "assistant",
    text: "Hello Alex. I'm your Nexum Project Copilot. I can explain agreement details, summarize milestone progress, or help compare candidate engineers. Consequential actions (payment capture or milestone release) always require your direct human confirmation.",
    timestamp: "Just now",
  },
];

const SUGGESTED_PROMPTS = [
  "Summarize my milestone progress.",
  "Explain the current payment status.",
  "Find freelancers for my project.",
  "Summarize my active agreement.",
];

export default function NexumAssistantPanel() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef(100);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSend = (textToSend?: string) => {
    const messageText = (textToSend || input).trim();
    if (!messageText) return;

    counterRef.current += 1;
    const nextId = `usr_${counterRef.current}`;
    const userMsg: Message = {
      id: nextId,
      sender: "user",
      text: messageText,
      timestamp: "Just now",
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // Simulate intelligent contextual response based on the prompt
    setTimeout(() => {
      let reply = "I've analyzed your project parameters. What specific details would you like to review next?";
      const lower = messageText.toLowerCase();

      if (lower.includes("milestone") || lower.includes("progress")) {
        reply = "You have 4 total milestones under agreement #9f8c2b7e:\n• Milestone 1 ($1,200): Approved & Released.\n• Milestone 2 ($1,500): In Review — Rohan Verma submitted PR #42 & Loom demo.\n• Milestone 3 ($1,000) & 4 ($800): Queued in Unallocated Reserve.";
      } else if (lower.includes("payment") || lower.includes("status") || lower.includes("paypal") || lower.includes("escrow")) {
        reply = "Financial Status Overview:\n• Authorized Ceiling: $4,500.00 USD\n• Captured to Date: $1,200.00 USD\n• Pre-Funded in Sandbox: $1,500.00 USD (Order #6DE714998H998261C)\n• Remaining Reserve: $1,800.00 USD\n\nUnder ProofLoop compliance rules, PayPal Sandbox captures represent provider verification evidence, not external commercial bank deposits.";
      } else if (lower.includes("freelancer") || lower.includes("find") || lower.includes("match")) {
        reply = "Matched Engineers for your architecture:\n1. Rohan Verma (Active Contractor) — 98% Fit ($65/hr, PayPal REST v2 expert)\n2. Priya Sharma (Available) — 94% Fit ($55/hr, UI/UX Design System Architect)\n3. Marcus Chen (Available) — 91% Fit ($75/hr, Webhook DevOps Specialist)\n\nYou can click 'Share Brief' on any candidate card to invite them to a scope.";
      } else if (lower.includes("agreement") || lower.includes("contract")) {
        reply = "Your active bilateral agreement is locked under canonical hash: canonical_v1.2_#9f8c2b7e with contractor Rohan Verma. It enforces the 'Fund-Before-Work' rule and requires dual SHA-256 sign-off for any scope modifications.";
      }

      counterRef.current += 1;
      const botMsg: Message = {
        id: `bot_${counterRef.current}`,
        sender: "assistant",
        text: reply,
        timestamp: "Just now",
      };

      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 600);
  };

  return (
    <>
      {/* Floating Launcher Button */}
      <div className="fixed bottom-6 right-6 z-40 select-none">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-label="Open Nexum AI Project Copilot"
          className="flex items-center gap-2.5 px-4 py-3 rounded-full bg-slate-900 text-white shadow-xl hover:bg-slate-800 transition transform hover:scale-105 border border-slate-700/80 cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-bold tracking-tight">Nexum AI</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </button>
      </div>

      {/* Floating Chat Modal Panel */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Nexum AI Assistant Chat"
          className="fixed bottom-20 right-6 z-50 w-full max-w-sm sm:max-w-md h-[540px] bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white grid place-items-center shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-slate-900 text-sm">Nexum AI Copilot</h3>
                  <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded">
                    v1.2
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">Project & Agreement Assistant</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => router.push("/client/assistant")}
                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                title="Open full page AI workspace"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Full Page</span>
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
                title="Close Copilot (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Safety Notice Banner */}
          <div className="px-4 py-2 bg-amber-50/80 border-b border-amber-200/60 flex items-center gap-2 text-[10px] text-amber-800">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>AI drafts & clarifies. Consequential releases require your approval.</span>
          </div>

          {/* Messages Container */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.sender === "assistant" && (
                  <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 grid place-items-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed whitespace-pre-line ${
                    m.sender === "user"
                      ? "bg-blue-600 text-white shadow-2xs rounded-tr-xs"
                      : "bg-slate-100 text-slate-800 rounded-tl-xs"
                  }`}
                >
                  {m.text}
                </div>
                {m.sender === "user" && (
                  <div className="w-6 h-6 rounded-lg bg-slate-900 text-white grid place-items-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2 text-slate-400 text-xs italic pl-8">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]" />
                <span>Copilot is formulating response...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Prompts Pill Tray */}
          <div className="px-3 py-2 border-t border-slate-100 bg-slate-50/50 flex flex-wrap gap-1.5">
            {SUGGESTED_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => handleSend(prompt)}
                className="text-[10px] font-medium text-slate-600 bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 border border-slate-200 px-2 py-1 rounded-full transition cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input & Send Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 border-t border-slate-100 bg-white flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Copilot about milestones, payments..."
              className="flex-1 h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white grid place-items-center transition shrink-0 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
