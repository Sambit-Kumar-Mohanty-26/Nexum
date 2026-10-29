"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  CreditCard,
  FileText,
  RefreshCw,
  LogOut,
  ShieldCheck,
  Settings,
  Sparkles,
  Users,
  FolderKanban,
  LayoutGrid,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface DashboardSidebarProps {
  currentRole: "CLIENT" | "FREELANCER";
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function DashboardSidebar({
  currentRole,
  activeTab,
  onTabChange,
}: DashboardSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loginAs, logout } = useAuth();

  const handleSwitchRole = async () => {
    if (currentRole === "CLIENT") {
      await loginAs("FREELANCER_A");
      router.push("/freelancer/dashboard");
    } else {
      await loginAs("CLIENT");
      router.push("/client/dashboard");
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const navItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    ...(currentRole === "CLIENT"
      ? [
          { id: "projects", label: "My Projects", icon: FolderKanban },
        ]
      : []),
    { id: "milestones", label: "Milestones", icon: Layers },
    ...(currentRole === "CLIENT"
      ? [
          { id: "freelancers", label: "Find Freelancers", icon: Users },
          { id: "workspace", label: "Workspace", icon: LayoutGrid },
          { id: "payments", label: "Payments", icon: CreditCard },
        ]
      : [
          { id: "payments", label: "PayPal Escrow", icon: CreditCard },
        ]),
    { id: "audit", label: "Audit Trail", icon: FileText },
    ...(currentRole === "CLIENT"
      ? [{ id: "settings", label: "Settings", icon: Settings }]
      : []),
    ...(currentRole === "CLIENT"
      ? [{ id: "assistant", label: "Nexum AI", icon: Sparkles }]
      : []),
  ];

  const handleNavClick = (itemId: string) => {
    if (itemId === "assistant") {
      router.push("/client/assistant");
    } else if (itemId === "freelancers") {
      router.push("/client/freelancers");
    } else {
      if (pathname === "/client/dashboard") {
        onTabChange(itemId);
      } else {
        router.push(`/client/dashboard?tab=${itemId}`);
      }
    }
  };

  return (
    <aside className="w-[252px] shrink-0 border-r border-[#E3EAF3] bg-white flex flex-col justify-between h-screen sticky top-0 z-30 select-none">
      
      {/* Top Brand & Workspace Identifier */}
      <div className="p-4 sm:p-5 border-b border-[#E3EAF3] space-y-3.5">
        {/* Nexum Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 text-slate-900 transition hover:opacity-85">
          <svg className="w-7 h-7" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 23L13 6H18L10 23H5Z" fill="#111827" />
            <path d="M14 26L22 9H27L19 26H14Z" fill="#245BFF" />
          </svg>
          <span className="font-heading text-xl font-extrabold tracking-tight text-[#111827]">nexum</span>
        </Link>

        {/* Workspace Pill */}
        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-[#F8FAFD] border border-[#E3EAF3] text-xs font-semibold text-slate-700">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${currentRole === "CLIENT" ? "bg-[#245BFF]" : "bg-emerald-500"} animate-pulse`} />
            <span>{currentRole === "CLIENT" ? "Client Workspace" : "Freelancer Rail"}</span>
          </div>
          <span className="font-mono text-[10px] text-slate-400">v1.2</span>
        </div>
      </div>

      {/* Middle Navigation Menu */}
      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2.5 text-[11px] font-sans font-semibold uppercase tracking-wider text-slate-400">
          Navigation
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            activeTab === item.id ||
            (activeTab === "escrow" && item.id === "payments") ||
            (item.id === "assistant" && pathname === "/client/assistant") ||
            (item.id === "freelancers" && pathname === "/client/freelancers");

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] leading-5 transition-all duration-150 text-left cursor-pointer ${
                isActive
                  ? "bg-blue-50/80 text-[#245BFF] font-semibold border border-blue-200/70 shadow-2xs"
                  : "text-slate-600 hover:text-[#111827] hover:bg-[#F8FAFD] font-medium"
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? "text-[#245BFF]" : "text-slate-400"}`} />
              <span className="truncate">{item.label}</span>
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#245BFF]" />
              )}
            </button>
          );
        })}

        {/* Consensus Verification Notice */}
        <div className="pt-4 px-1">
          <div className="p-3.5 rounded-xl bg-[#F8FAFD] border border-[#E3EAF3] text-slate-600 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Dual SHA-256</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Agreement state locked on canonical hash <code className="font-mono text-[11px] text-slate-700 bg-white px-1.5 py-0.5 rounded border border-[#E3EAF3]">#9f8c2b7e</code>.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Profile & Role Switcher */}
      <div className="p-3.5 border-t border-[#E3EAF3] bg-white space-y-2.5">
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F8FAFD] border border-[#E3EAF3]">
          <div className="flex items-center gap-2.5 min-w-0">
            {user?.avatar ? (
              <div className="w-8 h-8 rounded-full overflow-hidden border border-[#E3EAF3] shrink-0">
                <Image
                  src={user.avatar}
                  alt={user?.name || "User Avatar"}
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs grid place-items-center shrink-0">
                {user?.name?.[0] || "U"}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate">
                {user?.name || "Alex Rivera"}
              </div>
              <div className="text-[11px] text-slate-500 truncate mt-0.5">
                {user?.companyOrHandle || "Horizon Commerce LLC"}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            type="button"
            onClick={handleSwitchRole}
            className="h-8.5 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl border border-[#E3EAF3] text-slate-700 hover:text-slate-900 hover:bg-[#F8FAFD] font-semibold transition cursor-pointer text-xs"
            title="Switch between Buyer and Freelancer view"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            <span>Switch Role</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="h-8.5 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl border border-[#E3EAF3] text-slate-700 hover:text-rose-600 hover:bg-rose-50 font-semibold transition cursor-pointer text-xs"
            title="Log out of session"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-400" />
            <span>Log out</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
