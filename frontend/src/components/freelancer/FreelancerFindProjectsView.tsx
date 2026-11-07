"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  searchFreelancerProjects,
  saveFreelancerProject,
  unsaveFreelancerProject,
  getLocalProjects,
} from "@/lib/api-client";
import {
  Search,
  MapPin,
  SlidersHorizontal,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  Clock,
  FileText,
  Grid,
  List,
  Sparkles,
  X,
  RotateCcw,
  ShieldCheck,
  ArrowRight,
  ChevronDown,
} from "lucide-react";

export interface ProjectOpportunity {
  id: string;
  title: string;
  clientName: string;
  clientCompany: string;
  location: string;
  experienceLevel: "Entry Level" | "Intermediate" | "Expert";
  category: "Web Design" | "Full Stack Development" | "Mobile Apps" | "AI & Machine Learning" | "Smart Contracts";
  budget: string;
  budgetAmount: number;
  budgetType: "Hourly" | "Fixed Price";
  proposalsCount: number;
  hiringState: "Still Selecting" | "1 Interviewing" | "Urgent Need";
  postedTime: string;
  matchScore: number;
  description: string;
  skills: string[];
  isVerified: boolean;
  escrowStatus: "Pre-Funded in Escrow" | "Verified Payment Method" | "Dual Consensus Ready";
}

