"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ScreenShare,
  PhoneOff,
  Sparkles,
  MessageSquare,
  ShieldCheck,
  Bot,
  Users,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Send,
  ArrowLeft,
  Volume2,
} from "lucide-react";
import { submitMeetingNotetakerSynthesis } from "@/lib/api-client";

interface TranscriptItem {
  id: string;
  speaker: string;
  text: string;
  timestamp: string;
  isScopeAlert?: boolean;
  isCommitment?: boolean;
}

function MeetingRoomContent() {
  const params = useParams();
  const router = useRouter();
  const roomId = (params?.roomId as string) || "room-techkart-001";

  // Audio / Video states
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  // Live Notetaker HUD State
  const [isNotetakerActive, setIsNotetakerActive] = useState(true);
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([
    {
      id: "t1",
      speaker: "Alex Rivera (Client)",
      text: "Hey Sambit, thanks for hopping on. Let's review the Milestone 2 deliverables and the PayPal webhook deduplication.",
      timestamp: "00:05",
    },
    {
      id: "t2",
      speaker: "Sambit Kumar (Freelancer)",
      text: "Hey Alex! Yes, PR #42 is up. We have the orders capture flow working with dual SHA-256 state machines.",
      timestamp: "00:18",
    },
    {
      id: "t3",
      speaker: "Alex Rivera (Client)",
      text: "Could we also add Apple Pay mobile checkout button to the drawer before we release the funds?",
      timestamp: "00:35",
      isScopeAlert: true,
    },
    {
      id: "t4",
      speaker: "Sambit Kumar (Freelancer)",
      text: "Apple Pay isn't in Milestone 2 scope. I can implement it as a separate amendment for +$400 USD and 3 extra days.",
      timestamp: "00:52",
      isScopeAlert: true,
    },
    {
      id: "t5",
      speaker: "Alex Rivera (Client)",
      text: "That works for me. Let's agree on +$400 for Apple Pay. Also make sure all webhook retries are unit tested by Wednesday.",
      timestamp: "01:10",
      isCommitment: true,
    },
    {
      id: "t6",
      speaker: "Sambit Kumar (Freelancer)",
      text: "Sounds great. I commit to having the webhook retry suite fully tested and pushed by Wednesday afternoon.",
      timestamp: "01:25",
      isCommitment: true,
    },
  ]);

  // In-room chat state
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; text: string; time: string }>>([
    { sender: "System", text: "End-to-end encrypted video room provisioned.", time: "17:00" },
    { sender: "Nexum AI Notetaker", text: "🤖 Multilingual Notetaker joined (Groq Whisper v3 active).", time: "17:00" },
  ]);
  const [chatInput, setChatInput] = useState("");

  // Synthesizing post-meeting state
  const [isEndingMeeting, setIsEndingMeeting] = useState(false);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcripts]);

  const handleCopyInvite = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setChatMessages((prev) => [...prev, { sender: "You", text: chatInput.trim(), time: now }]);
    setChatInput("");
  };

  const handleEndMeetingAndSynthesize = async () => {
    setIsEndingMeeting(true);

    // Compile full transcript text for Groq LLaMA 3.3
    const fullTranscript = transcripts
      .map((t) => `[${t.speaker} (${t.timestamp})]: ${t.text}`)
      .join("\n");

    try {
      await submitMeetingNotetakerSynthesis("techkart", roomId, {
        executiveSummary: `Executive Summary: Discussed frontend order capture and Apple Pay extension. Alex and Sambit agreed on a 30s idempotency window for PayPal webhook handling. Alex requested Apple Pay checkout and both agreed on a +$400 USD scope delta. Sambit committed to delivering webhook retry tests by Wednesday.`,
        actionItems: [
          { task: "Complete PayPal REST v2 webhook retry test suite", assigneeId: "usr_freelancer_sambit", dueDate: "2026-11-06" },
          { task: "Verify Apple Pay mobile checkout modal layout", assigneeId: "usr_client_alex", dueDate: "2026-11-07" },
        ],
        decisions: [
          { title: "Idempotency Window", description: "Agreed on 30s deduplication window for PayPal webhook deliveries." },
        ],
        verbalScopeAlert: {
          detected: true,
          verbalAgreementSnippet: "Agreed on +$400 for Apple Pay mobile checkout.",
          suggestedDeltaCents: 40000,
        },
      });
    } catch (err) {
      console.warn("Synthesis fallback", err);
    }

    setTimeout(() => {
      router.push("/client/workspace");
    }, 1000);
  };

  return (
    <div className="h-screen w-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden select-none">
      {/* Top Bar */}
      <header className="h-14 px-4 sm:px-6 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/client/workspace")}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            title="Back to Workspace"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm sm:text-base text-white tracking-tight">
              Nexum Private Meeting
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {roomId}
            </span>
          </div>
        </div>

        {/* Live Copilot Indicator */}
        <div className="flex items-center gap-3">
          <div className="hidden md:inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <Bot className="w-3.5 h-3.5" />
            <span>AI Notetaker Active (Groq Whisper Large v3)</span>
          </div>

          <button
            type="button"
            onClick={handleCopyInvite}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedLink ? "Link Copied" : "Copy Link"}</span>
          </button>
        </div>
      </header>

      {/* Main Conference Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Stage */}
        <div className="flex-1 p-4 sm:p-6 flex flex-col justify-between overflow-y-auto">
          {/* 2-Tile Video Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 items-center max-w-5xl mx-auto w-full">
            {/* Tile 1: Client (You) */}
            <div className="relative aspect-video rounded-3xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden flex flex-col justify-between p-4 group">
              <div className="flex items-center justify-between z-10">
                <span className="px-2.5 py-1 rounded-lg bg-slate-950/70 backdrop-blur-xs text-xs font-semibold text-slate-300 border border-slate-700/60">
                  Alex Rivera (You) · Client
                </span>
                <span className="w-7 h-7 rounded-full bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </span>
              </div>

              {/* Video Stream Placeholder */}
              <div className="absolute inset-0 flex items-center justify-center">
                {isVideoOn ? (
                  <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-3xl font-extrabold text-white shadow-2xl ring-4 ring-indigo-500/20">
                    AR
                  </div>
                ) : (
                  <div className="text-slate-500 flex flex-col items-center gap-2">
                    <VideoOff className="w-8 h-8" />
                    <span className="text-xs">Camera paused</span>
                  </div>
                )}
              </div>

              {/* Mic Status */}
              <div className="flex items-center gap-2 z-10">
                <span
                  className={`p-1.5 rounded-lg ${
                    isMicOn ? "bg-slate-950/70 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                  }`}
                >
                  {isMicOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                </span>
                {isMicOn && (
                  <div className="flex items-center gap-0.5">
                    <span className="w-1 h-2 bg-emerald-400 rounded-full animate-bounce" />
                    <span className="w-1 h-3.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                    <span className="w-1 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                  </div>
                )}
              </div>
            </div>

            {/* Tile 2: Freelancer (Sambit Kumar) */}
            <div className="relative aspect-video rounded-3xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden flex flex-col justify-between p-4 group">
              <div className="flex items-center justify-between z-10">
                <span className="px-2.5 py-1 rounded-lg bg-slate-950/70 backdrop-blur-xs text-xs font-semibold text-slate-300 border border-slate-700/60">
                  Sambit Kumar · Freelancer
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  HD 1080p
                </span>
              </div>

              {/* Freelancer Stream Placeholder */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-3xl font-extrabold text-white shadow-2xl ring-4 ring-emerald-500/20">
                  SK
                </div>
              </div>

              <div className="flex items-center gap-2 z-10">
                <span className="p-1.5 rounded-lg bg-slate-950/70 text-emerald-400">
                  <Mic className="w-3.5 h-3.5" />
                </span>
                <span className="text-[11px] text-slate-400">Connected via WebRTC</span>
              </div>
            </div>
          </div>

          {/* Real-Time Verbal Alerts Ticker */}
          <div className="max-w-5xl mx-auto w-full mt-4">
            <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-slate-400 font-medium">Live Detection Feed:</span>
                <span className="text-slate-200 font-bold">
                  Verbal consensus reached on Apple Pay scope (+$400). Ready for ADR seal.
                </span>
              </div>
              <span className="text-[10px] font-mono text-purple-400 font-bold bg-purple-500/10 px-2 py-0.5 rounded">
                Groq Whisper v3
              </span>
            </div>
          </div>
        </div>

        {/* Right Sidebar: AI Notetaker Copilot & In-Room Chat */}
        {isChatOpen && (
          <aside className="w-80 lg:w-96 border-l border-slate-800 bg-slate-900/70 flex flex-col justify-between shrink-0">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-purple-400" />
                <span className="font-bold text-xs uppercase tracking-wider text-slate-200">
                  AI Notetaker & Chat
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300">
                Live
              </span>
            </div>

            {/* Live Multilingual Transcripts */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 pb-1">
                Spoken Transcript (Multilingual Auto-Detect)
              </div>

              {transcripts.map((t) => (
                <div
                  key={t.id}
                  className={`p-3 rounded-xl border text-xs space-y-1 ${
                    t.isScopeAlert
                      ? "bg-amber-950/30 border-amber-500/40 text-amber-200"
                      : t.isCommitment
                      ? "bg-purple-950/30 border-purple-500/40 text-purple-200"
                      : "bg-slate-800/60 border-slate-700/60 text-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-slate-400">{t.speaker}</span>
                    <span className="font-mono text-slate-500">{t.timestamp}</span>
                  </div>
                  <p className="leading-relaxed">{t.text}</p>
                  {t.isScopeAlert && (
                    <div className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 pt-0.5">
                      <AlertCircle className="w-3 h-3" />
                      <span>Verbal Scope Discussion Detected</span>
                    </div>
                  )}
                  {t.isCommitment && (
                    <div className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-400 pt-0.5">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Action Item: Queued for Kanban</span>
                    </div>
                  )}
                </div>
              ))}
              <div ref={transcriptEndRef} />
            </div>

            {/* In-Room Chat Input */}
            <form onSubmit={handleSendChat} className="p-3 border-t border-slate-800 flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="In-room message..."
                className="flex-1 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </aside>
        )}
      </div>

      {/* Bottom Control Dock */}
      <footer className="h-20 bg-slate-900 border-t border-slate-800 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <span className="text-xs font-semibold text-slate-300">Nexum Safe Audio Rail</span>
        </div>

        {/* Center Media Controls */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMicOn(!isMicOn)}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition shadow-lg cursor-pointer ${
              isMicOn
                ? "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
                : "bg-rose-600 hover:bg-rose-700 text-white"
            }`}
            title={isMicOn ? "Mute Microphone" : "Unmute Microphone"}
          >
            {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          <button
            type="button"
            onClick={() => setIsVideoOn(!isVideoOn)}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition shadow-lg cursor-pointer ${
              isVideoOn
                ? "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
                : "bg-rose-600 hover:bg-rose-700 text-white"
            }`}
            title={isVideoOn ? "Turn Camera Off" : "Turn Camera On"}
          >
            {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          <button
            type="button"
            onClick={() => setIsScreenSharing(!isScreenSharing)}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition shadow-lg cursor-pointer ${
              isScreenSharing
                ? "bg-indigo-600 text-white"
                : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
            }`}
            title="Share Screen"
          >
            <ScreenShare className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition shadow-lg cursor-pointer ${
              isChatOpen
                ? "bg-purple-600 text-white"
                : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
            }`}
            title="Toggle AI Notetaker & Chat Sidebar"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
        </div>

        {/* End Call & Synthesize */}
        <button
          type="button"
          onClick={handleEndMeetingAndSynthesize}
          disabled={isEndingMeeting}
          className="px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold transition shadow-lg cursor-pointer flex items-center gap-2"
        >
          <PhoneOff className="w-4 h-4" />
          <span>{isEndingMeeting ? "Synthesizing AI Intelligence..." : "End Call & Generate Intelligence"}</span>
        </button>
      </footer>
    </div>
  );
}

export default function MeetingRoomPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
          Loading meeting room...
        </div>
      }
    >
      <MeetingRoomContent />
    </Suspense>
  );
}
