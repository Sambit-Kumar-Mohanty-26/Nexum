"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import {
  Search,
  HelpCircle,
  Bell,
  ChevronDown,
  Check,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface DashboardTopHeaderProps {
  title?: string;
  subtitle?: string;
  roleLabel?: string;
  onSearch?: (query: string) => void;
  centerSlot?: React.ReactNode;
  onHelpClick?: () => void;
  placeholder?: string;
}

export type TeamsStatus = "available" | "busy" | "away" | "offline";

interface StatusOption {
  id: TeamsStatus;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  iconBg: string;
}

const TEAMS_STATUSES: StatusOption[] = [
  {
    id: "available",
    label: "Available",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200/80",
    iconBg: "bg-emerald-500",
  },
  {
    id: "busy",
    label: "Busy",
    color: "text-rose-700",
    bgColor: "bg-rose-50",
    borderColor: "border-rose-200/80",
    iconBg: "bg-rose-500",
  },
  {
    id: "away",
    label: "Appear away",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200/80",
    iconBg: "bg-amber-400",
  },
  {
    id: "offline",
    label: "Appear offline",
    color: "text-slate-700",
    bgColor: "bg-slate-100",
    borderColor: "border-slate-200",
    iconBg: "bg-slate-400",
  },
];

export default function DashboardTopHeader({
  onSearch,
  centerSlot,
  onHelpClick,
  placeholder = "Search projects, freelancers, messages...",
}: DashboardTopHeaderProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentStatus, setCurrentStatus] = useState<TeamsStatus>("available");
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(true);

  const statusMenuRef = useRef<HTMLDivElement>(null);

  // Close status dropdown when clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (statusMenuRef.current && !statusMenuRef.current.contains(event.target as Node)) {
        setIsStatusMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeStatusConfig =
    TEAMS_STATUSES.find((s) => s.id === currentStatus) || TEAMS_STATUSES[0];

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (onSearch) onSearch(q);
  };

  return (
    <header className="h-16 border-b border-slate-100 bg-white px-5 sm:px-7 flex items-center justify-between sticky top-0 z-20 select-none shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      {/* ==============================================================
          LEFT: SEARCH BAR (Matching Reference Image 1 & 2)
         ============================================================== */}
      <div className="flex-1 max-w-[340px] lg:max-w-[380px] mr-3">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none stroke-[2]" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder={placeholder}
            className="w-full h-9.5 pl-10 pr-4 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-slate-50 focus:bg-white text-xs sm:text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/15 focus:border-[#4f46e5] transition-all"
          />
        </div>
      </div>

      {/* ==============================================================
          CENTER: OPTIONAL CENTER SLOT (Segmented Toggle for Workspace)
         ============================================================== */}
      {centerSlot && (
        <div className="flex-1 flex justify-center px-2">
          {centerSlot}
        </div>
      )}

      {/* ==============================================================
          RIGHT: ICONS, USER PROFILE & PRESENCE STATUS
         ============================================================== */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        {/* Help Center Icon Button (Opens Mode 3: How Mediation Works) */}
        <button
          type="button"
          onClick={onHelpClick}
          className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          title="How Nexum Works (Mediation & Safety Guide)"
        >
          <HelpCircle className="w-[18px] h-[18px] stroke-[1.9]" />
        </button>

        {/* Notifications Icon Button with Red Dot Badge */}
        <button
          type="button"
          onClick={() => setHasUnreadNotifications(false)}
          className="relative w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Notifications"
        >
          <Bell className="w-[18px] h-[18px] stroke-[1.9]" />
          {hasUnreadNotifications && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-[#ef4444] ring-2 ring-white" />
          )}
        </button>

        {/* User Avatar & Name (Alex Rivera matching Ref 1 & 2) */}
        <div className="flex items-center gap-2.5 pl-1 sm:pl-2 border-l border-slate-100">
          <div className="relative w-9 h-9 shrink-0">
            {user?.avatar ? (
              <div className="w-full h-full rounded-full overflow-hidden border border-slate-200">
                <Image
                  src={user.avatar}
                  alt={user.name}
                  width={36}
                  height={36}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-full h-full rounded-full bg-[#4f46e5]/10 text-[#4f46e5] font-bold text-xs flex items-center justify-center border border-[#4f46e5]/20">
                AR
              </div>
            )}
            {/* Status indicator */}
            <span
              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-1.5 ring-white z-10 shadow-2xs ${activeStatusConfig.iconBg}`}
            />
          </div>

          <div className="hidden sm:block">
            <span className="text-[13px] font-bold text-slate-900 leading-tight">
              {user?.name || "Alex Rivera"}
            </span>
          </div>
        </div>

        {/* Presence Selector Dropdown */}
        <div className="relative" ref={statusMenuRef}>
          <button
            type="button"
            onClick={() => setIsStatusMenuOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1 rounded-full border text-[11.5px] font-semibold transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs active:scale-98 ${activeStatusConfig.bgColor} ${activeStatusConfig.borderColor} ${activeStatusConfig.color}`}
            title="Set presence status"
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${activeStatusConfig.iconBg}`} />
            <span>{activeStatusConfig.label}</span>
            <ChevronDown
              className={`w-3 h-3 transition-transform duration-200 opacity-70 ${
                isStatusMenuOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isStatusMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-xl z-50 text-slate-800 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-2.5 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
                Presence Status
              </div>

              {TEAMS_STATUSES.map((status) => {
                const isSelected = currentStatus === status.id;
                return (
                  <button
                    key={status.id}
                    type="button"
                    onClick={() => {
                      setCurrentStatus(status.id);
                      setIsStatusMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-[#eef2ff] text-[#4f46e5]"
                        : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${status.iconBg}`} />
                      <span>{status.label}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3] text-[#4f46e5]" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