const OPPORTUNITIES: ProjectOpportunity[] = [
  {
    id: "opp_1",
    title: "Let's Collaborate on HAV's Website Redesign",
    clientName: "Markus Becker",
    clientCompany: "HAV Creative Studio",
    location: "Germany",
    experienceLevel: "Entry Level",
    category: "Web Design",
    budget: "$15.00/hour",
    budgetAmount: 15,
    budgetType: "Hourly",
    proposalsCount: 15,
    hiringState: "Still Selecting",
    postedTime: "15 mins ago",
    matchScore: 94,
    description:
      "We are looking for a creative person who can redesign & build beautiful landing pages in modern responsive frameworks with clean typography.",
    skills: ["UI Design", "Web Design", "Landing Page", "Web Development", "Figma"],
    isVerified: true,
    escrowStatus: "Pre-Funded in Escrow",
  },
  {
    id: "opp_2",
    title: "Build/Edit Landing Page for Online Course",
    clientName: "David Sterling",
    clientCompany: "EduScale Global",
    location: "United States",
    experienceLevel: "Entry Level",
    category: "Web Design",
    budget: "$20.00/hour",
    budgetAmount: 20,
    budgetType: "Hourly",
    proposalsCount: 20,
    hiringState: "Still Selecting",
    postedTime: "20 mins ago",
    matchScore: 89,
    description:
      "Have a current landing page for my online course already. Need a designer to polish the layout, improve conversion flow, and add high-converting CTA sections.",
    skills: ["Website Redesign", "Web Design", "Landing Page", "Graphic Design", "UI/UX"],
    isVerified: true,
    escrowStatus: "Verified Payment Method",
  },
  {
    id: "opp_3",
    title: "Web Designer for E-Commerce Website",
    clientName: "Rahim Chowdhury",
    clientCompany: "Bengal Retail Co.",
    location: "India",
    experienceLevel: "Intermediate",
    category: "Web Design",
    budget: "$25.00/hour",
    budgetAmount: 25,
    budgetType: "Hourly",
    proposalsCount: 15,
    hiringState: "Still Selecting",
    postedTime: "25 mins ago",
    matchScore: 92,
    description:
      "Install new e-commerce responsive theme, redesign navigation menu, layout product catalog grids, and create custom mobile checkout views.",
    skills: ["Web Design", "Responsive Design", "Web Development", "Tailwind CSS", "Shopify"],
    isVerified: true,
    escrowStatus: "Pre-Funded in Escrow",
  },
  {
    id: "opp_4",
    title: "SaaS Dashboard Redesign & Design System Architect",
    clientName: "Emily Tremblay",
    clientCompany: "CloudPeak Analytics",
    location: "Canada",
    experienceLevel: "Expert",
    category: "Web Design",
    budget: "$50.00/hour",
    budgetAmount: 50,
    budgetType: "Hourly",
    proposalsCount: 19,
    hiringState: "1 Interviewing",
    postedTime: "35 mins ago",
    matchScore: 97,
    description:
      "We're looking for a design systems architect who can help us redesign our B2B SaaS analytics portal in Figma and translate tokens to Next.js Tailwind components.",
    skills: ["Web Design", "Design Systems", "Figma", "Prototyping", "Next.js"],
    isVerified: true,
    escrowStatus: "Dual Consensus Ready",
  },
  {
    id: "opp_5",
    title: "Enterprise Smart Escrow Integration for Solana Pay",
    clientName: "Arthur Vance",
    clientCompany: "FinTech Labs Inc.",
    location: "United States",
    experienceLevel: "Expert",
    category: "Smart Contracts",
    budget: "$3,800.00 fixed",
    budgetAmount: 3800,
    budgetType: "Fixed Price",
    proposalsCount: 8,
    hiringState: "Still Selecting",
    postedTime: "2 hours ago",
    matchScore: 95,
    description:
      "Construct cross-border payment settlement rails with dual SHA-256 state consensus, cryptographic signature verification, and automated webhook recovery.",
    skills: ["TypeScript", "Next.js", "Solana Pay", "PayPal REST v2", "State Machines"],
    isVerified: true,
    escrowStatus: "Pre-Funded in Escrow",
  },
  {
    id: "opp_6",
    title: "Multi-Tenant PDF Invoice Rendering Worker Pool",
    clientName: "Elena Rostova",
    clientCompany: "Apex Retail Group",
    location: "United Kingdom",
    experienceLevel: "Intermediate",
    category: "Full Stack Development",
    budget: "$2,800.00 fixed",
    budgetAmount: 2800,
    budgetType: "Fixed Price",
    proposalsCount: 6,
    hiringState: "Still Selecting",
    postedTime: "4 hours ago",
    matchScore: 91,
    description:
      "Design a zero-leak multi-tenant PDF invoice rendering worker pool using headless Chromium, AWS S3 signed uploads, and automated receipt generation.",
    skills: ["Node.js", "TypeScript", "Puppeteer", "AWS S3", "Docker"],
    isVerified: true,
    escrowStatus: "Pre-Funded in Escrow",
  },
  {
    id: "opp_7",
    title: "High-Throughput Webhook Ingest Relay & Telemetry Simulator",
    clientName: "Marcus Chen",
    clientCompany: "Nova Cloud Inc.",
    location: "Singapore",
    experienceLevel: "Intermediate",
    category: "Full Stack Development",
    budget: "$75.00/hour",
    budgetAmount: 75,
    budgetType: "Hourly",
    proposalsCount: 4,
    hiringState: "Still Selecting",
    postedTime: "1 day ago",
    matchScore: 88,
    description:
      "Build a resilient webhook relay that captures order notifications, simulates failovers with chaos injection, and logs consensus hashes to our audit trail.",
    skills: ["TypeScript", "Redis", "Go", "Next.js", "PayPal Sandbox"],
    isVerified: true,
    escrowStatus: "Dual Consensus Ready",
  },
  {
    id: "opp_8",
    title: "AI Customer Support Platform Copilot Integration",
    clientName: "Sarah Jenkins",
    clientCompany: "Aura Creative AI",
    location: "Remote",
    experienceLevel: "Expert",
    category: "AI & Machine Learning",
    budget: "$4,500.00 fixed",
    budgetAmount: 4500,
    budgetType: "Fixed Price",
    proposalsCount: 11,
    hiringState: "Still Selecting",
    postedTime: "2 days ago",
    matchScore: 96,
    description:
      "Integrate an autonomous multi-turn customer support copilot with streaming SSE events, vector embeddings, and verified milestone deliverable escrow.",
    skills: ["Python", "OpenAI API", "LangChain", "Next.js 15", "Tailwind CSS"],
    isVerified: true,
    escrowStatus: "Pre-Funded in Escrow",
  },
];

