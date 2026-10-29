"use client";

import React from "react";
import Image from "next/image";
import { ArrowRight, Send } from "lucide-react";

interface FreelancerCandidate {
  id: string;
  name: string;
  avatar: string;
  title: string;
  availability: "Active on Project" | "Available";
  summary: string;
  skills: string[];
  hourlyRate: string;
  recommendationReason: string;
}

const CANDIDATES: FreelancerCandidate[] = [
  {
    id: "usr_rohan",
    name: "Rohan Verma",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80",
    title: "Senior Full-Stack & Payment Rails Engineer",
    availability: "Active on Project",
    summary:
      "Full-stack engineer specializing in Next.js, state machines, API idempotency, and PayPal Orders v2 integration with zero-drop webhook processing.",
    skills: ["PayPal v2", "Next.js", "State Machines", "TypeScript", "Node.js", "PostgreSQL"],
    hourlyRate: "$65.00/hr",
    recommendationReason:
      "Direct experience with PayPal REST v2 Orders, webhook signature validation, and dual SHA-256 state machines.",
  },
  {
    id: "usr_priya",
    name: "Priya Sharma",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80",
    title: "UI/UX & Design Systems Architect",
    availability: "Available",
    summary:
      "Design systems expert crafting high-conversion e-commerce experiences and accessible checkout interfaces with verifiable component hierarchies.",
    skills: ["Design Systems", "Figma", "TailwindCSS", "Accessibility", "React", "Design Tokens"],
    hourlyRate: "$55.00/hr",
    recommendationReason:
      "Specialized in accessible checkout flows, clear payment disclosures, and verifiable milestone UX.",
  },
  {
    id: "usr_marcus",
    name: "Marcus Chen",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80",
    title: "Cloud Infrastructure & Reliability Engineer",
    availability: "Available",
    summary:
      "DevOps specialist building resilient cloud infrastructure, zero-downtime containerized CI/CD pipelines, and high-availability database clusters.",
    skills: ["Docker", "PostgreSQL", "CI/CD", "Prometheus", "Kubernetes", "AWS"],
    hourlyRate: "$75.00/hr",
    recommendationReason:
      "Expertise in high-throughput webhook ingress and containerized failover simulators.",
  },
];

interface RecommendedFreelancersProps {
  onViewProfile?: (candidate: FreelancerCandidate) => void;
  onInviteToProject?: (candidate: FreelancerCandidate) => void;
  onViewAllFreelancers?: () => void;
}

export default function RecommendedFreelancers({
  onViewProfile,
  onInviteToProject,
  onViewAllFreelancers,
}: RecommendedFreelancersProps) {
  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-[#111827] tracking-tight">
            Recommended freelancers
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            People whose skills align with your project requirements.
          </p>
        </div>

        {onViewAllFreelancers && (
          <button
            type="button"
            onClick={onViewAllFreelancers}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#245BFF] hover:text-[#1748E8] transition cursor-pointer self-start sm:self-auto"
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
            className="bg-white rounded-2xl border border-[#E3EAF3] p-5 sm:p-6 shadow-precision hover:border-[#245BFF]/35 hover:shadow-precision-hover transition-all duration-200 flex flex-col justify-between h-full group"
          >
            <div className="space-y-3.5">
              {/* Top Row: Avatar, Name, Title, and Availability */}
              <div className="flex items-start gap-3.5">
                <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-[#E3EAF3] shrink-0 bg-slate-100 shadow-2xs">
                  <Image
                    src={c.avatar}
                    alt={c.name}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <h3 className="font-bold text-[#111827] text-base truncate group-hover:text-[#245BFF] transition-colors">
                      {c.name}
                    </h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${
                        c.availability === "Active on Project"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-slate-50 text-slate-700 border-slate-200"
                      }`}
                    >
                      {c.availability}
                    </span>
                  </div>
                  <p className="text-xs text-[#64748B] font-medium truncate mt-0.5" title={c.title}>
                    {c.title}
                  </p>
                </div>
              </div>

              {/* Rate & Metric Bar */}
              <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#F8FAFD] border border-[#E3EAF3]">
                <div className="flex items-baseline gap-1">
                  <span className="text-[11px] text-slate-400 font-medium">Rate:</span>
                  <span className="text-sm font-extrabold text-[#111827] tnum">{c.hourlyRate}</span>
                </div>
                <div className="inline-flex items-center gap-1 text-[11px] text-[#245BFF] font-bold bg-blue-50/80 px-2 py-0.5 rounded-full border border-blue-200/60">
                  <span>98% Scope Match</span>
                </div>
              </div>

              {/* Middle: Professional Summary (Standardized 2-line height) */}
              <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed h-[36px] overflow-hidden">
                {c.summary}
              </p>

              {/* Middle: Clean Skill Tags (Single Line, Top 3 + Counter) */}
              <div className="flex items-center gap-1.5 h-6 overflow-hidden">
                {c.skills.slice(0, 3).map((skill) => (
                  <span
                    key={skill}
                    className="px-2.5 py-0.5 rounded-md text-[10px] font-medium text-slate-700 bg-[#F8FAFD] border border-[#E3EAF3] whitespace-nowrap"
                  >
                    {skill}
                  </span>
                ))}
                {c.skills.length > 3 && (
                  <span
                    className="px-2 py-0.5 rounded-md text-[10px] font-medium text-slate-500 bg-slate-50 border border-[#E3EAF3] whitespace-nowrap"
                    title={c.skills.slice(3).join(", ")}
                  >
                    +{c.skills.length - 3}
                  </span>
                )}
              </div>

              {/* Bottom: Recommendation Reason (Uniform Callout Box with Left Accent) */}
              <div className="p-3 rounded-xl bg-[#F8FAFD] border border-[#E3EAF3] border-l-3 border-l-[#245BFF] text-[11px] text-slate-600 space-y-1 h-[68px] flex flex-col justify-center">
                <strong className="text-slate-800 font-semibold text-[11px] block">Match Rationale:</strong>
                <p className="line-clamp-2 leading-relaxed text-slate-600 text-[11px]">
                  {c.recommendationReason}
                </p>
              </div>
            </div>

            {/* Bottom Actions: View Profile (Secondary) & Invite to Project (Primary) */}
            <div className="grid grid-cols-2 gap-2 pt-3.5 border-t border-[#E3EAF3] mt-4">
              <button
                type="button"
                onClick={() => onViewProfile && onViewProfile(c)}
                className="h-9 px-3 rounded-xl border border-[#E3EAF3] hover:bg-[#F8FAFD] hover:border-slate-300 text-xs font-semibold text-slate-700 text-center transition-all duration-150 cursor-pointer flex items-center justify-center active:scale-98"
              >
                View profile
              </button>

              <button
                type="button"
                onClick={() => onInviteToProject && onInviteToProject(c)}
                className="h-9 px-3 rounded-xl bg-[#245BFF] hover:bg-[#1748E8] text-white text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-all duration-150 cursor-pointer shadow-precision hover:shadow-precision-hover active:scale-98"
              >
                <Send className="w-3 h-3" />
                <span>Invite to project</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
