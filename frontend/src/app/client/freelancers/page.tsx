"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  DollarSign,
  UserCheck,
  Send,
  ShieldCheck,
  X,
  FileText,
  MapPin,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import DashboardSidebar from "@/components/DashboardSidebar";
import DashboardTopHeader from "@/components/DashboardTopHeader";

interface FreelancerProfile {
  id: string;
  name: string;
  avatar: string;
  title: string;
  bio: string;
  hourlyRateCents: number;
  hourlyRateDisplay: string;
  location: string;
  timezone: string;
  skills: string[];
  availability: "AVAILABLE" | "ACTIVE_CONTRACTOR" | "LIMITED";
  matchScore: string;
  matchReason: string;
  experienceYears: number;
  completedMilestones: number;
  verificationBadge: string;
  isDemoData: boolean;
}

const FREELANCER_ROSTER: FreelancerProfile[] = [
  {
    id: "usr_freelancer_rohan",
    name: "Rohan Verma",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80",
    title: "Senior Full-Stack & Payment Rails Engineer",
    bio: "Full-stack engineer specializing in Next.js, state machines, API idempotency, and PayPal Orders v2 integration with zero-drop webhook processing.",
    hourlyRateCents: 6500,
    hourlyRateDisplay: "$65.00",
    location: "Bengaluru, India",
    timezone: "Asia/Kolkata (UTC+5:30)",
    skills: ["PayPal v2", "Next.js", "State Machines", "TypeScript", "Node.js", "PostgreSQL"],
    availability: "ACTIVE_CONTRACTOR",
    matchScore: "98% Fit",
    matchReason: "Direct experience with PayPal REST v2 Orders, webhook signature validation, and dual SHA-256 state machines.",
    experienceYears: 7,
    completedMilestones: 14,
    verificationBadge: "PayPal Sandbox Verified · Level 3",
    isDemoData: true,
  },
  {
    id: "usr_freelancer_priya",
    name: "Priya Sharma",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80",
    title: "UI/UX & Design Systems Architect",
    bio: "Design systems expert crafting high-conversion e-commerce experiences and accessible buyer checkout interfaces with verifiable component hierarchies.",
    hourlyRateCents: 5500,
    hourlyRateDisplay: "$55.00",
    location: "Mumbai, India",
    timezone: "Asia/Kolkata (UTC+5:30)",
    skills: ["Design Systems", "Figma", "TailwindCSS", "Accessibility", "React", "Design Tokens"],
    availability: "AVAILABLE",
    matchScore: "94% Fit",
    matchReason: "Specialized in accessible checkout flows, clear payment disclosures, and verifiable milestone UX.",
    experienceYears: 5,
    completedMilestones: 9,
    verificationBadge: "Figma Master · Seeded Profile",
    isDemoData: true,
  },
  {
    id: "usr_freelancer_marcus",
    name: "Marcus Chen",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80",
    title: "Cloud Infrastructure & Reliability Engineer",
    bio: "DevOps specialist building resilient cloud infrastructure, zero-downtime containerized CI/CD pipelines, and high-availability database clusters.",
    hourlyRateCents: 7500,
    hourlyRateDisplay: "$75.00",
    location: "Singapore",
    timezone: "Asia/Singapore (UTC+8)",
    skills: ["Docker", "PostgreSQL", "CI/CD", "Prometheus", "Kubernetes", "AWS"],
    availability: "AVAILABLE",
    matchScore: "91% Fit",
    matchReason: "Expertise in high-throughput webhook ingress and containerized failover simulators.",
    experienceYears: 8,
    completedMilestones: 21,
    verificationBadge: "AWS Certified · Seeded Profile",
    isDemoData: true,
  },
];

const ALL_SKILLS = [
  "All Skills",
  "PayPal v2",
  "Next.js",
  "State Machines",
  "TypeScript",
  "Design Systems",
  "Figma",
  "Docker",
  "PostgreSQL",
];

