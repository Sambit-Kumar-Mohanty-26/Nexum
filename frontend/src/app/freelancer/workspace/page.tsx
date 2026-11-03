"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, MessageSquare } from "lucide-react";
import DashboardSidebar from "@/components/DashboardSidebar";
import DashboardTopHeader from "@/components/DashboardTopHeader";
import FreelancerWorkspaceChatsMode from "@/components/freelancer/workspace/FreelancerWorkspaceChatsMode";
import FreelancerWorkspaceNexumAIMode from "@/components/freelancer/workspace/FreelancerWorkspaceNexumAIMode";
import HowMediationWorksModal from "@/components/client/workspace/HowMediationWorksModal";
import { useAuth } from "@/context/AuthContext";
type WorkspaceMode = "chats" | "ai";
function FreelancerWorkspaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();
  const modeParam = searchParams.get("mode");
  const helpParam = searchParams.get("help");
  const isStandalone = searchParams.get("standalone") === "true";
  // Derive mode directly from URL searchParams
  const [mode, setMode] = useState<WorkspaceMode>(modeParam === "ai" ? "ai" : "chats");

  useEffect(() => {
    setMode(modeParam === "ai" ? "ai" : "chats");
  }, [modeParam]);
  const [isMediationHelpOpen, setIsMediationHelpOpen] = useState(
    helpParam === "mediation"
  );
  const [aiScope, setAiScope] = useState<string>("All my client contracts");
  // Auth enforcement
  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/login");
      } else if (user.role !== "FREELANCER") {
        router.push("/dashboard");
      }
    }
  }, [user, isLoading, router]);
  const handleModeSwitch = (newMode: WorkspaceMode) => {
    setMode(newMode);
    const standaloneQuery = isStandalone ? "&standalone=true" : "";
    router.replace(`/freelancer/workspace?mode=${newMode}${standaloneQuery}`, { scroll: false });
  };
  const handleOpenInChatsFromAI = () => {
    setMode("chats");
    const standaloneQuery = isStandalone ? "&standalone=true" : "";
    router.replace(`/freelancer/workspace?mode=chats${standaloneQuery}`, { scroll: false });
  };
  const handleSwitchToAIModeWithScope = (scope?: string) => {
    if (scope) setAiScope(scope);
    const standaloneQuery = isStandalone ? "&standalone=true" : "";
    router.replace(`/freelancer/workspace?mode=ai${standaloneQuery}`, { scroll: false });
  };
  return (
    <div className="min-h-screen bg-white text-slate-900 flex font-sans selection:bg-[#4f46e5] selection:text-white">
      {/* 1. Global Navigation Sidebar */}
      {!isStandalone && (
        <DashboardSidebar
          currentRole="FREELANCER"
          activeTab="workspace"
          onTabChange={(tab) => {
            if (tab === "workspace") return;
            router.push(`/freelancer/dashboard?tab=${tab}`);
          }}
          onHelpClick={() => setIsMediationHelpOpen(true)}
        />
      )}
      {/* 2. Main Workspace Layout */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header with Centered Mode Toggle */}
        {!isStandalone && (
          <DashboardTopHeader
            placeholder="Search contracts, clients, deliverables, messages..."
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
                </button>
              </div>
            }
          />
        )}
        {/* 3. Render Selected Workspace Mode */}
        <div className="flex-1 flex overflow-hidden">
          {mode === "chats" ? (
            <FreelancerWorkspaceChatsMode
              onSwitchToAIMode={handleSwitchToAIModeWithScope}
              onOpenMediationHelp={() => setIsMediationHelpOpen(true)}
              isStandalone={isStandalone}
            />
          ) : (
            <FreelancerWorkspaceNexumAIMode
              onOpenInChats={handleOpenInChatsFromAI}
              initialScope={aiScope}
              isStandalone={isStandalone}
            />
          )}
        </div>
      </div>
      {/* Mode 3: How Mediation Works Modal */}
      <HowMediationWorksModal
        isOpen={isMediationHelpOpen}
        onClose={() => setIsMediationHelpOpen(false)}
      />
    </div>
  );
}
export default function FreelancerWorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-xs font-bold text-slate-400">Loading Freelancer Workspace...</div>
        </div>
      }
    >
      <FreelancerWorkspaceContent />
    </Suspense>
  );
}
