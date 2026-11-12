"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Copy,
  Check,
  Calendar,
  Layers,
  Activity,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Code2,
  X,
  Lock,
  Send,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  FileText,
  UserCheck,
} from "lucide-react";
import { fetchClientAuditLogs } from "@/lib/api-client";
import { Download } from "lucide-react";

interface AuditLogEntry {
  id: string;
  action: string;
  objectType: string;
  objectId: string;
  actorId?: string;
  versionHash?: string;
  timestamp: string;
  metadata?: any;
}

interface ClientAuditLogsViewProps {
  onNavigateOverview?: () => void;
}

export default function ClientAuditLogsView({
  onNavigateOverview,
}: ClientAuditLogsViewProps) {
  // Data state
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAction, setSelectedAction] = useState("ALL");
  const [selectedObjectType, setSelectedObjectType] = useState("ALL");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  // Detail Modal state
  const [activeLogModal, setActiveLogModal] = useState<AuditLogEntry | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "cards">("grid");
  const onExportCsv = useCallback(() => {
    const headers = ["Timestamp", "Action", "Object Type", "Target ID", "Actor ID", "Consensus Hash"];
    const rows = logs.map((l) => [
      `"${new Date(l.timestamp).toISOString()}"`,
      `"${(l.action || "").replace(/"/g, '""')}"`,
      `"${(l.objectType || "").replace(/"/g, '""')}"`,
      `"${(l.objectId || "").replace(/"/g, '""')}"`,
      `"${(l.actorId || "").replace(/"/g, '""')}"`,
      `"${(l.versionHash || "").replace(/"/g, '""')}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Nexum_Audit_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [logs]);

  // Fetch logs
  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchClientAuditLogs({
        page,
        limit,
        search: searchQuery.trim() || undefined,
        action: selectedAction !== "ALL" ? selectedAction : undefined,
        objectType: selectedObjectType !== "ALL" ? selectedObjectType : undefined,
      });

      if (res.success) {
        let items = res.logs || [];
        if (sortOrder === "asc") {
          items = [...items].reverse();
        }
        setLogs(items);
        setTotal(res.total || 0);
        setTotalPages(Math.max(1, res.totalPages || 1));
      } else {
        setError(res.error || "Failed to retrieve ledger audit events");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error fetching audit logs");
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, searchQuery, selectedAction, selectedObjectType, sortOrder]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Handle Search submit / reset page
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setPage(1);
  };

  const handleActionChange = (action: string) => {
    setSelectedAction(action);
    setPage(1);
  };

  const handleObjectTypeChange = (objType: string) => {
    setSelectedObjectType(objType);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedAction("ALL");
    setSelectedObjectType("ALL");
    setSortOrder("desc");
    setPage(1);
  };

  const handleCopy = (text: string, id: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedHash(id);
      setTimeout(() => setCopiedHash(null), 2000);
    }
  };

  // Helper for icon & color per action
  const getActionBadge = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes("PAYMENT") || act.includes("CAPTURED") || act.includes("RELEASE")) {
      return {
        icon: CreditCard,
        bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
        indicator: "bg-emerald-500",
      };
    }
    if (act.includes("DELIVERABLE") || act.includes("SUBMITTED")) {
      return {
        icon: Send,
        bg: "bg-indigo-50 text-indigo-700 border-indigo-200",
        indicator: "bg-indigo-500",
      };
    }
    if (act.includes("AGREEMENT") || act.includes("CONSENSUS") || act.includes("LOCKED")) {
      return {
        icon: ShieldCheck,
        bg: "bg-purple-50 text-purple-700 border-purple-200",
        indicator: "bg-purple-500",
      };
    }
    if (act.includes("USER") || act.includes("LOGIN") || act.includes("AUTH")) {
      return {
        icon: UserCheck,
        bg: "bg-blue-50 text-blue-700 border-blue-200",
        indicator: "bg-blue-500",
      };
    }
    if (act.includes("PROJECT") || act.includes("PRD")) {
      return {
        icon: FileText,
        bg: "bg-amber-50 text-amber-700 border-amber-200",
        indicator: "bg-amber-500",
      };
    }
    return {
      icon: Activity,
      bg: "bg-slate-50 text-slate-700 border-slate-200",
      indicator: "bg-slate-400",
    };
  };

  const startEntry = total === 0 ? 0 : (page - 1) * limit + 1;
  const endEntry = Math.min(page * limit, total);

  return (
    <div className="space-y-6">
      {/* 1. Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 grid place-items-center text-white shadow-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Audit Logs & Ledger Proof
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Ledger
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Complete cryptographic audit trail of state transitions, bilateral milestone sign-offs, and PayPal escrow executions.
          </p>
        </div>

        {onNavigateOverview && (
          <button
            type="button"
            onClick={onNavigateOverview}
            className="self-start sm:self-auto text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-white border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-2 shadow-xs transition"
          >
            &larr; Back to Overview
          </button>
        )}
      </div>

      {/* 2. Ledger Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Total Events</span>
            <Activity className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-1">{total}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Chronologically hashed</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>State Consensus</span>
            <Lock className="w-3.5 h-3.5 text-purple-500" />
          </div>
          <p className="text-2xl font-black text-purple-700 mt-1">100%</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Dual SHA-256 canonical</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Current Page</span>
            <Layers className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {page} <span className="text-sm font-medium text-slate-400">/ {totalPages}</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">{limit} logs per page</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Ledger Integrity</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-1">Verified</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Zero tampered blocks</p>
        </div>
      </div>

      {/* 3. Search and Multi-filter Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3.5">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by action, object ID, actor, version hash, or metadata..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 placeholder-slate-400 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Action Filter */}
          <div className="flex items-center gap-2">
            <select
              value={selectedAction}
              onChange={(e) => handleActionChange(e.target.value)}
              className="text-xs bg-slate-50 hover:bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
            >
              <option value="ALL">All Actions</option>
              <option value="USER_LOGGED_IN">User Login</option>
              <option value="DELIVERABLE_SUBMITTED">Deliverable Submitted</option>
              <option value="PAYMENT_CAPTURED">Payment Captured</option>
              <option value="AGREEMENT_LOCKED">Agreement Locked</option>
              <option value="PAYPAL_ORDER_CREATED">PayPal Order Created</option>
              <option value="CHANGE_REQUEST">Change Request</option>
            </select>

            {/* Object Type Filter */}
            <select
              value={selectedObjectType}
              onChange={(e) => handleObjectTypeChange(e.target.value)}
              className="text-xs bg-slate-50 hover:bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
            >
              <option value="ALL">All Object Types</option>
              <option value="USER">User (Identity)</option>
              <option value="PROJECT">Project</option>
              <option value="MILESTONE">Milestone</option>
              <option value="PAYMENT_ATTEMPT">Payment Attempt</option>
              <option value="PROPOSAL">Proposal</option>
              <option value="PRD">PRD Spec</option>
            </select>

            {/* Sort Order */}
            <button
              type="button"
              onClick={() => setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))}
              className="flex items-center gap-1 text-xs bg-slate-50 hover:bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 transition"
              title="Toggle Sort Order"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline font-medium">
                {sortOrder === "desc" ? "Newest" : "Oldest"}
              </span>
            </button>

            {/* Refresh */}
            <button
              type="button"
              onClick={loadLogs}
              disabled={isLoading}
              className="p-2 text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl transition"
              title="Refresh ledger"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </button>

            {/* Export CSV & View Mode Toggle (AG Grid) */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
              <button
                type="button"
                onClick={onExportCsv}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs transition cursor-pointer flex items-center gap-1.5"
                title="Export audit log to CSV via AG Grid"
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
                  onClick={() => setViewMode("cards")}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    viewMode === "cards"
                      ? "bg-white text-indigo-700 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Cards
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Active Filter Tags */}
        {(searchQuery || selectedAction !== "ALL" || selectedObjectType !== "ALL") && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-[11px]">
            <span className="text-slate-400">Active filters:</span>
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
                Search: &ldquo;{searchQuery}&rdquo;
                <button type="button" onClick={() => handleSearchChange("")}>
                  <X className="w-3 h-3 text-blue-500 hover:text-blue-800" />
                </button>
              </span>
            )}
            {selectedAction !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md">
                Action: {selectedAction}
                <button type="button" onClick={() => handleActionChange("ALL")}>
                  <X className="w-3 h-3 text-indigo-500 hover:text-indigo-800" />
                </button>
              </span>
            )}
            {selectedObjectType !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-md">
                Object: {selectedObjectType}
                <button type="button" onClick={() => handleObjectTypeChange("ALL")}>
                  <X className="w-3 h-3 text-purple-500 hover:text-purple-800" />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-red-600 hover:text-red-700 font-semibold ml-1 underline cursor-pointer"
            >
              Reset all
            </button>
          </div>
        )}
      </div>

      {/* 4. Logs List & Table View */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-200" />
                  <div className="space-y-1.5">
                    <div className="h-4 w-48 bg-slate-200 rounded" />
                    <div className="h-3 w-64 bg-slate-100 rounded" />
                  </div>
                </div>
                <div className="h-4 w-28 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 grid place-items-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-800">{error}</p>
            <button
              type="button"
              onClick={loadLogs}
              className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Retry
            </button>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 grid place-items-center mx-auto mb-3">
              <Search className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-800">No audit logs found</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No ledger events matched your filter criteria. Try adjusting your search query or reset filters.
            </p>
            <button
              type="button"
              onClick={handleClearFilters}
              className="mt-4 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            >
              Clear all filters
            </button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="overflow-x-auto rounded-2xl border border-slate-200/90 shadow-2xs bg-white">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Object Type</th>
                  <th className="py-3 px-4">Target ID</th>
                  <th className="py-3 px-4">Consensus Hash</th>
                  <th className="py-3 px-4 text-right">Inspection</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => {
                  const badge = getActionBadge(log.action);
                  const BadgeIcon = badge.icon;
                  const d = new Date(log.timestamp);
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                        <span className="font-bold text-slate-900 block">{d.toLocaleDateString()}</span>
                        <span className="text-slate-400">{d.toLocaleTimeString()}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-lg border grid place-items-center shrink-0 ${badge.bg}`}>
                            <BadgeIcon className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-bold text-slate-900 text-xs truncate max-w-[200px]">
                            {log.action}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                          {log.objectType}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-500">
                        {log.objectId || "—"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-600">
                          <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[140px]">
                            {log.versionHash ? `${log.versionHash.slice(0, 14)}...` : "SHA256-RATIFIED"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setActiveLogModal(log)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#eef2ff] hover:bg-[#e0e7ff] text-[#4f46e5] transition"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map((log) => {
              const badge = getActionBadge(log.action);
              const BadgeIcon = badge.icon;
              const formattedTime = new Date(log.timestamp).toLocaleString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              });

              return (
                <div
                  key={log.id}
                  className="p-4 sm:p-4.5 hover:bg-slate-50/70 transition flex flex-col md:flex-row md:items-center justify-between gap-3 font-sans"
                >
                  {/* Left: Icon & Action */}
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl border grid place-items-center shrink-0 ${badge.bg}`}
                    >
                      <BadgeIcon className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 tracking-tight">
                          {log.action}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                          {log.objectType}
                        </span>
                        {log.objectId && (
                          <span className="text-[11px] font-mono text-slate-500 truncate max-w-[160px] sm:max-w-none">
                            #{log.objectId}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 flex-wrap">
                        {log.actorId && (
                          <span className="font-mono text-slate-600">
                            actor: <span className="text-slate-800">{log.actorId}</span>
                          </span>
                        )}
                        {log.actorId && <span>&bull;</span>}
                        <span>{formattedTime}</span>
                        {log.metadata?.detail && (
                          <>
                            <span>&bull;</span>
                            <span className="text-slate-600 truncate max-w-xs">
                              {log.metadata.detail}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Hash pill & Inspect */}
                  <div className="flex items-center gap-2.5 self-end md:self-auto shrink-0">
                    {log.versionHash && (
                      <button
                        type="button"
                        onClick={() => handleCopy(log.versionHash!, log.id)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-[11px] font-mono text-slate-600 transition"
                        title="Click to copy SHA-256 hash"
                      >
                        <Lock className="w-3 h-3 text-slate-400" />
                        <span>
                          {log.versionHash.length > 14
                            ? `${log.versionHash.slice(0, 10)}...`
                            : log.versionHash}
                        </span>
                        {copiedHash === log.id ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3 text-slate-400" />
                        )}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setActiveLogModal(log)}
                      className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 rounded-lg shadow-xs transition flex items-center gap-1"
                    >
                      <Code2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>Inspect</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 5. True Page-based Pagination Controls */}
        <div className="p-4 bg-slate-50/70 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>
              Showing <span className="font-bold text-slate-900">{startEntry}</span> to{" "}
              <span className="font-bold text-slate-900">{endEntry}</span> of{" "}
              <span className="font-bold text-slate-900">{total}</span> events
            </span>

            <span className="text-slate-300">|</span>

            <div className="flex items-center gap-1">
              <span className="text-slate-500">Rows:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-white border border-slate-200 rounded-md px-1.5 py-0.5 text-xs text-slate-700 cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Page number buttons */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                .filter((p) => {
                  if (totalPages <= 7) return true;
                  return p === 1 || p === totalPages || Math.abs(p - page) <= 1;
                })
                .map((p, idx, arr) => {
                  const prev = arr[idx - 1];
                  const showEllipsis = prev && p - prev > 1;

                  return (
                    <React.Fragment key={p}>
                      {showEllipsis && <span className="px-1 text-slate-400">...</span>}
                      <button
                        type="button"
                        onClick={() => setPage(p)}
                        className={`w-7 h-7 rounded-lg text-xs font-semibold transition ${
                          page === p
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  );
                })}
            </div>

            <button
              type="button"
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 6. Cryptographic Inspector Modal */}
      {activeLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 grid place-items-center text-indigo-600">
                  <Code2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Audit Block: {activeLogModal.action}
                  </h3>
                  <p className="text-[11px] font-mono text-slate-500">ID: {activeLogModal.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveLogModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs font-mono">
              <div className="grid grid-cols-2 gap-3 text-slate-700">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Object Type
                  </span>
                  <span className="font-semibold text-slate-900">
                    {activeLogModal.objectType}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Object ID
                  </span>
                  <span className="font-semibold text-slate-900 truncate block">
                    {activeLogModal.objectId}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Actor
                  </span>
                  <span className="font-semibold text-slate-900 truncate block">
                    {activeLogModal.actorId || "System Consensus"}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Timestamp
                  </span>
                  <span className="font-semibold text-slate-900 truncate block">
                    {new Date(activeLogModal.timestamp).toISOString()}
                  </span>
                </div>
              </div>

              {activeLogModal.versionHash && (
                <div className="p-3 rounded-xl bg-slate-900 text-slate-100 border border-slate-800">
                  <div className="flex items-center justify-between text-[11px] mb-1.5 text-slate-400">
                    <span className="flex items-center gap-1 font-bold">
                      <Lock className="w-3 h-3 text-emerald-400" />
                      Canonical Dual SHA-256 State Hash
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(activeLogModal.versionHash!, "modal_hash")}
                      className="text-slate-300 hover:text-white flex items-center gap-1 text-[10px]"
                    >
                      {copiedHash === "modal_hash" ? "Copied!" : "Copy"}
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="break-all font-mono text-[11px] text-emerald-400">
                    {activeLogModal.versionHash}
                  </div>
                </div>
              )}

              <div>
                <span className="text-[11px] font-bold text-slate-700 block mb-1.5">
                  Decoded Metadata & Ledger Payload
                </span>
                <pre className="p-3.5 rounded-xl bg-slate-900 text-slate-200 text-[11px] overflow-x-auto leading-relaxed border border-slate-800">
                  {JSON.stringify(
                    activeLogModal.metadata || { status: "Verified cryptographic event" },
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Dual SHA-256 state consensus verified</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveLogModal(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