export default function FreelancerDiscoveryPage() {
  const router = useRouter();

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSkill, setSelectedSkill] = useState("All Skills");
  const [selectedAvailability, setSelectedAvailability] = useState<string>("ALL");
  const [maxRate, setMaxRate] = useState<number>(100);

  // Profile modal state
  const [viewingProfile, setViewingProfile] = useState<FreelancerProfile | null>(null);
  const [briefModalProfile, setBriefModalProfile] = useState<FreelancerProfile | null>(null);
  const [briefMessage, setBriefMessage] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedSkill("All Skills");
    setSelectedAvailability("ALL");
    setMaxRate(100);
  };

  const isFiltered =
    searchQuery !== "" ||
    selectedSkill !== "All Skills" ||
    selectedAvailability !== "ALL" ||
    maxRate < 100;

  // Filtered roster
  const filteredCandidates = useMemo(() => {
    return FREELANCER_ROSTER.filter((f) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        f.name.toLowerCase().includes(q) ||
        f.title.toLowerCase().includes(q) ||
        f.bio.toLowerCase().includes(q) ||
        f.skills.some((s) => s.toLowerCase().includes(q));

      const matchesSkill =
        selectedSkill === "All Skills" || f.skills.includes(selectedSkill);

      const matchesAvailability =
        selectedAvailability === "ALL" || f.availability === selectedAvailability;

      const ratePerHour = f.hourlyRateCents / 100;
      const matchesRate = ratePerHour <= maxRate;

      return matchesSearch && matchesSkill && matchesAvailability && matchesRate;
    });
  }, [searchQuery, selectedSkill, selectedAvailability, maxRate]);

  const handleSendBrief = (e: React.FormEvent) => {
    e.preventDefault();
    if (!briefModalProfile) return;
    showToast(
      `Project Brief sent to ${briefModalProfile.name}! Recorded under dual-hash protocol.`
    );
    setBriefModalProfile(null);
    setBriefMessage("");
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex font-sans selection:bg-blue-600 selection:text-white">
      {/* 1. Global Navigation Sidebar */}
      <DashboardSidebar
        currentRole="CLIENT"
        activeTab="freelancers"
        onTabChange={(tab) => {
          if (tab === "overview") router.push("/client/dashboard");
          else if (tab === "assistant") router.push("/client/assistant");
          else router.push(`/client/dashboard?tab=${tab}`);
        }}
      />

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardTopHeader
          roleLabel="Buyer Workspace"
          title="Freelancer Discovery Directory"
          subtitle="Verified Talent & Explainable Match Scores"
        />

        <main className="p-6 sm:p-8 max-w-7xl w-full mx-auto space-y-6 flex-1">
          {/* Header Banner */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                  <Sparkles className="w-4 h-4" />
                </span>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  Discover Matched Talent
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
                Candidates matched against your active agreement requirements for{" "}
                <strong className="text-slate-800">Bilateral E-Commerce Payment Rails</strong>.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-mono text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                Active Project: <strong>#9f8c2b7e</strong>
              </span>
            </div>
          </div>

          {/* Clean, Non-Scattered Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-3.5">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              {/* Search input (5 cols) */}
              <div className="md:col-span-5 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by skill, name, or engineering role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 bg-slate-50/70 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Skill dropdown (3 cols) */}
              <div className="md:col-span-3 relative">
                <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={selectedSkill}
                  onChange={(e) => setSelectedSkill(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 bg-slate-50/70 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white cursor-pointer transition"
                >
                  {ALL_SKILLS.map((skill) => (
                    <option key={skill} value={skill}>
                      {skill}
                    </option>
                  ))}
                </select>
              </div>

              {/* Availability (2 cols) */}
              <div className="md:col-span-2">
                <select
                  value={selectedAvailability}
                  onChange={(e) => setSelectedAvailability(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/70 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white cursor-pointer transition"
                >
                  <option value="ALL">All Availabilities</option>
                  <option value="AVAILABLE">Available for Hire</option>
                  <option value="ACTIVE_CONTRACTOR">Active on Project</option>
                </select>
              </div>

              {/* Reset Action (2 cols) */}
              <div className="md:col-span-2 flex items-center justify-end">
                {isFiltered ? (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition cursor-pointer w-full justify-center"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Filters</span>
                  </button>
                ) : (
                  <div className="text-[11px] font-mono text-slate-400 text-right w-full pr-1">
                    Default Filters
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Row: Hourly Rate Range Slider & Result Count */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3 max-w-sm w-full">
                <span className="flex items-center gap-1 font-semibold text-slate-700 whitespace-nowrap text-xs">
                  <DollarSign className="w-3.5 h-3.5 text-blue-600" />
                  <span>Max Rate: <strong className="text-slate-900 font-mono">${maxRate}/hr</strong></span>
                </span>
                <input
                  type="range"
                  min="40"
                  max="120"
                  step="5"
                  value={maxRate}
                  onChange={(e) => setMaxRate(Number(e.target.value))}
                  className="w-full cursor-pointer accent-blue-600"
                />
              </div>

              <div className="text-[11px] text-slate-500 flex items-center gap-2">
                <span>{filteredCandidates.length} candidate(s) match requirements</span>
                <span>·</span>
                <span className="text-slate-400">Deterministic Skill Match</span>
              </div>
            </div>
          </div>

          {/* Cohesive, Pixel-Aligned Freelancer Grid */}
          {filteredCandidates.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 space-y-3">
              <Search className="w-8 h-8 mx-auto text-slate-300" />
              <div className="font-bold text-slate-700 text-sm">No matching engineers found</div>
              <p className="text-xs max-w-sm mx-auto">
                No profiles match your current search and rate limits. Try clicking Reset Filters to view all candidates.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCandidates.map((f) => (
                <div
                  key={f.id}
                  className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-slate-300 hover:shadow-sm transition flex flex-col justify-between h-full space-y-4"
                >
                  {/* 1. Header: Status Pill & Match Score */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-[11px]">
                      {f.availability === "ACTIVE_CONTRACTOR" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Active Contractor (M2)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold text-slate-700 bg-slate-100 border border-slate-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          <span>Available for Scope</span>
                        </span>
                      )}

                      <span className="px-2.5 py-0.5 rounded-full font-mono font-bold text-[11px] text-blue-700 bg-blue-50 border border-blue-200">
                        {f.matchScore}
                      </span>
                    </div>

                    {/* 2. Identity Row: Avatar, Name, Title, and Clean Rate Block */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100">
                          <Image
                            src={f.avatar}
                            alt={f.name}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <h2 className="font-extrabold text-slate-900 text-sm truncate">{f.name}</h2>
                          <p className="text-xs text-slate-500 truncate mt-0.5">{f.title}</p>
                        </div>
                      </div>

                      {/* Anchored Rate Pill */}
                      <div className="text-right shrink-0 font-mono">
                        <div className="text-base font-extrabold text-slate-900 leading-none">
                          {f.hourlyRateDisplay}
                        </div>
                        <div className="text-[10px] text-slate-400 font-sans mt-0.5">/ hour</div>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-slate-100" />

                    {/* 3. Standardized Bio (Uniform 2-line height across all cards) */}
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed min-h-[36px]">
                      {f.bio}
                    </p>

                    {/* 4. Match Rationale Box */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-[11px] text-slate-600 space-y-1 min-h-[64px] flex flex-col justify-center">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px]">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>Match Rationale</span>
                      </div>
                      <p className="line-clamp-2 leading-relaxed text-slate-600 text-[11px]">
                        {f.matchReason}
                      </p>
                    </div>

                    {/* 5. Clean, Consistent Skill Tags (Top 4 + More Counter) */}
                    <div className="flex flex-wrap items-center gap-1.5 min-h-[28px]">
                      {f.skills.slice(0, 4).map((skill) => (
                        <span
                          key={skill}
                          className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium text-slate-700 bg-slate-100 border border-slate-200/70"
                        >
                          {skill}
                        </span>
                      ))}
                      {f.skills.length > 4 && (
                        <span
                          className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium text-slate-500 bg-slate-50 border border-slate-200"
                          title={f.skills.slice(4).join(", ")}
                        >
                          +{f.skills.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 6. Card Footer: Metadata & Uniform Action Row */}
                  <div className="pt-3 border-t border-slate-100 space-y-3">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="flex items-center gap-1 truncate max-w-[140px]">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{f.location}</span>
                      </span>
                      <span className="flex items-center gap-1 font-medium text-slate-600 shrink-0">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{f.completedMilestones} cleared</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setViewingProfile(f)}
                        className="h-9 px-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 text-center transition cursor-pointer flex items-center justify-center"
                      >
                        View Profile
                      </button>

                      {f.availability === "ACTIVE_CONTRACTOR" ? (
                        <button
                          type="button"
                          onClick={() => router.push("/client/dashboard")}
                          className="h-9 px-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold text-center flex items-center justify-center gap-1.5 cursor-pointer hover:bg-emerald-100/70 transition"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Active (M2)</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setBriefModalProfile(f)}
                          className="h-9 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold text-center flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                        >
                          <Send className="w-3 h-3" />
                          <span>Share Brief</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Full Profile Modal */}
      {viewingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl overflow-hidden border border-slate-200 shrink-0">
                  <Image
                    src={viewingProfile.avatar}
                    alt={viewingProfile.name}
                    width={56}
                    height={56}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">{viewingProfile.name}</h3>
                  <p className="text-xs text-slate-500">{viewingProfile.title}</p>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-600">
                    <span className="font-mono font-bold text-blue-700">{viewingProfile.hourlyRateDisplay}/hr</span>
                    <span>·</span>
                    <span>{viewingProfile.location}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewingProfile(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                Professional Overview
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {viewingProfile.bio}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Verification & Credentials</span>
              </div>
              <p className="text-[11px] text-slate-600">
                {viewingProfile.verificationBadge} · {viewingProfile.completedMilestones} contract milestones cleared with zero disputes.
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                Skills & Tech Stack
              </div>
              <div className="flex flex-wrap gap-1.5">
                {viewingProfile.skills.map((s) => (
                  <span
                    key={s}
                    className="px-2.5 py-1 rounded-lg text-xs font-mono bg-slate-100 text-slate-700 border border-slate-200"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViewingProfile(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Close
              </button>

              {viewingProfile.availability !== "ACTIVE_CONTRACTOR" && (
                <button
                  type="button"
                  onClick={() => {
                    setBriefModalProfile(viewingProfile);
                    setViewingProfile(null);
                  }}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  Share Project Scope
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Share Brief Modal */}
      {briefModalProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Share Structured Project Brief
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  To: <strong className="text-slate-800">{briefModalProfile.name}</strong> ({briefModalProfile.title})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBriefModalProfile(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendBrief} className="space-y-4">
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  <span>Attached Project Context</span>
                </div>
                <p className="text-[11px] text-blue-700 leading-normal">
                  Attaching sanitized brief for <strong>Bilateral E-Commerce Payment Rails</strong> (Budget Ceiling: $4,500.00 USD).
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Optional Invitation Notes
                </label>
                <textarea
                  rows={3}
                  value={briefMessage}
                  onChange={(e) => setBriefMessage(e.target.value)}
                  placeholder="Hi! We are expanding our team for upcoming Milestone 3 (Dual SHA-256 State Machine). Let us know your availability..."
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setBriefModalProfile(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white cursor-pointer shadow-xs"
                >
                  Send Structured Brief
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-2.5 rounded-full text-xs font-semibold shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
