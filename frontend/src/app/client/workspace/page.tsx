"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, MessageSquare } from "lucide-react";
import DashboardSidebar from "@/components/DashboardSidebar";
import DashboardTopHeader from "@/components/DashboardTopHeader";
import WorkspaceChatsMode from "@/components/client/workspace/WorkspaceChatsMode";
import WorkspaceNexumAIMode from "@/components/client/workspace/WorkspaceNexumAIMode";
import HowMediationWorksModal from "@/components/client/workspace/HowMediationWorksModal";
import { useAuth } from "@/context/AuthContext";

type WorkspaceMode = "chats" | "ai";

function WorkspaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();

  const modeParam = searchParams.get("mode");
  const helpParam = searchParams.get("help");

  // Derive mode directly from URL searchParams
  const mode: WorkspaceMode = modeParam === "ai" ? "ai" : "chats";
  const [isMediationHelpOpen, setIsMediationHelpOpen] = useState(
    helpParam === "mediation"
  );
  const [aiScope, setAiScope] = useState<string>("All my projects");

  // Auth enforcement
  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/login");
      } else if (user.role !== "CLIENT") {
        router.push("/dashboard");
      }
    }
  }, [user, isLoading, router]);

  const handleModeSwitch = (newMode: WorkspaceMode) => {
    router.replace(`/client/workspace?mode=${newMode}`, { scroll: false });
  };

  const handleOpenInChatsFromAI = () => {
    router.replace(`/client/workspace?mode=chats`, { scroll: false });
  };

  const handleSwitchToAIModeWithScope = (scope?: string) => {
    if (scope) setAiScope(scope);
    router.replace(`/client/workspace?mode=ai`, { scroll: false });
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex font-sans selection:bg-[#4f46e5] selection:text-white">
      {/* 1. Global Navigation Sidebar */}
      <DashboardSidebar
        currentRole="CLIENT"
        activeTab="workspace"
        onTabChange={(tab) => {
          if (tab === "workspace") return;
          router.push(`/client/dashboard?tab=${tab}`);
        }}
        onHelpClick={() => setIsMediationHelpOpen(true)}
      />

      {/* 2. Main Workspace Layout */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header with Centered Mode Toggle (Matching Reference 1 & 2) */}
        <DashboardTopHeader
          placeholder="Search projects, freelancers, messages..."
          onHelpClick={() => setIsMediationHelpOpen(true)}
          centerSlot={
            <div className="inline-flex items-center p-1 rounded-2xl bg-slate-100/90 border border-slate-200/80 shadow-2xs">
              {/* Nexum AI Mode Button */}
              <button
                type="button"
                onClick={() => handleModeSwitch("ai")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  mode === "ai"
                    ? "bg-white text-[#4f46e5] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-[#4f46e5]" />
                <span>Nexum AI</span>
              </button>

              {/* Chats Mode Button */}
              <button
                type="button"
                onClick={() => handleModeSwitch("chats")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  mode === "chats"
                    ? "bg-white text-[#4f46e5] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Chats</span>
                <span className="w-4.5 h-4.5 rounded-full bg-[#ef4444] text-white text-[10px] font-bold flex items-center justify-center shrink-0 shadow-2xs ml-0.5">
                  3
                </span>
              </button>
            </div>
          }
        />

        {/* 3. Render Selected Workspace Mode */}
        <div className="flex-1 flex overflow-hidden">
          {mode === "chats" ? (
            <WorkspaceChatsMode
              onSwitchToAIMode={handleSwitchToAIModeWithScope}
              onOpenMediationHelp={() => setIsMediationHelpOpen(true)}
            />
          ) : (
            <WorkspaceNexumAIMode
              onOpenInChats={handleOpenInChatsFromAI}
              initialScope={aiScope}
            />
          )}
        </div>
      </div>

      {/* Mode 3: How Mediation Works Modal (Matching Reference 3) */}
      <HowMediationWorksModal
        isOpen={isMediationHelpOpen}
        onClose={() => setIsMediationHelpOpen(false)}
      />
    </div>
  );
}

export default function ClientWorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-xs font-bold text-slate-400">Loading Workspace...</div>
        </div>
      }
    >
      <WorkspaceContent />
    </Suspense>
  );
}
