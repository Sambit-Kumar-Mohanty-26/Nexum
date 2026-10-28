"use client";

import React from "react";
import Image from "next/image";
import { UserCheck, Send, ArrowRight, Sparkles, MapPin } from "lucide-react";

interface FreelancerCandidate {
  id: string;
  name: string;
  avatar: string;
  title: string;
  hourlyRate: string;
  location: string;
  fitScore: string;
  fitReason: string;
  statusBadge: "ACTIVE_CONTRACTOR" | "AVAILABLE";
  skills: string[];
}

const CANDIDATES: FreelancerCandidate[] = [
  {
    id: "usr_rohan",
    name: "Rohan Verma",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80",
    title: "Senior Full-Stack & Payment Rails Engineer",
    hourlyRate: "$65.00/hr",
    location: "Bengaluru, India",
    fitScore: "98% Fit",
    fitReason: "Direct experience with PayPal REST v2 Orders, webhook signature validation, and dual SHA-256 state machines.",
    statusBadge: "ACTIVE_CONTRACTOR",
    skills: ["PayPal v2", "Next.js", "State Machines", "TypeScript", "Node.js", "PostgreSQL"],
  },
  {
    id: "usr_priya",
    name: "Priya Sharma",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80",
    title: "UI/UX & Design Systems Architect",
    hourlyRate: "$55.00/hr",
    location: "Mumbai, India",
    fitScore: "94% Fit",
    fitReason: "Design systems expert crafting high-conversion checkout flows and verifiable milestone prototypes.",
    statusBadge: "AVAILABLE",
    skills: ["Design Systems", "Figma", "TailwindCSS", "Accessibility", "React", "Design Tokens"],
  },
  {
    id: "usr_marcus",
    name: "Marcus Chen",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80",
    title: "Cloud Infrastructure & Reliability Engineer",
    hourlyRate: "$75.00/hr",
    location: "Singapore",
    fitScore: "91% Fit",
    fitReason: "DevOps engineer specializing in zero-downtime webhook pipelines and Docker container orchestration.",
    statusBadge: "AVAILABLE",
    skills: ["Docker", "PostgreSQL", "CI/CD", "Prometheus", "Kubernetes", "AWS"],
  },
];

interface RecommendedFreelancersProps {
  onShareBrief?: (candidateName: string) => void;
  onViewAllFreelancers?: () => void;
}

export default function RecommendedFreelancers({
  onShareBrief,
  onViewAllFreelancers,
}: RecommendedFreelancersProps) {
  return (
    <div className="space-y-3.5">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
            Recommended freelancers
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Engineers evaluated against your bilateral payment rails architecture (Demo Directory).
          </p>
        </div>
        {onViewAllFreelancers && (
          <button
            type="button"
            onClick={onViewAllFreelancers}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition cursor-pointer self-start sm:self-auto"
          >
            <span>View all freelancers</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 3-Column Responsive Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {CANDIDATES.map((c) => (
          <div
            key={c.id}
            className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-slate-300 hover:shadow-sm transition flex flex-col justify-between h-full space-y-4"
          >
            <div className="space-y-3">
              {/* 1. Header: Status Pill & Match Score */}
              <div className="flex items-center justify-between text-[11px]">
                {c.statusBadge === "ACTIVE_CONTRACTOR" ? (
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
                  {c.fitScore}
                </span>
              </div>

              {/* 2. Identity Row: Avatar, Name, Title, and Clean Rate Block */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-11 h-11 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100">
                    <Image
                      src={c.avatar}
                      alt={c.name}
                      width={44}
                      height={44}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-slate-900 text-sm truncate">{c.name}</h3>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{c.title}</p>
                  </div>
                </div>

                <div className="text-right shrink-0 font-mono">
                  <div className="text-sm font-extrabold text-slate-900 leading-none">
                    {c.hourlyRate.split("/")[0]}
                  </div>
                  <div className="text-[10px] text-slate-400 font-sans mt-0.5">/ hour</div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-slate-100" />

              {/* 3. Bio */}
              <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed min-h-[36px]">
                {c.fitReason}
              </p>

              {/* 4. Match Rationale Insight */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-[11px] text-slate-600 space-y-1 min-h-[58px] flex flex-col justify-center">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px]">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Match Rationale</span>
                </div>
                <p className="line-clamp-2 leading-relaxed text-slate-600 text-[11px]">
                  {c.fitReason}
                </p>
              </div>

              {/* 5. Clean, Consistent Skill Tokens */}
              <div className="flex flex-wrap items-center gap-1.5 min-h-[26px]">
                {c.skills.slice(0, 4).map((skill) => (
                  <span
                    key={skill}
                    className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium text-slate-700 bg-slate-100 border border-slate-200/70"
                  >
                    {skill}
                  </span>
                ))}
                {c.skills.length > 4 && (
                  <span
                    className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium text-slate-500 bg-slate-50 border border-slate-200"
                    title={c.skills.slice(4).join(", ")}
                  >
                    +{c.skills.length - 4} more
                  </span>
                )}
              </div>
            </div>

            {/* 6. Card Footer: Location & Action */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-[11px] text-slate-500 truncate max-w-[150px]">
                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate">{c.location}</span>
              </span>

              {c.statusBadge === "ACTIVE_CONTRACTOR" ? (
                <span className="inline-flex items-center gap-1.5 font-bold text-emerald-800 text-xs px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Active (M2)</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onShareBrief && onShareBrief(c.name)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition cursor-pointer shadow-xs"
                >
                  <Send className="w-3 h-3" />
                  <span>Share Brief</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
