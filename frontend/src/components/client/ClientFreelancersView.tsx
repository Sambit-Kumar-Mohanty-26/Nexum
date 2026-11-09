"use client";

import React, { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import UserAvatar from "@/components/UserAvatar";
import {
  Search,
  SlidersHorizontal,
  Bookmark,
  BookmarkCheck,
  Send,
  Eye,
  Sparkles,
  MapPin,
  Clock,
  DollarSign,
  Building2,
  User,
  ShieldCheck,
  CheckCircle2,
  X,
  ExternalLink,
  ChevronDown,
  Layers,
  ArrowRight,
  FilterX,
  Mail,
  Calendar,
  Briefcase,
  Award,
  Plus,
} from "lucide-react";
import {
  FreelancerProfile,
  FreelancerInvitation,
  ExperienceLevel,
  FreelancerType,
  AvailabilityStatus,
  INITIAL_FREELANCERS,
  INITIAL_INVITATIONS,
  AVAILABLE_SKILLS_FILTER,
} from "@/lib/mock-freelancers";
import { useAuth } from "@/context/AuthContext";
import {
  fetchClientFreelancers,
  toggleSaveFreelancer,
  fetchClientInvitations,
  inviteClientTalent,
  fetchClientProjects,
} from "@/lib/api-client";

interface ClientFreelancersViewProps {
  onOpenProjectWorkspace?: (projectId: string) => void;
}

function ExplainableFitScoreBadge({ profile }: { profile: FreelancerProfile }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const score = profile.fitScore || 85;
  const breakdown = profile.fitBreakdown || {
    overallScore: score,
    stackMatch: Math.min(100, score + 2),
    trackRecordMatch: Math.min(100, Math.max(70, score - 1)),
    budgetMatch: Math.min(100, Math.max(75, score - 3)),
    availabilityMatch: profile.availability === "AVAILABLE" ? 100 : 85,
    summaryText: profile.recommendationReason || "High compatibility based on active milestone stack requirements.",
  };

  const isElite = score >= 95;
  const isHigh = score >= 90;

  return (
    <div
      className="relative shrink-0"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button
        type="button"
        onClick={() => setShowTooltip((prev) => !prev)}
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-150 cursor-pointer select-none shadow-xs ${
          isElite
            ? "bg-emerald-50 text-emerald-900 border border-emerald-400 hover:bg-emerald-100/90"
            : isHigh
            ? "bg-teal-50 text-teal-900 border border-teal-300 hover:bg-teal-100/90"
            : "bg-slate-50 text-slate-800 border border-slate-300 hover:bg-slate-100"
        }`}
        title="Click to view match breakdown"
      >
        <Sparkles
          className={`w-3.5 h-3.5 shrink-0 ${
            isElite ? "text-emerald-600" : isHigh ? "text-teal-600" : "text-slate-500"
          }`}
        />
        <span>{score}% Match</span>
      </button>

      {/* Popover Card - Clean Light Mode SaaS Theme */}
      {showTooltip && (
        <div className="absolute right-0 top-full mt-2 w-72 p-4 rounded-2xl bg-white text-slate-900 shadow-xl shadow-slate-200/60 border border-slate-200 z-40 space-y-3.5 text-xs animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isElite ? "bg-emerald-500" : isHigh ? "bg-indigo-500" : "bg-slate-400"}`} />
              <span className="font-bold text-slate-900 text-xs">Match Breakdown</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                isElite
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : isHigh
                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {score}% Overall
            </span>
          </div>

          <div className="space-y-2.5 text-[11px]">
            {/* Factor 1: Stack Match (40%) */}
            <div className="space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Stack Overlap <span className="text-[10px] text-slate-400">(40%)</span></span>
                <span className="text-slate-900 font-semibold">{breakdown.stackMatch}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${breakdown.stackMatch}%` }} />
              </div>
            </div>

            {/* Factor 2: Verifiable Track Record (25%) */}
            <div className="space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Ledger Deliverables <span className="text-[10px] text-slate-400">(25%)</span></span>
                <span className="text-slate-900 font-semibold">{breakdown.trackRecordMatch}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{ width: `${breakdown.trackRecordMatch}%` }} />
              </div>
            </div>

            {/* Factor 3: Rate Alignment (20%) */}
            <div className="space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Budget Alignment <span className="text-[10px] text-slate-400">(20%)</span></span>
                <span className="text-slate-900 font-semibold">{breakdown.budgetMatch}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-sky-500 rounded-full transition-all duration-300" style={{ width: `${breakdown.budgetMatch}%` }} />
              </div>
            </div>

            {/* Factor 4: Turnaround Capacity (15%) */}
            <div className="space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Capacity & SLA <span className="text-[10px] text-slate-400">(15%)</span></span>
                <span className="text-slate-900 font-semibold">{breakdown.availabilityMatch}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full transition-all duration-300" style={{ width: `${breakdown.availabilityMatch}%` }} />
              </div>
            </div>
          </div>

          <div className="pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 leading-snug">
            {breakdown.summaryText}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ClientFreelancersView({
  onOpenProjectWorkspace,
}: ClientFreelancersViewProps) {
  const router = useRouter();
  const { user } = useAuth();

  // Main view tab: All Talent (Recommended + Results) | Saved Freelancers | Invitations
  const [activeMainTab, setActiveMainTab] = useState<"ALL" | "SAVED" | "INVITATIONS">("ALL");

  // Roster, Invitations & Dynamic Projects State
  const [freelancers, setFreelancers] = useState<FreelancerProfile[]>(INITIAL_FREELANCERS);
  const [invitations, setInvitations] = useState<FreelancerInvitation[]>(INITIAL_INVITATIONS);
  const [projects, setProjects] = useState<Array<{ id: string; name: string; budget?: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedExperience, setSelectedExperience] = useState<ExperienceLevel | "ALL">("ALL");
  const [selectedType, setSelectedType] = useState<FreelancerType | "ALL">("ALL");
  const [selectedAvailability, setSelectedAvailability] = useState<AvailabilityStatus | "ALL">("ALL");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("ALL");
  const [maxHourlyRate, setMaxHourlyRate] = useState<number>(120);

  // Pagination & Sorting State (Scale architecture for 100k+ candidates)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);
  const [sortBy, setSortBy] = useState<"fitScore" | "rate_asc" | "rate_desc" | "experience">("fitScore");
  const [totalFreelancers, setTotalFreelancers] = useState(INITIAL_FREELANCERS.length);

  // Modals state
  const [inviteModalFreelancer, setInviteModalFreelancer] = useState<FreelancerProfile | null>(null);
  const [inviteProjectId, setInviteProjectId] = useState<string>("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviteProposedRate, setInviteProposedRate] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3800);
  };

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      try {
        const [talentRes, invitesRes, projectsRes] = await Promise.all([
          fetchClientFreelancers({
            clientId: user?.id,
            page: currentPage,
            limit: pageSize,
            search: searchQuery,
            skills: selectedSkills,
            experienceLevel: selectedExperience,
            type: selectedType,
            availability: selectedAvailability,
            projectId: selectedProjectId,
            maxHourlyRate,
            sortBy,
          }),
          fetchClientInvitations(user?.id),
          fetchClientProjects({ clientId: user?.id }),
        ]);

        if (isMounted) {
          if (talentRes.success && Array.isArray(talentRes.data)) {
            setFreelancers(talentRes.data);
            setTotalFreelancers(talentRes.total ?? talentRes.count ?? talentRes.data.length);
          }
          if (invitesRes.success && Array.isArray(invitesRes.data)) {
            setInvitations(invitesRes.data);
          }
          if (projectsRes.success && Array.isArray(projectsRes.data)) {
            const mapped = projectsRes.data.map((p) => ({
              id: p.id,
              name: p.title || p.name || "Untitled Project",
              budget: p.budget || (p.budgetCents ? `$${(p.budgetCents / 100).toLocaleString()}` : "$4,500"),
            }));
            setProjects(mapped);
            if (mapped.length > 0 && !inviteProjectId) {
              setInviteProjectId(mapped[0].id);
            }
          }
        }
      } catch {
        // Fallback already in place
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [
    user?.id,
    currentPage,
    pageSize,
    searchQuery,
    selectedSkills,
    selectedExperience,
    selectedType,
    selectedAvailability,
    selectedProjectId,
    maxHourlyRate,
    sortBy,
  ]);

  // Reset page when filters change
  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedSkills([]);
    setSelectedExperience("ALL");
    setSelectedType("ALL");
    setSelectedAvailability("ALL");
    setSelectedProjectId("ALL");
    setMaxHourlyRate(120);
    setSortBy("fitScore");
    setCurrentPage(1);
  };

  // Toggle individual skill filter
  const handleToggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(totalFreelancers / pageSize));

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedSkills.length > 0) count += selectedSkills.length;
    if (selectedExperience !== "ALL") count += 1;
    if (selectedType !== "ALL") count += 1;
    if (selectedAvailability !== "ALL") count += 1;
    if (selectedProjectId !== "ALL") count += 1;
    if (maxHourlyRate < 120) count += 1;
    return count;
  }, [
    selectedSkills,
    selectedExperience,
    selectedType,
    selectedAvailability,
    selectedProjectId,
    maxHourlyRate,
  ]);

  // Toggle bookmark / saved status
  const handleToggleSave = async (freelancerId: string) => {
    const target = freelancers.find((f) => f.id === freelancerId);
    const nextSaved = !target?.isSaved;

    setFreelancers((prev) =>
      prev.map((f) => (f.id === freelancerId ? { ...f, isSaved: nextSaved } : f))
    );

    showToast(
      nextSaved
        ? `Saved ${target?.name || "candidate"} to your bookmarked candidates.`
        : `Removed ${target?.name || "candidate"} from saved candidates.`
    );

    try {
      await toggleSaveFreelancer(freelancerId, user?.id);
    } catch {
      // Non-blocking
    }
  };

  // Filtered Freelancers
  const filteredFreelancers = useMemo(() => {
    return freelancers.filter((f) => {
      // 1. Search Query: Matches name, title, bio, or skills
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const matchesName = f.name.toLowerCase().includes(q);
        const matchesTitle = f.title.toLowerCase().includes(q);
        const matchesBio = f.bio.toLowerCase().includes(q);
        const matchesSkills = f.skills.some((s) => s.toLowerCase().includes(q));
        if (!matchesName && !matchesTitle && !matchesBio && !matchesSkills) {
          return false;
        }
      }

      // 2. Skills: Multi-select (candidate must have all or any selected)
      if (selectedSkills.length > 0) {
        const hasSkill = selectedSkills.some((skill) =>
          f.skills.some((s) => s.toLowerCase() === skill.toLowerCase())
        );
        if (!hasSkill) return false;
      }

      // 3. Experience Level
      if (selectedExperience !== "ALL" && f.experienceLevel !== selectedExperience) {
        return false;
      }

      // 4. Freelancer Type (Individual vs Agency)
      if (selectedType !== "ALL" && f.type !== selectedType) {
        return false;
      }

      // 5. Availability (Only when provided)
      if (selectedAvailability !== "ALL" && f.availability !== selectedAvailability) {
        return false;
      }

      // 6. Project Relevance
      if (selectedProjectId !== "ALL" && f.recommendedForProjectId !== selectedProjectId) {
        return false;
      }

      // 7. Max Hourly Rate
      if (f.hourlyRateCents && f.hourlyRateCents / 100 > maxHourlyRate) {
        return false;
      }

      return true;
    });
  }, [
    freelancers,
    searchQuery,
    selectedSkills,
    selectedExperience,
    selectedType,
    selectedAvailability,
    selectedProjectId,
    maxHourlyRate,
  ]);

  // Recommended For You (Filtered candidates with high fitScore)
  const recommendedCandidates = useMemo(() => {
    return filteredFreelancers.filter((f) => f.fitScore >= 90);
  }, [filteredFreelancers]);

  // Saved Candidates
  const savedCandidates = useMemo(() => {
    return freelancers.filter((f) => f.isSaved);
  }, [freelancers]);

  // Open invite modal
  const handleOpenInviteModal = (freelancer: FreelancerProfile) => {
    setInviteModalFreelancer(freelancer);
    const matchingProj = projects.find((p) => p.id === freelancer.recommendedForProjectId);
    const defaultProjId = matchingProj ? matchingProj.id : (projects[0]?.id || "");
    setInviteProjectId(defaultProjId);
    setInviteProposedRate(freelancer.hourlyRateDisplay ? `${freelancer.hourlyRateDisplay}` : "$60.00/hr");
    setInviteMessage(
      `Hello ${freelancer.name.split(" ")[0]}, we are developing a high-integrity milestone project and would like to invite you to review our requirements and submit a proposal.`
    );
  };

  // Submit invitation
  const handleSubmitInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteModalFreelancer) return;

    if (projects.length === 0) {
      showToast("Please post a project first to invite talent.");
      return;
    }

    const targetProject = projects.find((p) => p.id === inviteProjectId);
    const projectName = targetProject ? targetProject.name : "Project Workspace";

    const newInvite: FreelancerInvitation = {
      id: `inv_${Date.now()}`,
      freelancerId: inviteModalFreelancer.id,
      freelancerName: inviteModalFreelancer.name,
      freelancerAvatar: inviteModalFreelancer.avatar,
      freelancerTitle: inviteModalFreelancer.title,
      projectId: inviteProjectId,
      projectName,
      status: "PENDING",
      sentDate: "Just now",
      proposedRate: inviteProposedRate || "$60.00/hr",
      customNote: inviteMessage,
    };

    setInvitations((prev) => [newInvite, ...prev]);
    showToast(`Invitation sent to ${inviteModalFreelancer.name} for ${projectName}!`);
    const modalTarget = inviteModalFreelancer;
    setInviteModalFreelancer(null);

    try {
      await inviteClientTalent({
        clientId: user?.id,
        freelancerId: modalTarget.id,
        freelancerName: modalTarget.name,
        freelancerAvatar: modalTarget.avatar,
        freelancerTitle: modalTarget.title,
        projectId: inviteProjectId,
        projectName,
        proposedRate: inviteProposedRate,
        customNote: inviteMessage,
      });
    } catch {
      // Non-blocking
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 sm:space-y-8 animate-pulse">
        {/* Top Header Skeleton */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-6 w-48 bg-slate-200 rounded-lg" />
            <div className="h-4 w-72 bg-slate-100 rounded-lg" />
          </div>
          <div className="h-9 w-64 bg-slate-100 rounded-xl" />
        </div>

        {/* Search Row Skeleton */}
        <div className="h-14 bg-white rounded-2xl border border-slate-200/90 p-4" />

        {/* Recommended Grid Skeleton */}
        <div className="space-y-3">
          <div className="h-5 w-56 bg-slate-200 rounded-md" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-56 rounded-2xl bg-white border border-slate-200/90 p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-200 shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-28 bg-slate-200 rounded" />
                    <div className="h-3 w-36 bg-slate-100 rounded" />
                  </div>
                </div>
                <div className="h-10 bg-slate-100 rounded-xl" />
                <div className="h-8 bg-slate-100 rounded-lg" />
              </div>
            ))}
          </div>
        </div>

        {/* Directory Grid Skeleton */}
        <div className="space-y-3">
          <div className="h-5 w-40 bg-slate-200 rounded-md" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-64 rounded-2xl bg-white border border-slate-200/90 p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-200 shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-28 bg-slate-200 rounded" />
                    <div className="h-3 w-36 bg-slate-100 rounded" />
                  </div>
                </div>
                <div className="h-12 bg-slate-100 rounded-xl" />
                <div className="h-8 bg-slate-100 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">

      {/* ====================================================================
          1. TOP NAVIGATION & SUBTABS HEADER
         ==================================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-[#eef2ff] text-[#4f46e5]">
              <Sparkles className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Find Freelancers & Agencies
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
            Discover verified talent matched against your project requirements, review verifiable work history, and send bilateral escrow invitations.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center p-1 rounded-xl bg-slate-100/90 border border-slate-200/60 self-start md:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveMainTab("ALL")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${activeMainTab === "ALL"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
              }`}
          >
            <span>All Talent</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
              {filteredFreelancers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab("SAVED")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${activeMainTab === "SAVED"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
              }`}
          >
            <Bookmark className="w-3 h-3 text-amber-500" />
            <span>Saved</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700">
              {savedCandidates.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab("INVITATIONS")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${activeMainTab === "INVITATIONS"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
              }`}
          >
            <Send className="w-3 h-3 text-indigo-500" />
            <span>Invitations</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700">
              {invitations.length}
            </span>
          </button>
        </div>
      </div>

      {/* ====================================================================
          2. SEARCH & FILTER DRAWER / EXPANDABLE PANEL
         ==================================================================== */}
      {activeMainTab === "ALL" && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-all duration-200">
          {/* Main Search Row */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, professional title, or core skills (e.g. Next.js, PayPal v2)..."
                className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#4f46e5] focus:bg-white transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Expandable Filter Toggle Button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsFilterPanelOpen((prev) => !prev)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${isFilterPanelOpen || activeFiltersCount > 0
                    ? "bg-[#eef2ff] border-[#c7d2fe] text-[#4f46e5]"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Filters</span>
                {activeFiltersCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-[#4f46e5] text-white text-[10px] font-extrabold flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${isFilterPanelOpen ? "rotate-180 text-[#4f46e5]" : "text-slate-400"
                    }`}
                />
              </button>

              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition cursor-pointer flex items-center gap-1"
                  title="Clear all filters"
                >
                  <FilterX className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Reset</span>
                </button>
              )}
            </div>
          </div>

          {/* Expandable Filter Drawer Panel */}
          {isFilterPanelOpen && (
            <div className="border-t border-slate-100 bg-slate-50/70 p-4 sm:p-6 space-y-5 animate-in slide-in-from-top-2 duration-150">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">

                {/* Filter 1: Project Relevance */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Match Project Brief
                  </label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:border-[#4f46e5]"
                  >
                    <option value="ALL">
                      {projects.length === 0 ? "All Active Projects (None posted yet)" : "All Active Projects"}
                    </option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filter 2: Experience Level */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Experience Level
                  </label>
                  <select
                    value={selectedExperience}
                    onChange={(e) => setSelectedExperience(e.target.value as ExperienceLevel | "ALL")}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:border-[#4f46e5]"
                  >
                    <option value="ALL">Any Experience Level</option>
                    <option value="EXPERT">Expert (8+ years)</option>
                    <option value="SENIOR">Senior (5-8 years)</option>
                    <option value="MID_LEVEL">Mid-Level (3-5 years)</option>
                    <option value="JUNIOR">Junior (1-3 years)</option>
                    <option value="BEGINNER">Beginner (&lt;1 year)</option>
                  </select>
                </div>

                {/* Filter 3: Freelancer Type */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Talent Type
                  </label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value as FreelancerType | "ALL")}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:border-[#4f46e5]"
                  >
                    <option value="ALL">All Types (Individual & Agency)</option>
                    <option value="INDIVIDUAL">Individual Freelancer</option>
                    <option value="AGENCY">Agency / Software Studio</option>
                  </select>
                </div>

                {/* Filter 4: Availability */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Availability
                  </label>
                  <select
                    value={selectedAvailability}
                    onChange={(e) => setSelectedAvailability(e.target.value as AvailabilityStatus | "ALL")}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:border-[#4f46e5]"
                  >
                    <option value="ALL">Any Availability</option>
                    <option value="AVAILABLE">Available Now</option>
                    <option value="ACTIVE_CONTRACTOR">Active Contractor</option>
                    <option value="LIMITED">Limited Bandwidth</option>
                  </select>
                </div>
              </div>

              {/* Filter 5: Hourly Budget Slider */}
              <div className="pt-2 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 max-w-sm w-full">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">Max Hourly Rate:</span>
                    <span className="font-mono font-extrabold text-[#4f46e5]">
                      ${maxHourlyRate}.00 / hr
                    </span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="120"
                    step="5"
                    value={maxHourlyRate}
                    onChange={(e) => setMaxHourlyRate(Number(e.target.value))}
                    className="w-full accent-[#4f46e5] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>$30/hr</span>
                    <span>$75/hr</span>
                    <span>$120/hr</span>
                  </div>
                </div>

                {/* Quick Skills Filter Cloud */}
                <div className="flex-1 space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Filter by Key Skills
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {AVAILABLE_SKILLS_FILTER.map((skill) => {
                      const isSelected = selectedSkills.includes(skill);
                      return (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => handleToggleSkill(skill)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${isSelected
                              ? "bg-[#4f46e5] text-white shadow-xs"
                              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                            }`}
                        >
                          {skill}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ====================================================================
          TAB 1: ALL TALENT (RECOMMENDED FOR YOU + RESULTS)
         ==================================================================== */}
      {activeMainTab === "ALL" && (
        <div className="space-y-8">

          {/* Section 2: Recommended For You */}
          {recommendedCandidates.length > 0 && searchQuery === "" && activeFiltersCount === 0 && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                    Recommended for your projects
                  </h2>
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  High-compatibility matches based on active milestones
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendedCandidates.slice(0, 3).map((candidate) => (
                  <div
                    key={`rec_${candidate.id}`}
                    className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all duration-200 flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => router.push(`/client/freelancers/${candidate.id}`)}
                            className="shrink-0 group cursor-pointer text-left"
                            title="View candidate profile"
                          >
                            <UserAvatar
                              name={candidate.name}
                              avatarUrl={candidate.avatar}
                              size="lg"
                              className="rounded-xl group-hover:ring-2 group-hover:ring-indigo-500/30 transition shadow-2xs"
                            />
                          </button>
                          <div className="min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={() => router.push(`/client/freelancers/${candidate.id}`)}
                              className="font-extrabold text-slate-900 text-sm leading-snug truncate hover:text-indigo-600 transition text-left cursor-pointer block max-w-full"
                            >
                              {candidate.name}
                            </button>
                            <p className="text-xs text-slate-500 truncate">{candidate.title}</p>
                          </div>
                        </div>

                        <ExplainableFitScoreBadge profile={candidate} />
                      </div>

                      {/* Why Recommended Callout - Clean, high-legibility insight */}
                      <div className="mt-3.5 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed">
                        <span className="font-bold text-slate-900">Why recommended:</span>{" "}
                        <span className="text-slate-600">{candidate.recommendationReason}</span>
                      </div>

                      {/* Key Skills */}
                      <div className="mt-3.5 flex flex-wrap gap-1.5">
                        {candidate.skills.slice(0, 4).map((skill) => (
                          <span
                            key={skill}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100/80 text-slate-700 border border-slate-200/60"
                          >
                            {skill}
                          </span>
                        ))}
                        {candidate.skills.length > 4 && (
                          <span className="px-2 py-1 rounded-lg text-[11px] font-medium text-slate-400 bg-slate-50 border border-slate-200/40">
                            +{candidate.skills.length - 4}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                      <div className="text-xs">
                        <span className="text-sm font-extrabold text-slate-900 font-mono">
                          {candidate.hourlyRateDisplay || "Contact for rate"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => router.push(`/client/freelancers/${candidate.id}`)}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                        >
                          View Profile
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenInviteModal(candidate)}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#4f46e5] hover:bg-[#4338ca] text-white shadow-xs transition cursor-pointer"
                        >
                          Invite
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 3: All Freelancer Results */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                  All Candidates & Agencies ({totalFreelancers.toLocaleString()})
                </h2>
                {searchQuery && (
                  <span className="text-xs text-slate-500">
                    Showing matches for &ldquo;{searchQuery}&rdquo;
                  </span>
                )}
              </div>

              {/* Quick Sort Bar */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="p-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#4f46e5] cursor-pointer"
                >
                  <option value="fitScore">Best Match (Fit Score)</option>
                  <option value="rate_asc">Rate: Low to High</option>
                  <option value="rate_desc">Rate: High to Low</option>
                  <option value="experience">Most Experienced</option>
                </select>
              </div>
            </div>

            {filteredFreelancers.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-sm">No freelancers matched your criteria</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Try adjusting your search terms, broadening the required skills, or expanding the max hourly rate budget.
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 cursor-pointer"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
                  {filteredFreelancers.map((freelancer) => {
                    const isSaved = freelancer.isSaved;
                    return (
                      <div
                        key={freelancer.id}
                        className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all duration-200 flex flex-col justify-between"
                      >
                        <div>
                          {/* Header: Photo, Name, Badges, Match Score & Save Bookmark */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <button
                                type="button"
                                onClick={() => router.push(`/client/freelancers/${freelancer.id}`)}
                                className="shrink-0 group cursor-pointer text-left"
                                title="View candidate profile"
                              >
                                <UserAvatar
                                  name={freelancer.name}
                                  avatarUrl={freelancer.avatar}
                                  size="lg"
                                  className="rounded-xl group-hover:ring-2 group-hover:ring-indigo-500/30 transition shadow-2xs"
                                />
                              </button>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => router.push(`/client/freelancers/${freelancer.id}`)}
                                    className="font-extrabold text-slate-900 text-sm leading-snug truncate hover:text-indigo-600 transition text-left cursor-pointer block max-w-full"
                                  >
                                    {freelancer.name}
                                  </button>
                                  {freelancer.type === "AGENCY" ? (
                                    <span className="p-0.5 rounded text-slate-500 shrink-0" title="Agency / Studio">
                                      <Building2 className="w-3.5 h-3.5" />
                                    </span>
                                  ) : (
                                    <span className="p-0.5 rounded text-slate-500 shrink-0" title="Individual Freelancer">
                                      <User className="w-3.5 h-3.5" />
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500 truncate">{freelancer.title}</p>
                              </div>
                            </div>

                            {/* Match Score & Bookmark Toggle */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <ExplainableFitScoreBadge profile={freelancer} />
                              <button
                                type="button"
                                onClick={() => handleToggleSave(freelancer.id)}
                                className={`p-1.5 rounded-lg border transition cursor-pointer shrink-0 ${
                                  isSaved
                                    ? "bg-amber-50 border-amber-200 text-amber-600"
                                    : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-700"
                                }`}
                                title={isSaved ? "Saved in bookmarks" : "Save candidate"}
                              >
                                {isSaved ? (
                                  <BookmarkCheck className="w-4 h-4 fill-amber-500" />
                                ) : (
                                  <Bookmark className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Location, Availability & Experience */}
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {freelancer.location}
                            </span>
                            <span>&bull;</span>
                            <span className="font-medium text-slate-700">
                              {freelancer.experienceYears}y exp ({freelancer.experienceLevel.toLowerCase()})
                            </span>
                            {freelancer.availability && (
                              <>
                                <span>&bull;</span>
                                <span
                                  className={`px-2 py-0.2 rounded-md font-semibold text-[10px] ${
                                    freelancer.availability === "AVAILABLE"
                                      ? "bg-emerald-50 text-emerald-700"
                                      : freelancer.availability === "ACTIVE_CONTRACTOR"
                                      ? "bg-blue-50 text-blue-700"
                                      : "bg-amber-50 text-amber-700"
                                  }`}
                                >
                                  {freelancer.availability === "AVAILABLE"
                                    ? "Available"
                                    : freelancer.availability === "ACTIVE_CONTRACTOR"
                                    ? "Active Contract"
                                    : "Limited"}
                                </span>
                              </>
                            )}
                          </div>

                          {/* Short Summary Bio */}
                          <p className="mt-3 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                            {freelancer.bio}
                          </p>

                          {/* Why Recommended Highlight (if present) */}
                          {freelancer.recommendationReason && (
                            <div className="mt-3 p-2 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600 leading-relaxed">
                              <span className="font-semibold text-slate-800">Match note:</span>{" "}
                              {freelancer.recommendationReason}
                            </div>
                          )}

                          {/* Relevant Portfolio Highlights */}
                          {freelancer.portfolioHighlights.length > 0 && (
                            <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="truncate">
                                {freelancer.portfolioHighlights[0].title} ({freelancer.portfolioHighlights[0].year})
                              </span>
                            </div>
                          )}

                          {/* Key Skills */}
                          <div className="mt-3 flex flex-wrap gap-1">
                            {freelancer.skills.slice(0, 4).map((skill) => (
                              <span
                                key={skill}
                                className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200/60"
                              >
                                {skill}
                              </span>
                            ))}
                            {freelancer.skills.length > 4 && (
                              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-medium text-slate-400">
                                +{freelancer.skills.length - 4}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Card Footer Actions */}
                        <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                          <div>
                            {freelancer.hourlyRateDisplay ? (
                              <span className="text-xs font-mono font-extrabold text-slate-900">
                                {freelancer.hourlyRateDisplay}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400 font-medium">Rate upon quote</span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => router.push(`/client/freelancers/${freelancer.id}`)}
                              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                            >
                              View Profile
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenInviteModal(freelancer)}
                              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#4f46e5] hover:bg-[#4338ca] text-white shadow-xs transition cursor-pointer"
                            >
                              Invite
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination Controls Bar (Engineered for 100,000+ candidate scaling) */}
                {totalFreelancers > 0 && (
                  <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="text-xs text-slate-600 flex items-center gap-2">
                      <span>
                        Showing <span className="font-bold text-slate-900">{(currentPage - 1) * pageSize + 1}</span>–
                        <span className="font-bold text-slate-900">{Math.min(currentPage * pageSize, totalFreelancers)}</span> of{" "}
                        <span className="font-mono font-black text-[#4f46e5]">{totalFreelancers.toLocaleString()}</span> verified talent
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 self-center sm:self-auto">
                      <button
                        type="button"
                        disabled={currentPage <= 1}
                        onClick={() => {
                          setCurrentPage((p) => Math.max(1, p - 1));
                          window.scrollTo({ top: 350, behavior: "smooth" });
                        }}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                      >
                        Previous
                      </button>

                      {/* Dynamic Page Jump Buttons */}
                      {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                        let pageNum = idx + 1;
                        if (totalPages > 5 && currentPage > 3) {
                          pageNum = Math.min(currentPage - 2 + idx, totalPages - 4 + idx);
                        }
                        return (
                          <button
                            key={pageNum}
                            type="button"
                            onClick={() => {
                              setCurrentPage(pageNum);
                              window.scrollTo({ top: 350, behavior: "smooth" });
                            }}
                            className={`w-8 h-8 rounded-xl text-xs font-mono font-bold transition cursor-pointer ${
                              currentPage === pageNum
                                ? "bg-[#4f46e5] text-white shadow-xs"
                                : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}

                      <button
                        type="button"
                        disabled={currentPage >= totalPages}
                        onClick={() => {
                          setCurrentPage((p) => Math.min(totalPages, p + 1));
                          window.scrollTo({ top: 350, behavior: "smooth" });
                        }}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                      >
                        Next
                      </button>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
                      <span className="text-slate-500 font-medium">Per Page:</span>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="px-2.5 py-1 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:border-[#4f46e5] cursor-pointer"
                      >
                        <option value={9}>9 / page</option>
                        <option value={18}>18 / page</option>
                        <option value={36}>36 / page</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB 2: SAVED FREELANCERS
         ==================================================================== */}
      {activeMainTab === "SAVED" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              Bookmarked Candidates ({savedCandidates.length})
            </h2>
            <button
              type="button"
              onClick={() => setActiveMainTab("ALL")}
              className="text-xs font-bold text-[#4f46e5] hover:underline cursor-pointer"
            >
              Browse directory &rarr;
            </button>
          </div>

          {savedCandidates.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-500 mx-auto flex items-center justify-center">
                <Bookmark className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-sm">No saved freelancers yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Click the bookmark icon on any candidate profile to keep a shortlist of talent for your upcoming milestones.
              </p>
              <button
                type="button"
                onClick={() => setActiveMainTab("ALL")}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#4f46e5] text-white hover:bg-[#4338ca] cursor-pointer shadow-xs"
              >
                Discover Talent
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
              {savedCandidates.map((freelancer) => (
                <div
                  key={`saved_${freelancer.id}`}
                  className="p-5 rounded-2xl bg-white border border-amber-200 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => router.push(`/client/freelancers/${freelancer.id}`)}
                          className="shrink-0 group cursor-pointer text-left"
                          title="View candidate profile"
                        >
                          <UserAvatar
                            name={freelancer.name}
                            avatarUrl={freelancer.avatar}
                            size="lg"
                            className="rounded-xl group-hover:ring-2 group-hover:ring-amber-500/30 transition shadow-2xs"
                          />
                        </button>
                        <div>
                          <button
                            type="button"
                            onClick={() => router.push(`/client/freelancers/${freelancer.id}`)}
                            className="font-extrabold text-slate-900 text-sm leading-snug hover:text-indigo-600 transition text-left cursor-pointer block"
                          >
                            {freelancer.name}
                          </button>
                          <p className="text-xs text-slate-500 line-clamp-1">{freelancer.title}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleSave(freelancer.id)}
                        className="p-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 hover:bg-amber-100 transition cursor-pointer"
                        title="Remove from bookmarks"
                      >
                        <BookmarkCheck className="w-4 h-4 fill-amber-500" />
                      </button>
                    </div>

                    <p className="mt-3 text-xs text-slate-600 line-clamp-2">{freelancer.bio}</p>

                    <div className="mt-3 flex flex-wrap gap-1">
                      {freelancer.skills.slice(0, 3).map((skill) => (
                        <span
                          key={skill}
                          className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200/60"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-mono font-extrabold text-slate-900">
                      {freelancer.hourlyRateDisplay || "Contact for rate"}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => router.push(`/client/freelancers/${freelancer.id}`)}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                      >
                        View Profile
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenInviteModal(freelancer)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#4f46e5] hover:bg-[#4338ca] text-white shadow-xs transition cursor-pointer"
                      >
                        Invite
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ====================================================================
          TAB 3: INVITATIONS
         ==================================================================== */}
      {activeMainTab === "INVITATIONS" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                Project Invitations ({invitations.length})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Track formal invitations extended to freelancers across your active projects.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveMainTab("ALL")}
              className="text-xs font-bold text-[#4f46e5] hover:underline cursor-pointer"
            >
              + Invite more talent
            </button>
          </div>

          {invitations.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 space-y-3">
              <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-500 mx-auto flex items-center justify-center">
                <Send className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-sm">No project invitations sent yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Explore matched freelancers and invite them to submit proposals against your project briefs.
              </p>
              <button
                type="button"
                onClick={() => setActiveMainTab("ALL")}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#4f46e5] text-white hover:bg-[#4338ca] cursor-pointer shadow-xs"
              >
                Find Freelancers
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs divide-y divide-slate-100 overflow-hidden">
              {invitations.map((inv) => (
                <div
                  key={inv.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition"
                >
                  <div className="flex items-start sm:items-center gap-3.5">
                    <button
                      type="button"
                      onClick={() => router.push(`/client/freelancers/${inv.freelancerId}`)}
                      className="shrink-0 group cursor-pointer text-left"
                      title="View candidate profile"
                    >
                      <UserAvatar
                        name={inv.freelancerName}
                        avatarUrl={inv.freelancerAvatar}
                        size="md"
                        className="rounded-xl group-hover:ring-2 group-hover:ring-indigo-500/30 transition shadow-2xs"
                      />
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => router.push(`/client/freelancers/${inv.freelancerId}`)}
                          className="font-extrabold text-slate-900 text-sm hover:text-indigo-600 transition text-left cursor-pointer"
                        >
                          {inv.freelancerName}
                        </button>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${inv.status === "ACCEPTED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : inv.status === "PENDING"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-slate-100 text-slate-600"
                            }`}
                        >
                          {inv.status === "ACCEPTED"
                            ? "PROPOSAL RECEIVED"
                            : inv.status === "PENDING"
                              ? "INVITATION SENT"
                              : inv.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{inv.freelancerTitle}</p>

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 font-mono">
                        <span className="font-semibold text-slate-800">{inv.projectName}</span>
                        <span>&bull;</span>
                        <span>Sent: {inv.sentDate}</span>
                        <span>&bull;</span>
                        <span className="text-indigo-600 font-bold">{inv.proposedRate}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    {onOpenProjectWorkspace && (
                      <button
                        type="button"
                        onClick={() => onOpenProjectWorkspace(inv.projectId)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
                      >
                        Project Workspace
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => showToast(`Nudge notification re-sent to ${inv.freelancerName}.`)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition cursor-pointer"
                    >
                      {inv.status === "ACCEPTED" ? "Review Proposal" : "Send Follow-Up"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ====================================================================
          5. INTERACTIVE INVITE TO PROJECT MODAL
         ==================================================================== */}
      {inviteModalFreelancer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Invite {inviteModalFreelancer.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Send an official project invitation to review your requirements.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInviteModalFreelancer(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitInvite} className="space-y-4">
              {/* Target Project Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Target Project Brief *</label>
                {projects.length === 0 ? (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/90 text-amber-900 text-xs space-y-2">
                    <p className="font-semibold">You don&apos;t have any active projects yet.</p>
                    <p className="text-[11px] text-amber-700">
                      Create a project brief first so candidates can review your scope and milestone deliverables.
                    </p>
                    <Link
                      href="/client/post-project"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shadow-2xs transition"
                    >
                      <Plus className="w-3 h-3 stroke-[2.5]" />
                      <span>Post a New Project</span>
                    </Link>
                  </div>
                ) : (
                  <select
                    value={inviteProjectId}
                    onChange={(e) => setInviteProjectId(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#4f46e5] focus:bg-white"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.budget ? `(${p.budget})` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Proposed Rate / Milestone Budget */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Proposed Rate / Estimate</label>
                <input
                  type="text"
                  value={inviteProposedRate}
                  onChange={(e) => setInviteProposedRate(e.target.value)}
                  placeholder="e.g. $65.00/hr or $4,500 milestone budget"
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#4f46e5] focus:bg-white"
                />
              </div>

              {/* Custom Message */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Custom Invitation Message *</label>
                <textarea
                  rows={4}
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  required
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:border-[#4f46e5] focus:bg-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setInviteModalFreelancer(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={projects.length === 0}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#4f46e5] hover:bg-[#4338ca] disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Official Invitation</span>
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