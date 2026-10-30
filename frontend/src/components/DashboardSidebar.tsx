"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import {
  Home,
  FolderKanban,
  Layers,
  Users,
  Cpu,
  CreditCard,
  Settings,
  HelpCircle,
  ArrowRight,
  LogOut,
} from "lucide-react";
import Logo from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";

export interface NavItemConfig {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number | string;
  badgeColor?: string;
  href?: string;
}

interface DashboardSidebarProps {
  currentRole: "CLIENT" | "FREELANCER";
  activeTab: string;
  onTabChange: (tab: string) => void;
  onHelpClick?: () => void;
}

export default function DashboardSidebar({
  currentRole,
  activeTab,
  onTabChange,
  onHelpClick,
}: DashboardSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  // Primary Navigation Group for Client
  const mainNavItems: NavItemConfig[] = [
    {
      id: "overview",
      label: "Overview",
      icon: Home,
      href: "/client/dashboard",
    },
    {
      id: "projects",
      label: "My Projects",
      icon: FolderKanban,
      href: "/client/dashboard?tab=projects",
    },
    {
      id: "milestones",
      label: "Milestones",
      icon: Layers,
      badge: 2,
      href: "/client/dashboard?tab=milestones",
    },
    {
      id: "freelancers",
      label: "Find Freelancers",
      icon: Users,
      href: "/client/freelancers",
    },
    {
      id: "workspace",
      label: "Workspace",
      icon: Cpu,
      href: "/client/workspace",
    },
    {
      id: "payments",
      label: "Payments",
      icon: CreditCard,
      href: "/client/dashboard?tab=payments",
    },
  ];

  // Secondary Group (Preferences / Settings)
  const secondaryNavItems: NavItemConfig[] = [
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      href: "/client/dashboard?tab=settings",
    },
  ];

  const handleNavClick = (item: NavItemConfig) => {
    if (item.href) {
      if (item.id === "workspace" && pathname === "/client/workspace") {
        onTabChange("workspace");
        return;
      }
      if (item.id === "overview" && pathname === "/client/dashboard" && !window.location.search) {
        onTabChange("overview");
        return;
      }
      router.push(item.href);
      return;
    }
    if (pathname === "/client/dashboard" || pathname === "/freelancer/dashboard") {
      onTabChange(item.id);
    } else {
      const basePath = currentRole === "CLIENT" ? "/client/dashboard" : "/freelancer/dashboard";
      router.push(`${basePath}?tab=${item.id}`);
    }
  };

  const renderNavButton = (item: NavItemConfig) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => handleNavClick(item)}
        className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl text-[13.5px] font-medium transition-all duration-200 cursor-pointer text-left ${
          isActive
            ? "bg-[#eef2ff] text-[#4f46e5] font-semibold shadow-xs"
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50/80"
        }`}
      >
        <Icon
          className={`w-[18px] h-[18px] shrink-0 transition-colors ${
            isActive ? "text-[#4f46e5]" : "text-slate-500"
          }`}
          strokeWidth={isActive ? 2.3 : 1.9}
        />
        <span className="flex-1 truncate">{item.label}</span>

        {/* Circular Pill Badge (matching image red pill) */}
        {item.badge !== undefined && (
          <span className="w-5 h-5 rounded-full bg-[#ef4444] text-white text-[11px] font-bold flex items-center justify-center shrink-0 shadow-xs">
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside className="w-[230px] shrink-0 border-r border-slate-100 bg-white flex flex-col justify-between h-screen sticky top-0 z-30 select-none">
      {/* Top Section: Brand Logo & Navigation Links */}
      <div className="flex-1 flex flex-col p-4 overflow-y-auto">
        {/* Brand Logo Header */}
        <div className="px-2 pt-1 pb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 transition-transform hover:scale-[1.02] duration-200"
          >
            <Logo surface="light" className="h-7 w-7 object-contain" />
            <span className="font-heading text-lg font-black tracking-tight text-slate-900 leading-none">
              nexum
            </span>
          </Link>
        </div>

        {/* Main Navigation Items */}
        <nav className="space-y-1.5" aria-label="Main menu">
          {mainNavItems.map(renderNavButton)}
        </nav>

        {/* Subtle Separator */}
        <div className="my-4 mx-2 h-px bg-slate-100" />

        {/* Secondary Navigation Items (Settings) */}
        <div className="space-y-1.5">
          {secondaryNavItems.map(renderNavButton)}
        </div>

        {/* Need Help? Box at bottom of nav (opens Mode 3 or Help Center) */}
        <div className="mt-auto pt-6">
          <button
            type="button"
            onClick={onHelpClick || (() => router.push("/client/workspace?help=mediation"))}
            className="w-full flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-[#f5f6ff] to-[#eef2ff] hover:from-[#eef2ff] hover:to-[#e0e7ff] border border-[#4f46e5]/10 text-slate-800 transition-all duration-200 group cursor-pointer shadow-2xs text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#4f46e5] text-white flex items-center justify-center shrink-0 shadow-xs">
                <HelpCircle className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <p className="text-[12px] font-bold text-slate-900 leading-tight">Need help?</p>
                <p className="text-[10px] text-slate-500 leading-tight truncate mt-0.5">
                  Visit Help Center
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#4f46e5] group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
          </button>
        </div>
      </div>

      {/* Bottom Section: Profile Card & Logout (matching image 2, WITHOUT switch role) */}
      <div className="p-3 border-t border-slate-100/90 bg-white space-y-2">
        {/* User Profile Card */}
        {user && (
          <div
            onClick={() => onTabChange("settings")}
            className="flex items-center gap-2.5 p-2 rounded-2xl bg-white border border-slate-200 shadow-2xs cursor-pointer hover:border-[#4f46e5]/40 hover:bg-[#eef2ff]/20 transition duration-150"
            title="Profile & Settings"
          >
            <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-slate-100 ring-1 ring-slate-200/60">
              <Image
                src={user.avatar}
                alt={user.name}
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-bold text-slate-900 leading-tight truncate">
                {user.name}
              </div>
              <div className="text-[11px] text-slate-500 leading-tight truncate mt-0.5">
                {user.companyOrHandle || "Nexum Client"}
              </div>
            </div>
          </div>
        )}

        {/* Clean Logout Button (NO Switch Role) */}
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white border border-slate-200 hover:bg-rose-50 hover:border-rose-200 text-xs font-semibold text-slate-700 hover:text-rose-600 transition shadow-2xs cursor-pointer active:scale-98"
          title="Log out of session"
        >
          <LogOut className="w-3.5 h-3.5 text-rose-500 shrink-0" />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}
