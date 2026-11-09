"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  ArrowRight,
  Search,
  CheckCircle2,
  Briefcase,
  DollarSign,
  Building2,
  Clock,
  RotateCcw,
  Eye,
  Layers,
  AlertCircle,
} from "lucide-react";
import { FreelancerProposalItem } from "@/lib/freelancer-proposals-types";
import { searchFreelancerProjects, fetchFreelancerProposals } from "@/lib/api-client";

interface ProposalBuilderModalProps {
  existingProposals?: FreelancerProposalItem[];
  onSelectExistingProposal?: (proposalId: string) => void;
  onClose: () => void;
  onSubmitNewProposal?: (newProposal: FreelancerProposalItem) => void;
}

export default function ProposalBuilderModal({
  existingProposals: propExistingProposals,
  onSelectExistingProposal,
  onClose,
}: ProposalBuilderModalProps) {
  const router = useRouter();
  const [availableProjects, setAvailableProjects] = useState<any[]>([]);
  const [existingProposals, setExistingProposals] = useState<FreelancerProposalItem[]>(
    propExistingProposals || []
  );
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const [projRes, propRes] = await Promise.all([
          searchFreelancerProjects({ limit: 50 }),
          propExistingProposals && propExistingProposals.length > 0
            ? Promise.resolve({ success: true, proposals: propExistingProposals })
            : fetchFreelancerProposals({ pageSize: 50 }),
        ]);

        if (mounted && projRes.success && projRes.projects && projRes.projects.length > 0) {
          setAvailableProjects(projRes.projects);
          setSelectedProjectId(projRes.projects[0].id);
        }

        if (mounted && propRes.success && propRes.proposals) {
          setExistingProposals(propRes.proposals as any as FreelancerProposalItem[]);
        }
      } catch (err) {
        console.warn("Could not fetch available opportunities or proposals", err);
      } finally {
        if (mounted) setIsLoadingProjects(false);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, [propExistingProposals]);

  const proposalMap = useMemo(() => {
    const map = new Map<string, FreelancerProposalItem>();
    for (const p of existingProposals) {
      if (p.projectId) {
        // Prioritize non-withdrawn proposals
        if (!map.has(p.projectId) || p.status !== "WITHDRAWN") {
          map.set(p.projectId, p);
        }
      }
    }
    return map;
  }, [existingProposals]);

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return availableProjects;
    const q = searchQuery.toLowerCase().trim();
    return availableProjects.filter((p) => {
      const matchTitle = (p.title || "").toLowerCase().includes(q);
      const matchClient = (p.client?.name || p.client?.company || "").toLowerCase().includes(q);
      const matchSkills = Array.isArray(p.skills) && p.skills.some((s: string) => s.toLowerCase().includes(q));
      const matchCategory = (p.category || "").toLowerCase().includes(q);
      return matchTitle || matchClient || matchSkills || matchCategory;
    });
  }, [availableProjects, searchQuery]);

  const selectedProject = useMemo(() => {
    return availableProjects.find((p) => p.id === selectedProjectId) || null;
  }, [availableProjects, selectedProjectId]);

  const selectedExistingProposal = useMemo(() => {
    if (!selectedProjectId) return null;
    return proposalMap.get(selectedProjectId) || null;
  }, [proposalMap, selectedProjectId]);

  const isSelectedActiveSubmitted =
    selectedExistingProposal &&
    selectedExistingProposal.status !== "WITHDRAWN" &&
    selectedExistingProposal.status !== "REJECTED";

  const isSelectedRejected =
    selectedExistingProposal && selectedExistingProposal.status === "REJECTED";

  const handleAction = () => {
    if (!selectedProjectId) return;

    if (isSelectedActiveSubmitted) {
      // Direct user to view their existing proposal without allowing duplicate draft
      onClose();
      if (onSelectExistingProposal) {
        onSelectExistingProposal(selectedExistingProposal.id);
      } else {
        router.push(`/freelancer/dashboard?tab=proposals&id=${selectedExistingProposal.id}`);
      }
      return;
    }

    if (isSelectedRejected) {
      // Route user to revise their rejected proposal with feedback
      onClose();
      router.push(
        `/freelancer/projects/${selectedProjectId}/apply?revisionOf=${selectedExistingProposal.id}`
      );
      return;
    }

    // Normal application
    onClose();
    router.push(`/freelancer/projects/${selectedProjectId}/apply`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-[#4f46e5] flex items-center justify-center shrink-0">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Select Project Opportunity
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Choose an active client project to submit your custom proposal, milestone allocation, and technical documents.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects by title, client name, or required skills..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 outline-hidden focus:ring-2 focus:ring-[#4f46e5]/20 focus:border-[#4f46e5] transition"
          />
        </div>

        {/* Project Selection Cards List */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 min-h-[260px] max-h-[380px]">
          {isLoadingProjects ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
              <div className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-400 font-medium">Loading open client opportunities...</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="py-12 text-center space-y-2 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <Layers className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-700">No project opportunities found</p>
              <p className="text-[11px] text-slate-400">
                {searchQuery ? "Try refining your search keyword." : "There are currently no active public projects open for applications."}
              </p>
            </div>
          ) : (
            filteredProjects.map((p) => {
              const isSelected = p.id === selectedProjectId;
              const budgetFormatted = p.budgetCents
                ? `$${(p.budgetCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                : (p.budgetDisplay || "Negotiable");
              const clientOrg = p.client?.company || p.client?.name || "Client Organization";

              const existing = proposalMap.get(p.id);
              const hasActiveProp =
                existing && existing.status !== "WITHDRAWN" && existing.status !== "REJECTED";
              const hasRejectedProp = existing && existing.status === "REJECTED";

              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedProjectId(p.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer relative ${
                    isSelected
                      ? hasActiveProp
                        ? "bg-amber-50/60 border-amber-400 ring-2 ring-amber-500/20 shadow-xs"
                        : hasRejectedProp
                        ? "bg-rose-50/60 border-rose-400 ring-2 ring-rose-500/20 shadow-xs"
                        : "bg-indigo-50/60 border-indigo-400 ring-2 ring-indigo-500/20 shadow-xs"
                      : "bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-extrabold text-slate-900 truncate">
                          {p.title}
                        </span>

                        {hasActiveProp && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-300 shrink-0">
                            <Clock className="w-2.5 h-2.5 text-amber-700" />
                            <span>Applied</span>
                          </span>
                        )}

                        {hasRejectedProp && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-200 shrink-0">
                            <RotateCcw className="w-2.5 h-2.5 text-rose-700" />
                            <span>Declined</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1 font-medium text-slate-600 truncate max-w-[160px]">
                          <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{clientOrg}</span>
                        </span>

                        <span className="text-slate-300">•</span>

                        <span className="inline-flex items-center gap-0.5 font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200/60 font-mono text-[10px]">
                          <DollarSign className="w-2.5 h-2.5 text-emerald-600 -mr-0.5" />
                          <span>{budgetFormatted}</span>
                        </span>

                        {p.budgetType && (
                          <span className="text-[10px] text-slate-400 font-medium capitalize">
                            {p.budgetType.toLowerCase()} Escrow
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Selection Indicator */}
                    <div className="shrink-0">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                          isSelected
                            ? hasActiveProp
                              ? "bg-amber-600 text-white"
                              : hasRejectedProp
                              ? "bg-rose-600 text-white"
                              : "bg-[#4f46e5] text-white"
                            : "border-2 border-slate-300 bg-white"
                        }`}
                      >
                        {isSelected && (
                          <CheckCircle2
                            className={`w-4 h-4 fill-current ${
                              hasActiveProp
                                ? "text-amber-600 fill-white"
                                : hasRejectedProp
                                ? "text-rose-600 fill-white"
                                : "text-indigo-600 fill-white"
                            }`}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 mt-auto">
          <div className="text-xs text-slate-500 truncate max-w-[280px]">
            {selectedProject ? (
              <span>
                Selected: <strong className="text-slate-800">{selectedProject.title}</strong>
              </span>
            ) : (
              <span>Please select a project to proceed</span>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-3.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>

            {isSelectedActiveSubmitted ? (
              <button
                type="button"
                onClick={handleAction}
                className="py-2 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-xs font-bold text-white transition shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>View Submitted Proposal</span>
              </button>
            ) : isSelectedRejected ? (
              <button
                type="button"
                onClick={handleAction}
                className="py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white transition shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Address Feedback & Reapply</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={!selectedProjectId}
                onClick={handleAction}
                className="py-2 px-4 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-xs font-bold text-white transition shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <span>Continue to Proposal Application</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