function mapClientProjectToOpportunity(p: any): ProjectOpportunity {
  const budgetCents = p.budgetCents || 0;
  const budgetAmt = budgetCents > 0 ? budgetCents / 100 : parseFloat(p.budgetAmount) || 0;
  return {
    id: p.id,
    title: p.title || p.name || "Untitled Project",
    clientName: p.clientName || p.client?.name || "Client",
    clientCompany: p.clientCompany || p.client?.company || (p.clientName ? `${p.clientName} Team` : "Client Team"),
    location: p.location || "Remote",
    experienceLevel: (p.experienceLevel === "EXPERT"
      ? "Expert"
      : p.experienceLevel === "MID"
      ? "Intermediate"
      : "Entry Level") as any,
    category: (p.category || "Full Stack Development") as any,
    budget:
      p.budgetType === "Hourly"
        ? `$${budgetAmt.toFixed(2)}/hour`
        : `$${budgetAmt.toLocaleString("en-US", { minimumFractionDigits: 2 })} fixed`,
    budgetAmount: budgetAmt,
    budgetType: p.budgetType === "Hourly" ? "Hourly" : "Fixed Price",
    proposalsCount: 0,
    hiringState: "Still Selecting",
    postedTime: p.lastUpdated || "Recently",
    matchScore: 95,
    description: p.description || p.overview || "",
    skills:
      Array.isArray(p.skills) && p.skills.length > 0
        ? p.skills
        : Array.isArray(p.requiredSkills) && p.requiredSkills.length > 0
        ? p.requiredSkills
        : ["Web Development", "TypeScript"],
    isVerified: true,
    escrowStatus: "Pre-Funded in Escrow",
  };
}

function loadLocalOpportunities(): ProjectOpportunity[] {
  if (typeof window === "undefined") return OPPORTUNITIES;
  try {
    const raw = getLocalProjects();
    const published = (raw || [])
      .filter((p: any) => p && p.status !== "DRAFT" && p.state !== "DRAFT")
      .map(mapClientProjectToOpportunity);

    const map = new Map<string, ProjectOpportunity>();
    // User's own published client projects first
    for (const p of published) map.set(p.id, p);
    // Baseline opportunities
    for (const opp of OPPORTUNITIES) {
      if (!map.has(opp.id)) map.set(opp.id, opp);
    }
    return Array.from(map.values());
  } catch {
    return OPPORTUNITIES;
  }
}

interface FreelancerFindProjectsViewProps {
  onApplyProject: (project: ProjectOpportunity) => void;
  showToast: (msg: string) => void;
}

