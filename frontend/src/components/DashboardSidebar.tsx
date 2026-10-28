"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  CreditCard,
  FileText,
  RefreshCw,
  LogOut,
  ShieldCheck,
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
    { id: "milestones", label: "Milestones", icon: Layers },
    { id: "escrow", label: "PayPal Escrow", icon: CreditCard },
    { id: "audit", label: "Audit Trail", icon: FileText },
  ];

  return (
    <aside className="w-64 shrink-0 border-r border-slate-200 bg-white flex flex-col justify-between h-screen sticky top-0 z-30 select-none">
      
      {/* Top Brand & Workspace Identifier */}
      <div className="p-5 border-b border-slate-100 space-y-4">
        {/* Nexum Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 text-slate-900 transition hover:opacity-85">
          <svg className="w-7 h-7" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 23L13 6H18L10 23H5Z" fill="#0f172a" />
            <path d="M14 26L22 9H27L19 26H14Z" fill="#2563eb" />
          </svg>
          <span className="font-heading text-xl font-extrabold tracking-tight text-slate-900">nexum</span>
        </Link>

        {/* Workspace Pill */}
        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${currentRole === "CLIENT" ? "bg-blue-600" : "bg-emerald-500"} animate-pulse`} />
            <span>{currentRole === "CLIENT" ? "Client Workspace" : "Freelancer Rail"}</span>
          </div>
          <span className="font-mono text-[10px] text-slate-400">v1.2</span>
        </div>
      </div>

      {/* Middle Navigation Menu */}
      <div className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
          Navigation
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                isActive
                  ? "bg-blue-50 text-blue-700 shadow-xs border border-blue-200/80"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
              <span>{item.label}</span>
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600" />
              )}
            </button>
          );
        })}

        {/* Consensus Verification Notice */}
        <div className="pt-6 px-3">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Dual SHA-256</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-normal">
              Agreement state locked on canonical hash <code>#9f8c2b7e</code>.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Profile, Role Switcher & Logout */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50 space-y-2.5">
        
        {/* User Card */}
        {user && (
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border border-slate-200">
              <Image
                src={user.avatar}
                alt={user.name}
                width={36}
                height={36}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-900 truncate">{user.name}</div>
              <div className="text-[10px] text-slate-500 truncate">{user.companyOrHandle}</div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-1.5">
          {/* Switch Role */}
          <button
            type="button"
            onClick={handleSwitchRole}
            className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-[11px] font-semibold text-slate-700 hover:text-blue-600 transition shadow-2xs cursor-pointer"
            title={`Switch to ${currentRole === "CLIENT" ? "Freelancer (Rohan)" : "Client (Alex)"}`}
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="truncate">Switch Role</span>
          </button>

          {/* Logout */}
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg bg-white border border-slate-200 hover:bg-rose-50 hover:border-rose-200 text-[11px] font-semibold text-slate-700 hover:text-rose-600 transition shadow-2xs cursor-pointer"
            title="Log out of session"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span>Log out</span>
          </button>
        </div>

      </div>
    </aside>
  );
}
