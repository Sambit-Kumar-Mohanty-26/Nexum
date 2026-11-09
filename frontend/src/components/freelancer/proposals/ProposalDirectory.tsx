"use client";

import React, { useMemo } from "react";
import ProposalFilterToolbar from "./ProposalFilterToolbar";
import ProposalCard from "./ProposalCard";
import {
  FreelancerProposalItem,
  ProposalSummaryKPIs,
} from "@/lib/freelancer-proposals-types";

interface ProposalDirectoryProps {
  proposals: FreelancerProposalItem[];
  selectedProposalId: string;
  onSelectProposal: (id: string) => void;
  selectedStatus: string;
  onSelectStatus: (status: string) => void;
  kpis: ProposalSummaryKPIs;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  projectType: string;
  onProjectTypeChange: (type: string) => void;
  budgetFilter: string;
  onBudgetFilterChange: (b: string) => void;
  dateFilter: string;
  onDateFilterChange: (d: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
}

export default function ProposalDirectory({
  proposals,
  selectedProposalId,
  onSelectProposal,
  selectedStatus,
  onSelectStatus,
  kpis,
  searchQuery,
  onSearchChange,
  projectType,
  onProjectTypeChange,
  budgetFilter,
  onBudgetFilterChange,
  dateFilter,
  onDateFilterChange,
  sortBy,
  onSortChange,
}: ProposalDirectoryProps) {
  const filteredProposals = useMemo(() => {
    return proposals
      .filter((p) => {
        // Status filter (treat SUBMITTED as UNDER_REVIEW for client evaluation)
        if (selectedStatus !== "ALL") {
          if (selectedStatus === "UNDER_REVIEW") {
            if (p.status !== "UNDER_REVIEW" && p.status !== "SUBMITTED") {
              return false;
            }
          } else if (p.status !== selectedStatus) {
            return false;
          }
        }

        // Project Type filter
        if (projectType !== "ALL" && p.offer.priceType !== projectType) {
          return false;
        }

        // Budget filter
        const priceNum = parseFloat((p.offer.priceDisplay || "").replace(/[^0-9.]/g, "")) || 0;
        if (budgetFilter === "UNDER_50K" && priceNum > 5000) {
          return false;
        } else if (budgetFilter === "ABOVE_100K" && priceNum < 5000) {
          return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = p.projectTitle.toLowerCase().includes(q);
          const matchClient = p.client.companyName.toLowerCase().includes(q);
          const matchTags = p.techTags.some((t) => t.toLowerCase().includes(q));
          return matchTitle || matchClient || matchTags;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "OLDEST") {
          return a.submittedDate.localeCompare(b.submittedDate);
        }
        if (sortBy === "BUDGET_HIGH") {
          return b.clientBrief.budgetRange.localeCompare(a.clientBrief.budgetRange);
        }
        if (sortBy === "BUDGET_LOW") {
          return a.clientBrief.budgetRange.localeCompare(b.clientBrief.budgetRange);
        }
        // Default: NEWEST
        return b.submittedDate.localeCompare(a.submittedDate);
      });
  }, [
    proposals,
    selectedStatus,
    projectType,
    budgetFilter,
    searchQuery,
    sortBy,
  ]);

  return (
    <div className="space-y-4">
      <ProposalFilterToolbar
        selectedStatus={selectedStatus}
        onSelectStatus={onSelectStatus}
        kpis={kpis}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        projectType={projectType}
        onProjectTypeChange={onProjectTypeChange}
        budgetFilter={budgetFilter}
        onBudgetFilterChange={onBudgetFilterChange}
        dateFilter={dateFilter}
        onDateFilterChange={onDateFilterChange}
        sortBy={sortBy}
        onSortChange={onSortChange}
      />

      <div className="space-y-3">
        {filteredProposals.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white border border-slate-200/90 text-slate-500">
            <p className="text-sm font-semibold">No proposals match your filters.</p>
            <p className="text-xs text-slate-400 mt-1">
              Try adjusting your search query or selecting a different status tab.
            </p>
          </div>
        ) : (
          filteredProposals.map((prop) => (
            <ProposalCard
              key={prop.id}
              proposal={prop}
              isSelected={prop.id === selectedProposalId}
              onSelect={() => onSelectProposal(prop.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