export default function FreelancerFindProjectsView({
  onApplyProject,
  showToast,
}: FreelancerFindProjectsViewProps) {
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");

  // Filters state
  const [selectedCategory, setSelectedCategory] = useState<string>("All Categories");
  const [selectedExperience, setSelectedExperience] = useState<string>("Any");
  const [projectType, setProjectType] = useState<"All" | "Hourly" | "Fixed Price">("All");
  const [selectedBudgetTier, setSelectedBudgetTier] = useState<string>("Any");
  const [selectedProposalsTier, setSelectedProposalsTier] = useState<string>("Any");
  const [verifiedEscrowOnly, setVerifiedEscrowOnly] = useState(false);

  // Layout & Sorting state
  const [sortBy, setSortBy] = useState<"newest" | "budget_high" | "match_high" | "fewest_proposals">("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Interaction state - initialized with user's client projects and baseline opportunities
  const [savedProjectIds, setSavedProjectIds] = useState<string[]>([]);
  const [appliedProjectIds, setAppliedProjectIds] = useState<string[]>([]);
  const [backendProjects, setBackendProjects] = useState<ProjectOpportunity[]>(() => loadLocalOpportunities());
  const [isLiveLoaded, setIsLiveLoaded] = useState(false);

  // Load live projects from Express backend
  useEffect(() => {
    let isCurrent = true;
    searchFreelancerProjects({
      q: searchQuery,
      location: locationQuery,
      category: selectedCategory === "All Categories" ? undefined : selectedCategory,
      sortBy,
    })
      .then((res) => {
        if (!isCurrent) return;
        const localOpp = loadLocalOpportunities();
        const map = new Map<string, ProjectOpportunity>();

        // 1. Add server live projects if returned
        if (res.success && Array.isArray(res.projects) && res.projects.length > 0) {
          const mappedServer: ProjectOpportunity[] = res.projects.map((p) => {
            const hasCents = typeof p.budgetCents === "number" && !isNaN(p.budgetCents);
            const budgetAmt = p.budgetAmount ?? (hasCents ? p.budgetCents / 100 : 0);
            return {
              id: p.id,
              title: p.title || "Untitled Project",
              clientName: p.client?.name || "Client",
              clientCompany: p.client?.company || (p.client?.name ? `${p.client.name} Team` : "Client Team"),
              location: p.location || "Remote",
              experienceLevel: (p.experienceLevel === "EXPERT"
                ? "Expert"
                : p.experienceLevel === "MID"
                ? "Intermediate"
                : "Entry Level") as any,
              category: p.category as any,
              budget:
                p.budgetType === "Hourly"
                  ? `$${budgetAmt.toFixed(2)}/hour`
                  : `$${budgetAmt.toLocaleString("en-US", { minimumFractionDigits: 2 })} fixed`,
              budgetAmount: budgetAmt,
              budgetType: p.budgetType === "Hourly" ? "Hourly" : "Fixed Price",
              proposalsCount: p.proposalsCount || 0,
              hiringState:
                (p.proposalsCount || 0) > 10 ? "Urgent Need" : (p.proposalsCount || 0) > 5 ? "1 Interviewing" : "Still Selecting",
              postedTime: p.postedAt ? new Date(p.postedAt).toLocaleDateString() : "Recently",
              matchScore: 92,
              description: p.description || "",
              skills: Array.isArray(p.skills) ? p.skills : [],
              isVerified: Boolean(p.client?.isVerified),
              escrowStatus: p.client?.isVerified ? "Pre-Funded in Escrow" : "Verified Payment Method",
            };
          });
          for (const s of mappedServer) map.set(s.id, s);
        }

        // 2. Add local client projects and baseline opportunities
        for (const loc of localOpp) {
          if (!map.has(loc.id)) map.set(loc.id, loc);
        }

        setBackendProjects(Array.from(map.values()));
        if (res.success && res.projects) {
          setSavedProjectIds(res.projects.filter((p) => p.isSaved).map((p) => p.id));
        }
        setIsLiveLoaded(true);
      })
      .catch(() => {
        if (isCurrent) {
          setBackendProjects(loadLocalOpportunities());
          setIsLiveLoaded(true);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [searchQuery, locationQuery, selectedCategory, sortBy]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery("");
    setLocationQuery("");
    setSelectedCategory("All Categories");
    setSelectedExperience("Any");
    setProjectType("All");
    setSelectedBudgetTier("Any");
    setSelectedProposalsTier("Any");
    setVerifiedEscrowOnly(false);
    showToast("Filters reset to default.");
  };

  const toggleSave = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (savedProjectIds.includes(id)) {
      setSavedProjectIds((prev) => prev.filter((i) => i !== id));
      showToast("Project removed from saved bookmarks.");
      await unsaveFreelancerProject(id).catch(() => {});
    } else {
      setSavedProjectIds((prev) => [...prev, id]);
      showToast("Project saved to your saved opportunities!");
      await saveFreelancerProject(id).catch(() => {});
    }
  };

  const handleApply = (opp: ProjectOpportunity) => {
    if (appliedProjectIds.includes(opp.id)) {
      showToast(`You have already submitted a proposal for ${opp.title}.`);
      return;
    }
    // Call parent handler to open modal/flow
    onApplyProject(opp);
    // Mark as applied
    setAppliedProjectIds((prev) => [...prev, opp.id]);
  };

  // Filter & Sort Logic
  const filteredProjects = useMemo(() => {
    const baseList = backendProjects.length > 0 ? backendProjects : OPPORTUNITIES;
    return baseList.filter((opp) => {
      // 1. Text Search (title, company, description, skills)
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        opp.title.toLowerCase().includes(q) ||
        opp.clientCompany.toLowerCase().includes(q) ||
        opp.description.toLowerCase().includes(q) ||
        opp.skills.some((s) => s.toLowerCase().includes(q));

      // 2. Location Search
      const loc = locationQuery.toLowerCase().trim();
      const matchesLocation = !loc || opp.location.toLowerCase().includes(loc);

      // 3. Category Filter
      const catLower = (opp.category || "").toLowerCase();
      const selCatLower = selectedCategory.toLowerCase();
      const matchesCategory =
        selectedCategory === "All Categories" ||
        opp.category === selectedCategory ||
        (selCatLower.includes("web") && (catLower.includes("web") || catLower.includes("development"))) ||
        (selCatLower.includes("full stack") && (catLower.includes("development") || catLower.includes("web"))) ||
        (selCatLower.includes("ai") && catLower.includes("ai")) ||
        (selCatLower.includes("contract") && catLower.includes("smart"));

      // 4. Experience Level Filter
      const matchesExperience =
        selectedExperience === "Any" || opp.experienceLevel === selectedExperience;

      // 5. Project Type Filter
      const matchesType =
        projectType === "All" || opp.budgetType === projectType;

      // 6. Budget Tier Filter
      let matchesBudget = true;
      if (selectedBudgetTier === "under_50") {
        matchesBudget = opp.budgetAmount < 50;
      } else if (selectedBudgetTier === "50_100") {
        matchesBudget = opp.budgetAmount >= 50 && opp.budgetAmount <= 100;
      } else if (selectedBudgetTier === "1k_5k") {
        matchesBudget = opp.budgetAmount >= 1000 && opp.budgetAmount <= 5000;
      } else if (selectedBudgetTier === "5k_plus") {
        matchesBudget = opp.budgetAmount > 5000;
      }

      // 7. Proposals Count Filter
      let matchesProposals = true;
      if (selectedProposalsTier === "under_5") {
        matchesProposals = opp.proposalsCount < 5;
      } else if (selectedProposalsTier === "5_10") {
        matchesProposals = opp.proposalsCount >= 5 && opp.proposalsCount <= 10;
      } else if (selectedProposalsTier === "10_15") {
        matchesProposals = opp.proposalsCount >= 10 && opp.proposalsCount <= 15;
      } else if (selectedProposalsTier === "15_plus") {
        matchesProposals = opp.proposalsCount > 15;
      }

      // 8. Verified Escrow Only
      const matchesEscrow = !verifiedEscrowOnly || opp.isVerified;

      return (
        matchesSearch &&
        matchesLocation &&
        matchesCategory &&
        matchesExperience &&
        matchesType &&
        matchesBudget &&
        matchesProposals &&
        matchesEscrow
      );
    }).sort((a, b) => {
      if (sortBy === "budget_high") {
        return b.budgetAmount - a.budgetAmount;
      }
      if (sortBy === "match_high") {
        return b.matchScore - a.matchScore;
      }
      if (sortBy === "fewest_proposals") {
        return a.proposalsCount - b.proposalsCount;
      }
      // default newest
      return 0;
    });
  }, [
    searchQuery,
    locationQuery,
    selectedCategory,
    selectedExperience,
    projectType,
    selectedBudgetTier,
    selectedProposalsTier,
    verifiedEscrowOnly,
    sortBy,
    backendProjects,
    isLiveLoaded,
  ]);

  return (
    <div className="space-y-6">
      {/* ==============================================================
          1. TOP SEARCH & LOCATION BAR (MATCHING REFERENCE IMAGE)
         ============================================================== */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-4 shadow-xs">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Keyword Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by keywords, skill or title (e.g. Web Design)..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200/60"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Location Input */}
          <div className="relative w-full lg:w-72">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={locationQuery}
              onChange={(e) => setLocationQuery(e.target.value)}
              placeholder="City, state, country or Remote..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition shadow-2xs"
            />
            {locationQuery && (
              <button
                type="button"
                onClick={() => setLocationQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200/60"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={() => showToast(`Found ${filteredProjects.length} projects matching your search.`)}
            className="px-6 py-2.5 rounded-xl bg-[#0f172a] hover:bg-[#4f46e5] text-white font-bold text-xs sm:text-sm shadow-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-98 shrink-0"
          >
            <Search className="w-4 h-4" />
            <span>Find Projects</span>
          </button>
        </div>
      </div>

      {/* ==============================================================
          2. TWO-COLUMN LAYOUT: FILTERS SIDEBAR + RESULTS GRID
         ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ============================================================
            LEFT FILTER SIDEBAR (~3 OF 12 COLUMNS) - STICKY AT BOTTOM/TOP
           ============================================================ */}
        <aside
          className="lg:col-span-3 lg:sticky lg:self-start space-y-5"
          style={{ top: "min(1.5rem, calc(100vh - 100% - 1.5rem))" }}
        >
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-6">
            {/* Header with Reset */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#4f46e5]" />
                <span>Filters</span>
              </h3>
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition cursor-pointer flex items-center gap-1 hover:underline"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            {/* Filter 1: Category */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 tracking-tight">
                Category
              </label>
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 pr-8 rounded-xl border border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-800 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer shadow-2xs"
                >
                  <option value="All Categories">Select category (All)</option>
                  <option value="Web Design">Web Design & UI/UX</option>
                  <option value="Full Stack Development">Full Stack Development</option>
                  <option value="AI & Machine Learning">AI & Machine Learning</option>
                  <option value="Smart Contracts">Smart Contracts & Web3</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Filter 2: Experience Level */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-slate-700 tracking-tight">
                Experience Level
              </label>
              <div className="space-y-2 text-xs">
                {[
                  { id: "Any", label: "Any", count: backendProjects.length },
                  {
                    id: "Entry Level",
                    label: "Entry Level",
                    count: backendProjects.filter((o) => o.experienceLevel === "Entry Level").length,
                  },
                  {
                    id: "Intermediate",
                    label: "Intermediate",
                    count: backendProjects.filter((o) => o.experienceLevel === "Intermediate").length,
                  },
                  {
                    id: "Expert",
                    label: "Expert",
                    count: backendProjects.filter((o) => o.experienceLevel === "Expert").length,
                  },
                ].map((tier) => (
                  <label
                    key={tier.id}
                    className="flex items-center justify-between gap-2 p-1 rounded-lg hover:bg-slate-50 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="experienceLevel"
                        checked={selectedExperience === tier.id}
                        onChange={() => setSelectedExperience(tier.id)}
                        className="w-3.5 h-3.5 text-[#4f46e5] focus:ring-indigo-500 rounded border-slate-300 cursor-pointer"
                      />
                      <span className="text-slate-700 font-medium">{tier.label}</span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">{tier.count}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Filter 3: Project Type (Segmented Toggle) */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 tracking-tight">
                Project Type
              </label>
              <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100 border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setProjectType(projectType === "Hourly" ? "All" : "Hourly")}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    projectType === "Hourly"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Hourly
                </button>
                <button
                  type="button"
                  onClick={() => setProjectType(projectType === "Fixed Price" ? "All" : "Fixed Price")}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    projectType === "Fixed Price"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Fixed Price
                </button>
              </div>

              {/* Price Tier Radio List */}
              <div className="space-y-2 pt-1 text-xs">
                {[
                  { id: "Any", label: "Any budget range" },
                  { id: "under_50", label: "Under $50 / hr" },
                  { id: "50_100", label: "$50 to $100 / hr" },
                  { id: "1k_5k", label: "$1,000 to $5,000 fixed" },
                  { id: "5k_plus", label: "$5,000+ fixed" },
                ].map((pTier) => (
                  <label
                    key={pTier.id}
                    className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-slate-50 cursor-pointer select-none"
                  >
                    <input
                      type="radio"
                      name="budgetTier"
                      checked={selectedBudgetTier === pTier.id}
                      onChange={() => setSelectedBudgetTier(pTier.id)}
                      className="w-3.5 h-3.5 text-[#4f46e5] focus:ring-indigo-500 rounded border-slate-300 cursor-pointer"
                    />
                    <span className="text-slate-700 font-medium">{pTier.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Filter 4: Number of Proposals */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-slate-700 tracking-tight">
                Number of Proposals
              </label>
              <div className="space-y-2 text-xs">
                {[
                  { id: "Any", label: "Any proposals" },
                  { id: "under_5", label: "Less than 5 (High Win Rate)" },
                  { id: "5_10", label: "5 to 10" },
                  { id: "10_15", label: "10 to 15" },
                  { id: "15_plus", label: "15+" },
                ].map((propTier) => (
                  <label
                    key={propTier.id}
                    className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-slate-50 cursor-pointer select-none"
                  >
                    <input
                      type="radio"
                      name="proposalsTier"
                      checked={selectedProposalsTier === propTier.id}
                      onChange={() => setSelectedProposalsTier(propTier.id)}
                      className="w-3.5 h-3.5 text-[#4f46e5] focus:ring-indigo-500 rounded border-slate-300 cursor-pointer"
                    />
                    <span className="text-slate-700 font-medium">{propTier.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Filter 5: Verified Escrow Only Guarantee */}
            <div className="pt-2 border-t border-slate-100">
              <label className="flex items-start gap-2.5 p-2 rounded-xl bg-indigo-50/60 border border-indigo-100 cursor-pointer select-none hover:bg-indigo-50 transition">
                <input
                  type="checkbox"
                  checked={verifiedEscrowOnly}
                  onChange={(e) => setVerifiedEscrowOnly(e.target.checked)}
                  className="w-4 h-4 mt-0.5 text-[#4f46e5] focus:ring-indigo-500 rounded border-slate-300 cursor-pointer"
                />
                <div>
                  <div className="text-xs font-bold text-indigo-950 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#4f46e5]" />
                    <span>Nexum Escrow Backed</span>
                  </div>
                  <p className="text-[11px] text-indigo-800/80 mt-0.5 leading-snug">
                    Show only clients with verified deposit and dual SHA-256 agreement rails.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </aside>

        {/* ============================================================
            RIGHT MAIN CONTENT AREA (~9 OF 12 COLUMNS)
           ============================================================ */}
        <div className="lg:col-span-9 space-y-4">
          {/* Results Bar Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-slate-200/90 bg-white shadow-xs">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Showing Results
              </h2>
              <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                {filteredProjects.length} available
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Sort By Dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(
                      e.target.value as
                        | "newest"
                        | "budget_high"
                        | "match_high"
                        | "fewest_proposals"
                    )
                  }
                  className="px-3 py-1.5 pr-8 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white text-xs font-semibold text-slate-700 transition cursor-pointer appearance-none shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="newest">Sort by: Newest</option>
                  <option value="budget_high">Highest Budget</option>
                  <option value="match_high">Best Skill Match</option>
                  <option value="fewest_proposals">Fewest Proposals</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* View Switch: Grid vs List */}
              <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    viewMode === "list"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-400 hover:text-slate-700"
                  }`}
                  title="List View"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    viewMode === "grid"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-400 hover:text-slate-700"
                  }`}
                  title="Grid View"
                >
                  <Grid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Empty state if nothing matches */}
          {filteredProjects.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-[#4f46e5] mx-auto flex items-center justify-center">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No matching projects found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Try widening your search terms or resetting filters to explore all available verified client projects.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-[#4f46e5] text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          )}

          {/* ==========================================================
              PROJECT CARDS: GRID VIEW (2 COLUMNS)
             ========================================================== */}
          {viewMode === "grid" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProjects.map((opp) => {
                const isSaved = savedProjectIds.includes(opp.id);
                const isApplied = appliedProjectIds.includes(opp.id);

                return (
                  <div
                    key={opp.id}
                    className="p-5 rounded-2xl border border-slate-200/90 bg-white hover:border-[#4f46e5]/40 hover:shadow-xs transition-all duration-200 flex flex-col justify-between space-y-4 group"
                  >
                    {/* Top Row: Experience Badge + Posted Time + Bookmark */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-slate-100 text-slate-700 border border-slate-200/80">
                          {opp.experienceLevel}
                        </span>
                        <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5 text-purple-600" />
                          <span>{opp.matchScore}% Match</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                        <span>{opp.postedTime}</span>
                        <button
                          type="button"
                          onClick={(e) => toggleSave(opp.id, e)}
                          className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-50 transition cursor-pointer"
                          title={isSaved ? "Remove bookmark" : "Save project"}
                        >
                          {isSaved ? (
                            <BookmarkCheck className="w-4 h-4 text-[#4f46e5] fill-indigo-100" />
                          ) : (
                            <Bookmark className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Middle Section: Title + Badges + Description Snippet */}
                    <div className="space-y-2">
                      <h3 className="font-bold text-sm sm:text-base text-slate-900 group-hover:text-[#4f46e5] transition-colors leading-snug line-clamp-2">
                        {opp.title}
                      </h3>

                      {/* Verification + Location + Hiring Status */}
                      <div className="flex flex-wrap items-center gap-2 text-xs pt-0.5">
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md text-[10px] border border-emerald-200/80">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Verified</span>
                        </span>

                        <span className="inline-flex items-center gap-1 text-slate-500 font-medium text-[11px]">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{opp.location}</span>
                        </span>

                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                            opp.hiringState === "Still Selecting"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                              : "bg-amber-50 text-amber-700 border border-amber-200/80"
                          }`}
                        >
                          <Clock className="w-2.5 h-2.5" />
                          <span>{opp.hiringState}</span>
                        </span>
                      </div>

                      {/* Snippet */}
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed pt-1">
                        {opp.description}
                      </p>
                    </div>

                    {/* Skill Tags */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {opp.skills.map((skill) => (
                        <span
                          key={skill}
                          className="px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 text-[10px] font-medium border border-slate-200/70"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>

                    {/* Footer Row: Budget + Proposals Count + Apply Button */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-mono font-bold text-sm text-slate-900 flex items-center gap-1">
                          <span className="text-[#4f46e5] font-extrabold">$</span>
                          <span>{opp.budget.replace("$", "")}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <FileText className="w-3 h-3" />
                          <span>{opp.proposalsCount} proposals</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleApply(opp)}
                        disabled={isApplied}
                        className={`px-4 py-2 rounded-xl font-bold text-xs transition cursor-pointer shadow-xs active:scale-98 shrink-0 flex items-center gap-1.5 ${
                          isApplied
                            ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                            : "bg-[#0f172a] hover:bg-[#4f46e5] text-white"
                        }`}
                      >
                        <span>{isApplied ? "Applied ✓" : "Apply Now"}</span>
                        {!isApplied && <ArrowRight className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ==========================================================
              PROJECT CARDS: LIST VIEW (HORIZONTAL ELEVATED ROWS)
             ========================================================== */}
          {viewMode === "list" && (
            <div className="space-y-3">
              {filteredProjects.map((opp) => {
                const isSaved = savedProjectIds.includes(opp.id);
                const isApplied = appliedProjectIds.includes(opp.id);

                return (
                  <div
                    key={opp.id}
                    className="p-5 rounded-2xl border border-slate-200/90 bg-white hover:border-[#4f46e5]/40 hover:shadow-xs transition-all duration-200 space-y-4 group"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-slate-100 text-slate-700 border border-slate-200/80">
                            {opp.experienceLevel}
                          </span>
                          <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5 text-purple-600" />
                            <span>{opp.matchScore}% Match</span>
                          </span>
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md text-[10px] border border-emerald-200/80">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Verified Client</span>
                          </span>
                          <span className="inline-flex items-center gap-1 text-slate-500 font-medium text-[11px]">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{opp.location}</span>
                          </span>
                          <span className="text-slate-400 text-[11px]">· {opp.postedTime}</span>
                        </div>

                        <h3 className="font-bold text-base text-slate-900 group-hover:text-[#4f46e5] transition-colors">
                          {opp.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                        <button
                          type="button"
                          onClick={(e) => toggleSave(opp.id, e)}
                          className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white text-slate-400 hover:text-indigo-600 transition cursor-pointer shadow-2xs"
                        >
                          {isSaved ? (
                            <BookmarkCheck className="w-4 h-4 text-[#4f46e5] fill-indigo-100" />
                          ) : (
                            <Bookmark className="w-4 h-4" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleApply(opp)}
                          disabled={isApplied}
                          className={`px-4 py-2 rounded-xl font-bold text-xs transition cursor-pointer shadow-xs active:scale-98 flex items-center gap-1.5 ${
                            isApplied
                              ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                              : "bg-[#0f172a] hover:bg-[#4f46e5] text-white"
                          }`}
                        >
                          <span>{isApplied ? "Applied ✓" : "Apply Now"}</span>
                          {!isApplied && <ArrowRight className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed">
                      {opp.description}
                    </p>

                    <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex flex-wrap gap-1.5">
                        {opp.skills.map((skill) => (
                          <span
                            key={skill}
                            className="px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 text-[10px] font-medium border border-slate-200/70"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="font-mono font-bold text-sm text-slate-900">
                          {opp.budget}
                        </div>
                        <span className="text-slate-300">·</span>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {opp.proposalsCount} proposals
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
