"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  Search,
  ChevronDown,
  Layers,
  FolderKanban,
  Receipt,
  Download,
  ShoppingBag,
  BarChart2,
  Bot,
  Smartphone,
  GraduationCap,
  MoreHorizontal,
} from "lucide-react";
import {
  FreelancerTransaction,
  FreelancerInvoice,
  FreelancerProjectEarningsSummary,
} from "@/lib/freelancer-earnings-types";

interface TransactionsTableProps {
  transactions: FreelancerTransaction[];
  invoices: FreelancerInvoice[];
  projectSummaries: FreelancerProjectEarningsSummary[];
  onViewTransaction: (txn: FreelancerTransaction) => void;
  showToast: (msg: string) => void;
}

type TabKey = "transactions" | "milestones" | "projects" | "payout_history" | "invoices";

export default function TransactionsTable({
  transactions,
  invoices,
  projectSummaries,
  onViewTransaction,
  showToast,
}: TransactionsTableProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("transactions");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [dateRangeFilter, setDateRangeFilter] = useState("3M");

  const availableProjects = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((tx) => {
      if (tx.project && tx.project !== "—") set.add(tx.project);
    });
    projectSummaries.forEach((ps) => {
      if (ps.projectName) set.add(ps.projectName);
    });
    return Array.from(set);
  }, [transactions, projectSummaries]);

  // Filtered transactions for Transactions & Payout History tabs
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // If payout history tab, only show Payouts
      if (activeTab === "payout_history" && tx.type !== "Payout") {
        return false;
      }

      // If milestones tab, only show Milestones
      if (activeTab === "milestones" && tx.type !== "Milestone") {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesDesc = tx.description.toLowerCase().includes(q);
        const matchesProj = tx.project.toLowerCase().includes(q);
        const matchesClient = tx.client.toLowerCase().includes(q);
        const matchesSub = tx.subtitle.toLowerCase().includes(q);
        if (!matchesDesc && !matchesProj && !matchesClient && !matchesSub) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== "ALL" && tx.status !== statusFilter) {
        return false;
      }

      // Project filter
      if (projectFilter !== "ALL" && tx.project !== projectFilter) {
        return false;
      }

      // Type filter
      if (typeFilter !== "ALL" && tx.type !== typeFilter) {
        return false;
      }

      return true;
    });
  }, [transactions, activeTab, searchQuery, statusFilter, projectFilter, typeFilter]);

  // Project icon helper
  const renderProjectAvatar = (iconName: string) => {
    switch (iconName) {
      case "shopping-bag":
        return (
          <div className="w-7 h-7 rounded-lg bg-indigo-950 text-indigo-400 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-3.5 h-3.5" />
          </div>
        );
      case "bar-chart-2":
        return (
          <div className="w-7 h-7 rounded-lg bg-slate-900 text-slate-300 flex items-center justify-center shrink-0">
            <BarChart2 className="w-3.5 h-3.5" />
          </div>
        );
      case "bot":
        return (
          <div className="w-7 h-7 rounded-lg bg-amber-950 text-amber-400 flex items-center justify-center shrink-0">
            <Bot className="w-3.5 h-3.5" />
          </div>
        );
      case "smartphone":
        return (
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0">
            <Smartphone className="w-3.5 h-3.5" />
          </div>
        );
      case "graduation-cap":
        return (
          <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <GraduationCap className="w-3.5 h-3.5" />
          </div>
        );
      case "paypal":
        return (
          <div className="w-7 h-7 rounded-lg bg-[#003087]/10 text-[#003087] flex items-center justify-center shrink-0">
            <span className="font-extrabold text-xs italic">P</span>
          </div>
        );
      default:
        return (
          <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <FolderKanban className="w-3.5 h-3.5" />
          </div>
        );
    }
  };

  // Transaction row icon
  const renderTxnRowIcon = (tx: FreelancerTransaction) => {
    if (tx.type === "Payout") {
      return (
        <div className="w-7 h-7 rounded-full bg-blue-50 text-[#0079C1] flex items-center justify-center shrink-0">
          <span className="font-extrabold text-[11px] italic">P</span>
        </div>
      );
    }
    if (tx.type === "Fee") {
      return (
        <div className="w-7 h-7 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
          <Receipt className="w-3.5 h-3.5" />
        </div>
      );
    }
    if (tx.type === "Project") {
      return (
        <div className="w-7 h-7 rounded-full bg-indigo-50 text-[#4f46e5] flex items-center justify-center shrink-0">
          <FolderKanban className="w-3.5 h-3.5" />
        </div>
      );
    }
    return (
      <div className="w-7 h-7 rounded-full bg-indigo-50 text-[#4f46e5] flex items-center justify-center shrink-0">
        <Layers className="w-3.5 h-3.5" />
      </div>
    );
  };

  // Status Badge Helper
  const renderStatusBadge = (status: string) => {
    if (status === "Received") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
          Received
        </span>
      );
    }
    if (status === "Completed") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
          Completed
        </span>
      );
    }
    if (status === "Under Review") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
          Under Review
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
        Pending
      </span>
    );
  };

  const [viewMode, setViewMode] = useState<"grid" | "classic">("grid");
  const onExportCsv = useCallback(() => {
    const headers = ["Date", "Description", "Project", "Client", "Type", "Amount", "Status"];
    const rows = filteredTransactions.map((tx) => [
      `"${tx.date || ""}"`,
      `"${(tx.description || "").replace(/"/g, '""')}"`,
      `"${(tx.project || "").replace(/"/g, '""')}"`,
      `"${(tx.client || "").replace(/"/g, '""')}"`,
      `"${tx.type || ""}"`,
      `"${tx.formattedAmount || ""}"`,
      `"${tx.status || ""}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Nexum_Freelancer_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [filteredTransactions]);

  return (
    <div className="p-4 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
      {/* 1. TAB BAR (Matching Screenshot) */}
      <div className="border-b border-slate-100 flex items-center gap-5 sm:gap-6 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab("transactions")}
          className={`pb-3 text-xs font-bold transition whitespace-nowrap cursor-pointer relative ${
            activeTab === "transactions"
              ? "text-[#4f46e5]"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>Transactions</span>
          {activeTab === "transactions" && (
            <span className="absolute bottom-0 inset-x-0 h-0.5 bg-[#4f46e5] rounded-full" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("milestones")}
          className={`pb-3 text-xs font-bold transition whitespace-nowrap cursor-pointer relative ${
            activeTab === "milestones"
              ? "text-[#4f46e5]"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>Milestones</span>
          {activeTab === "milestones" && (
            <span className="absolute bottom-0 inset-x-0 h-0.5 bg-[#4f46e5] rounded-full" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("projects")}
          className={`pb-3 text-xs font-bold transition whitespace-nowrap cursor-pointer relative ${
            activeTab === "projects"
              ? "text-[#4f46e5]"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>Projects</span>
          {activeTab === "projects" && (
            <span className="absolute bottom-0 inset-x-0 h-0.5 bg-[#4f46e5] rounded-full" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("payout_history")}
          className={`pb-3 text-xs font-bold transition whitespace-nowrap cursor-pointer relative ${
            activeTab === "payout_history"
              ? "text-[#4f46e5]"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>Payout History</span>
          {activeTab === "payout_history" && (
            <span className="absolute bottom-0 inset-x-0 h-0.5 bg-[#4f46e5] rounded-full" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("invoices")}
          className={`pb-3 text-xs font-bold transition whitespace-nowrap cursor-pointer relative ${
            activeTab === "invoices"
              ? "text-[#4f46e5]"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>Invoices</span>
          {activeTab === "invoices" && (
            <span className="absolute bottom-0 inset-x-0 h-0.5 bg-[#4f46e5] rounded-full" />
          )}
        </button>
      </div>

      {/* 2. FILTER & SEARCH TOOLBAR (Matching Screenshot) */}
      {activeTab !== "invoices" && activeTab !== "projects" && (
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search transactions, projects or clients..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 outline-hidden focus:ring-2 focus:ring-[#4f46e5]/20 focus:border-[#4f46e5] transition"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter transactions by status"
              className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 py-2 pl-3 pr-7 rounded-xl transition cursor-pointer outline-hidden focus:ring-2 focus:ring-[#4f46e5]/20"
            >
              <option value="ALL">All Status</option>
              <option value="Received">Received</option>
              <option value="Under Review">Under Review</option>
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
            </select>
            <ChevronDown className="w-3 h-3 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Project Filter */}
          <div className="relative">
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              aria-label="Filter transactions by project"
              className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 py-2 pl-3 pr-7 rounded-xl transition cursor-pointer outline-hidden focus:ring-2 focus:ring-[#4f46e5]/20"
            >
              <option value="ALL">All Projects</option>
              {availableProjects.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Type Filter */}
          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              aria-label="Filter transactions by type"
              className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 py-2 pl-3 pr-7 rounded-xl transition cursor-pointer outline-hidden focus:ring-2 focus:ring-[#4f46e5]/20"
            >
              <option value="ALL">All Types</option>
              <option value="Milestone">Milestone</option>
              <option value="Project">Project</option>
              <option value="Payout">Payout</option>
              <option value="Fee">Fee</option>
            </select>
            <ChevronDown className="w-3 h-3 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Date Filter */}
          <div className="relative">
            <select
              value={dateRangeFilter}
              onChange={(e) => setDateRangeFilter(e.target.value)}
              aria-label="Filter transactions by date range"
              className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 py-2 pl-3 pr-7 rounded-xl transition cursor-pointer outline-hidden focus:ring-2 focus:ring-[#4f46e5]/20"
            >
              <option value="3M">Last 3 Months</option>
              <option value="6M">Last 6 Months</option>
              <option value="1Y">This Year</option>
              <option value="ALL">All Time</option>
            </select>
            <ChevronDown className="w-3 h-3 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Export CSV & AG Grid Toggle */}
          <div className="flex items-center gap-1.5 ml-auto">
            <button
              type="button"
              onClick={onExportCsv}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs transition cursor-pointer flex items-center gap-1.5"
              title="Export ledger transactions to CSV via AG Grid"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            <div className="flex rounded-xl bg-slate-100 p-0.5 text-xs font-bold">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                AG Grid
              </button>
              <button
                type="button"
                onClick={() => setViewMode("classic")}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  viewMode === "classic"
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Classic
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. MAIN TABLE RENDERER */}
      {activeTab === "invoices" ? (
        /* INVOICES TAB */
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-2.5">Invoice #</th>
                <th className="py-2.5 px-2.5">Date</th>
                <th className="py-2.5 px-2.5">Client & Company</th>
                <th className="py-2.5 px-2.5">Project</th>
                <th className="py-2.5 px-2.5">Amount</th>
                <th className="py-2.5 px-2.5">Status</th>
                <th className="py-2.5 px-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No invoices issued yet. Invoices are generated automatically upon milestone acceptance.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-2.5 font-mono font-bold text-slate-900">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3 px-2.5 text-slate-500">{inv.date}</td>
                    <td className="py-3 px-2.5">
                      <div className="font-bold text-slate-800">{inv.clientCompany}</div>
                      <div className="text-[11px] text-slate-400">{inv.clientName}</div>
                    </td>
                    <td className="py-3 px-2.5 font-medium text-slate-700">
                      {inv.projectName}
                    </td>
                    <td className="py-3 px-2.5 font-extrabold text-slate-900">
                      {inv.formattedAmount}
                    </td>
                    <td className="py-3 px-2.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => showToast(`Invoice ${inv.invoiceNumber} PDF generated.`)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : activeTab === "projects" ? (
        /* PROJECTS SUMMARY TAB */
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-2.5">Project Name</th>
                <th className="py-2.5 px-2.5">Client</th>
                <th className="py-2.5 px-2.5">Category</th>
                <th className="py-2.5 px-2.5">Total Earned</th>
                <th className="py-2.5 px-2.5">Milestone Progress</th>
                <th className="py-2.5 px-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projectSummaries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No project earnings summaries available. Active agreements will appear here.
                  </td>
                </tr>
              ) : (
                projectSummaries.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-2.5 font-bold text-slate-900">{p.projectName}</td>
                    <td className="py-3 px-2.5 text-slate-600">{p.clientName}</td>
                    <td className="py-3 px-2.5">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                        {p.category}
                      </span>
                    </td>
                    <td className="py-3 px-2.5 font-extrabold text-slate-900">
                      {p.formattedTotalEarned}
                    </td>
                    <td className="py-3 px-2.5 text-slate-600 font-medium">
                      {p.milestonesCompleted} of {p.totalMilestones} milestones
                    </td>
                    <td className="py-3 px-2.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.status === "COMPLETED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* TRANSACTIONS / MILESTONES / PAYOUT HISTORY TABS (Matching Screenshot) */
        <div className={`overflow-x-auto ${viewMode === "grid" ? "rounded-xl border border-slate-200/90 shadow-2xs p-2 bg-white" : ""}`}>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-medium text-[11px] pb-2">
                <th className="py-2 px-2 sm:px-2.5 font-normal">Date</th>
                <th className="py-2 px-2 sm:px-2.5 font-normal">Description</th>
                <th className="py-2 px-2 sm:px-2.5 font-normal">Project</th>
                <th className="py-2 px-2 sm:px-2.5 font-normal">Type</th>
                <th className="py-2 px-2 sm:px-2.5 font-normal">Amount</th>
                <th className="py-2 px-2 sm:px-2.5 font-normal">Status</th>
                <th className="py-2 px-2 sm:px-2.5 text-right font-normal">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No transactions match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-slate-50/70 transition group cursor-pointer"
                    onClick={() => onViewTransaction(tx)}
                  >
                    {/* Date */}
                    <td className="py-3 px-2 sm:px-2.5 text-slate-700 whitespace-nowrap font-medium text-[11px]">
                      {tx.date}
                    </td>

                    {/* Description */}
                    <td className="py-3 px-2 sm:px-2.5">
                      <div className="flex items-center gap-2 max-w-[140px] sm:max-w-[170px] xl:max-w-[210px]">
                        {renderTxnRowIcon(tx)}
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-900 leading-tight truncate">
                            {tx.description}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate mt-0.5">
                            {tx.subtitle}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Project */}
                    <td className="py-3 px-2 sm:px-2.5">
                      {tx.project === "—" ? (
                        <span className="text-slate-300 font-bold">—</span>
                      ) : (
                        <div className="flex items-center gap-2 max-w-[125px] sm:max-w-[155px] xl:max-w-[195px]">
                          {renderProjectAvatar(tx.projectIcon)}
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-800 leading-tight truncate">
                              {tx.project}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate mt-0.5">
                              {tx.client}
                            </div>
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Type */}
                    <td className="py-3 px-2 sm:px-2.5 text-slate-600 font-medium text-[11px] whitespace-nowrap">
                      {tx.type}
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-2 sm:px-2.5 whitespace-nowrap">
                      <span
                        className={`font-extrabold text-[12px] ${
                          tx.isCredit ? "text-slate-900" : "text-slate-700"
                        }`}
                      >
                        {tx.formattedAmount}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-2 sm:px-2.5 whitespace-nowrap">
                      {renderStatusBadge(tx.status)}
                    </td>

                    {/* Actions */}
                    <td
                      className="py-3 px-2 sm:px-2.5 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => onViewTransaction(tx)}
                          className="px-2 py-1 text-xs font-semibold text-[#4f46e5] hover:text-[#4338ca] hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                        >
                          {tx.status === "Under Review" || tx.status === "Pending"
                            ? "Details"
                            : "View"}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            showToast(`Actions menu for ${tx.description}: View contract, verify SHA-256 hash.`)
                          }
                          className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition cursor-pointer"
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
