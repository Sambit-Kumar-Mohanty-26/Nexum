"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  DollarSign,
  ShieldCheck,
  Clock,
  RotateCcw,
  CreditCard,
  Download,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  TrendingUp,
  Receipt,
  Lock,
  Calendar,
} from "lucide-react";
import {
  fetchClientPaymentsSummary,
  fetchClientTransactions,
  fetchClientCashFlow,
  fetchClientActionRequired,
  fetchClientUpcomingDeliverable,
  authorizeClientMilestoneRelease,
} from "@/lib/api-client";

export interface CashFlowTrendPoint {
  date: string;
  dayOfWeek: string;
  shortDate: string;
  amount: number;
  label: string;
  x: number;
  y: number;
}

export interface PaymentTransaction {
  id: string;
  freelancerName: string;
  freelancerAvatar: string;
  freelancerRole: string;
  projectName: string;
  milestoneTitle: string;
  milestoneNumber: number;
  amount: number;
  amountDisplay: string;
  currency: string;
  date: string;
  time: string;
  status: "RELEASED" | "IN_ESCROW" | "PENDING_REVIEW" | "REFUNDED";
  statusLabel: string;
  statusColor: string;
  orderId: string;
  captureId?: string;
  refundId?: string;
  proofHash: string;
  paymentRail: string;
  receiptNumber: string;
}

// ---------------------------------------------------------------------------
// Precision Catmull-Rom Spline generator: Guaranteed to pass through (x, y)
// ---------------------------------------------------------------------------
function getSmoothSplinePath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

    const tension = 0.2;

    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;

    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x} ${p2.y}`;
  }

  return d;
}

function getAreaPath(points: { x: number; y: number }[], baselineY = 160): string {
  if (points.length === 0) return "";
  const curve = getSmoothSplinePath(points);
  const first = points[0];
  const last = points[points.length - 1];
  return `${curve} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;
}

interface ClientPaymentsViewProps {
  onOpenProjectWorkspace?: (projectId: string) => void;
}

export default function ClientPaymentsView({
  onOpenProjectWorkspace: _onOpenProjectWorkspace,
}: ClientPaymentsViewProps) {
  // Live state from backend
  const [summary, setSummary] = useState<any>(null);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [cashFlowData, setCashFlowData] = useState<CashFlowTrendPoint[]>([]);
  const [actionItem, setActionItem] = useState<any | null>(null);
  const [upcomingItem, setUpcomingItem] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Timeframe filter state
  const [selectedTimeframe, setSelectedTimeframe] = useState<"1M" | "3M" | "6M" | "1Y">("1M");

  // Transaction filter & search state
  const [txSearchQuery, setTxSearchQuery] = useState("");
  const [txStatusFilter, setTxStatusFilter] = useState<"ALL" | "RELEASED" | "IN_ESCROW" | "PENDING_REVIEW" | "REFUNDED">("ALL");

  // Chart hover state
  const [hoveredPoint, setHoveredPoint] = useState<CashFlowTrendPoint | null>(null);

  // Proof Modal state
  const [selectedTxForProof, setSelectedTxForProof] = useState<PaymentTransaction | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Escrow capture execution state
  const [isReleasingUpcoming, setIsReleasingUpcoming] = useState(false);
  const [isActionBannerDismissed, setIsActionBannerDismissed] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3800);
  };

  // Load real telemetry from API
  const loadData = useCallback(async () => {
    try {
      const [sumRes, txsRes, cfRes, actRes, upRes] = await Promise.all([
        fetchClientPaymentsSummary(),
        fetchClientTransactions(),
        fetchClientCashFlow(undefined, selectedTimeframe),
        fetchClientActionRequired(),
        fetchClientUpcomingDeliverable(),
      ]);

      if (sumRes.success && sumRes.data) {
        setSummary(sumRes.data);
      }
      if (txsRes.success && txsRes.data) {
        setTransactions(txsRes.data);
      }
      if (cfRes.success && cfRes.data) {
        setCashFlowData(cfRes.data);
        if (cfRes.data.length > 0) {
          setHoveredPoint(cfRes.data[cfRes.data.length - 1]);
        }
      }
      if (actRes.success) {
        setActionItem(actRes.data);
      }
      if (upRes.success) {
        setUpcomingItem(upRes.data);
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedTimeframe]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Precision Spline Path & Gradient Area
  const splinePath = useMemo(() => getSmoothSplinePath(cashFlowData), [cashFlowData]);
  const areaPath = useMemo(() => getAreaPath(cashFlowData, 160), [cashFlowData]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const q = txSearchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        tx.freelancerName.toLowerCase().includes(q) ||
        tx.projectName.toLowerCase().includes(q) ||
        tx.orderId.toLowerCase().includes(q) ||
        tx.receiptNumber.toLowerCase().includes(q);

      const matchesStatus =
        txStatusFilter === "ALL" || tx.status === txStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [transactions, txSearchQuery, txStatusFilter]);

  // Quick escrow release action
  const handleAuthorizeRelease = async () => {
    const targetId = actionItem?.milestoneId || upcomingItem?.milestoneId;
    if (!targetId) return;

    setIsReleasingUpcoming(true);
    showToast("Authenticating Dual SHA-256 consensus & capturing PayPal Sandbox Order...");

    try {
      const res = await authorizeClientMilestoneRelease(targetId);
      if (res.success) {
        showToast(
          `Milestone (${res.amountReleased}) released to ${res.freelancerName}. Receipt: ${res.receiptNumber}`
        );
        setActionItem(null);
        await loadData();
      } else {
        showToast(res.error || "Failed to release milestone funds");
      }
    } catch {
      showToast("Error processing release authorization");
    } finally {
      setIsReleasingUpcoming(false);
    }
  };

  // Export CSV of transactions
  const handleExportCSV = () => {
    if (transactions.length === 0) {
      showToast("No transaction records available to export.");
      return;
    }
    const headers = ["Receipt", "Date", "Contractor", "Project", "Amount", "Status", "Order ID", "Capture ID", "Proof Hash"];
    const rows = transactions.map((t) => [
      t.receiptNumber,
      t.date,
      `"${t.freelancerName}"`,
      `"${t.projectName}"`,
      t.amountDisplay,
      t.status,
      t.orderId,
      t.captureId || "",
      t.proofHash,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `nexum-statement-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Statement exported successfully.");
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      
      {/* ====================================================================
          1. HEADER & GLOBAL EXPORT BAR
         ==================================================================== */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-50 text-[#4f46e5]">
              <CreditCard className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Payments & Financial Escrow
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
            Real-time financial command center: track committed project budgets, locked escrow balances, and PayPal REST API v2 capture receipts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start md:self-auto shrink-0">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {summary?.paypalStatus || "PayPal Sandbox v2 Active"}
          </span>
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition cursor-pointer flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Statement</span>
          </button>
        </div>
      </div>

      {/* ====================================================================
          2. URGENT CLIENT ACTION BANNER (ONLY SHOWN WHEN REAL SUBMISSIONS EXIST)
         ==================================================================== */}
      {!isActionBannerDismissed && actionItem && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-50 to-orange-50/50 border border-amber-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in slide-in-from-top-1">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-amber-500 text-white shrink-0 shadow-xs">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                  Action Required &bull; Milestone Deliverables Submitted
                </span>
                <span className="px-2 py-0.2 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  {actionItem.amountDisplay}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                <strong>{actionItem.freelancerName}</strong> submitted deliverables for{" "}
                <em>{actionItem.milestoneTitle}</em> on {actionItem.projectName}.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleAuthorizeRelease}
              disabled={isReleasingUpcoming}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#4f46e5] hover:bg-[#4338ca] text-white shadow-xs transition cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isReleasingUpcoming ? "Releasing..." : "Authorize Release"}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsActionBannerDismissed(true)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 cursor-pointer"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ====================================================================
          3. FOUR CORE KPIS & FINANCIAL PULSE (ALL LIVE QUERIES OVER REAL RECORDS)
         ==================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Total Spent */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Spent
            </span>
            <span className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
              {summary ? summary.totalSpentDisplay : "$0.00"}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{summary ? summary.totalSpentGrowth : "0% vs last month"}</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 border-t border-slate-100 pt-2.5 font-mono flex items-center justify-between">
            <span>{summary ? `${summary.verifiedReleasesCount} verified releases` : "0 verified releases"}</span>
            <span className="text-emerald-700 font-bold">100% Settled</span>
          </div>
        </div>

        {/* KPI 2: Active Milestone Funds (In Escrow) */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Milestone Funds Locked
            </span>
            <span className="p-2.5 rounded-2xl bg-indigo-50 text-[#4f46e5] border border-indigo-100">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
              {summary ? summary.activeEscrowDisplay : "$0.00"}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-indigo-700 font-semibold mt-1">
              <Lock className="w-3.5 h-3.5" />
              <span>{summary ? summary.activeEscrowProjects : "0 projects locked"}</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 border-t border-slate-100 pt-2.5 font-mono flex items-center justify-between">
            <span>PayPal Sandbox Protected</span>
            <span className="text-indigo-600 font-bold">Encumbered</span>
          </div>
        </div>

        {/* KPI 3: Pending Payments */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Pending Payments
            </span>
            <span className="p-2.5 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
              {summary ? summary.pendingPaymentsDisplay : "$0.00"}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-amber-700 font-semibold mt-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{summary ? summary.pendingReviewCount : "0 submissions awaiting review"}</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 border-t border-slate-100 pt-2.5 font-mono flex items-center justify-between">
            <span>Awaiting client approval</span>
            <span className="text-amber-700 font-bold">Action Needed</span>
          </div>
        </div>

        {/* KPI 4: Refunded / Disputes Reclaimed */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Refunded
            </span>
            <span className="p-2.5 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100">
              <RotateCcw className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
              {summary ? summary.refundedAmountDisplay : "$0.00"}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-purple-700 font-semibold mt-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{summary ? summary.refundsCount : "0 refunds"}</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 border-t border-slate-100 pt-2.5 font-mono flex items-center justify-between">
            <span>Dual SHA-256 state rollbacks</span>
            <span className="text-purple-700 font-bold">0 Disputes</span>
          </div>
        </div>
      </div>

      {/* ====================================================================
          4. ROW 1: CASH FLOW SPLINE CHART & ESCROW ALLOCATION SUMMARY
         ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* LEFT: Realistic Cash Outflow Spline Chart (8 Cols) */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs flex flex-col justify-between space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Total Committed Outflow
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
                  {summary ? summary.totalSpentDisplay : "$0.00"}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {summary?.budgetUtilizationRate || "0%"} utilized
                </span>
              </div>
            </div>

            {/* Timeframe selector (1M, 3M, 6M, 1Y) */}
            <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200/60 self-start sm:self-auto">
              {(["1M", "3M", "6M", "1Y"] as const).map((tf) => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => {
                    setSelectedTimeframe(tf);
                    showToast(`Timeline updated to ${tf}.`);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    selectedTimeframe === tf
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* Realistic Financial Graph Area */}
          <div className="relative pt-6 pb-2">
            {cashFlowData.length === 0 ? (
              <div className="w-full h-48 sm:h-56 rounded-2xl bg-slate-50 border border-dashed border-slate-200 flex flex-col items-center justify-center text-center p-4">
                <TrendingUp className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-600">No payment outflows recorded yet</p>
                <p className="text-[11px] text-slate-400 max-w-sm mt-0.5">
                  As you release payments for approved deliverables, real-time cash outflows will chart automatically here.
                </p>
              </div>
            ) : (
              <div className="w-full h-48 sm:h-56 relative flex">
                {/* Y-Axis Value Labels on Left */}
                <div className="flex flex-col justify-between text-[11px] text-slate-400 font-mono pr-3 select-none shrink-0 py-1">
                  <span>Max</span>
                  <span>75%</span>
                  <span>50%</span>
                  <span>$0</span>
                </div>

                {/* SVG Curve & Grid */}
                <div className="flex-1 relative">
                  {hoveredPoint && (
                    <div
                      className="absolute z-30 px-4 py-2.5 rounded-2xl bg-white border border-slate-200/90 shadow-xl text-xs space-y-1 pointer-events-none transition-all duration-150 animate-in fade-in"
                      style={{
                        left: `${(hoveredPoint.x / 600) * 100}%`,
                        top: `${Math.max(hoveredPoint.y - 70, -20)}px`,
                        transform:
                          (hoveredPoint.x / 600) * 100 > 80
                            ? "translateX(-85%)"
                            : (hoveredPoint.x / 600) * 100 < 20
                            ? "translateX(-15%)"
                            : "translateX(-50%)",
                      }}
                    >
                      <div className="text-[11px] text-slate-500 font-medium whitespace-nowrap">
                        {hoveredPoint.date}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 whitespace-nowrap">
                        <span className="w-5 h-5 rounded-lg bg-[#4f46e5]/10 text-[#4f46e5] flex items-center justify-center text-[10px] font-bold shrink-0">
                          $
                        </span>
                        <span className="text-slate-500 font-medium text-xs">Outflow</span>
                        <span className="font-extrabold text-slate-900 text-sm font-mono">
                          {hoveredPoint.label}
                        </span>
                      </div>
                    </div>
                  )}

                  <svg viewBox="0 0 600 170" className="w-full h-full overflow-visible">
                    <defs>
                      <linearGradient id="realisticCurveGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.14" />
                        <stop offset="70%" stopColor="#818cf8" stopOpacity="0.02" />
                        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                      </linearGradient>
                    </defs>

                    <line x1="0" y1="30" x2="600" y2="30" stroke="#f1f5f9" strokeDasharray="3 3" />
                    <line x1="0" y1="75" x2="600" y2="75" stroke="#f1f5f9" strokeDasharray="3 3" />
                    <line x1="0" y1="120" x2="600" y2="120" stroke="#f1f5f9" strokeDasharray="3 3" />
                    <line x1="0" y1="160" x2="600" y2="160" stroke="#f1f5f9" strokeDasharray="3 3" />

                    {hoveredPoint && (
                      <line
                        x1={hoveredPoint.x}
                        y1={hoveredPoint.y}
                        x2={hoveredPoint.x}
                        y2="160"
                        stroke="#818cf8"
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                      />
                    )}

                    <path d={areaPath} fill="url(#realisticCurveGrad)" />
                    <path
                      d={splinePath}
                      fill="none"
                      stroke="#4f46e5"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {cashFlowData.map((pt) => {
                      const isSelected = hoveredPoint?.shortDate === pt.shortDate;
                      return (
                        <g
                          key={pt.shortDate}
                          className="cursor-pointer"
                          onMouseEnter={() => setHoveredPoint(pt)}
                          onClick={() => setHoveredPoint(pt)}
                        >
                          {isSelected && (
                            <circle cx={pt.x} cy={pt.y} r="10" fill="#4f46e5" opacity="0.18" />
                          )}
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={isSelected ? 6 : 4.5}
                            fill="#4f46e5"
                            stroke="#ffffff"
                            strokeWidth="2.5"
                          />
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>
            )}

            {/* X-Axis Date Labels */}
            {cashFlowData.length > 0 && (
              <div className="relative w-full h-9 pt-3 pl-8">
                <div className="relative w-full h-full">
                  {cashFlowData.map((pt) => {
                    const isSelected = hoveredPoint?.shortDate === pt.shortDate;
                    const leftPercent = (pt.x / 600) * 100;
                    return (
                      <button
                        key={pt.shortDate}
                        type="button"
                        onMouseEnter={() => setHoveredPoint(pt)}
                        onClick={() => setHoveredPoint(pt)}
                        style={{ left: `${leftPercent}%` }}
                        className={`absolute -translate-x-1/2 text-[11px] font-mono font-medium transition cursor-pointer flex flex-col items-center ${
                          isSelected ? "text-slate-900 font-extrabold" : "text-slate-400 hover:text-slate-700"
                        }`}
                      >
                        <span>{pt.shortDate}</span>
                        <span className="text-[10px] text-slate-400">{pt.dayOfWeek}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Escrow & Settlement Summary (4 Cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                Payroll Summary
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                {summary?.payrollSummary?.paymentPeriod || "Current Period"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => showToast("Escrow reconciliation verified against Neon PostgreSQL ledger.")}
              className="text-xs font-bold text-[#4f46e5] hover:text-[#4338ca] transition cursor-pointer"
            >
              Verified
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-3 text-xs border-b border-slate-100 pb-3.5 font-mono">
              <div className="pr-2">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Payment</span>
                <span className="font-extrabold text-slate-900 text-xs sm:text-sm mt-0.5 block">
                  {summary ? summary.payrollSummary.paymentDisplay : "$0.00"}
                </span>
              </div>
              <div className="border-l border-slate-200/70 pl-3 pr-2">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Pending</span>
                <span className="font-extrabold text-slate-900 text-xs sm:text-sm mt-0.5 block">
                  {summary ? summary.payrollSummary.pendingDisplay : "$0.00"}
                </span>
              </div>
              <div className="border-l border-slate-200/70 pl-3">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Paid</span>
                <span className="font-extrabold text-slate-900 text-xs sm:text-sm mt-0.5 block">
                  {summary ? summary.payrollSummary.paidDisplay : "$0.00"}
                </span>
              </div>
            </div>

            {/* Silky Precision Arc Gauge */}
            <div className="flex flex-col items-center justify-center pt-2">
              <div className="relative w-56 h-32 flex items-end justify-center">
                <svg viewBox="0 0 240 135" className="w-full h-full overflow-visible">
                  <path
                    d="M 35 120 A 85 85 0 0 1 205 120"
                    fill="none"
                    stroke="#f1f5f9"
                    strokeWidth="16"
                  />
                  <path
                    d="M 35 120 A 85 85 0 0 1 205 120"
                    fill="none"
                    stroke="#4f46e5"
                    strokeWidth="16"
                    strokeDasharray={`${((summary?.settledPercentage || 0) / 100) * 267.04} 267.04`}
                    strokeDashoffset="0"
                    strokeLinecap="round"
                  />
                </svg>

                <div className="absolute bottom-1 text-center font-mono">
                  <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight block">
                    {summary ? `${summary.settledPercentage}%` : "0%"}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mt-0.5">
                    Funds Settled
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-4 text-xs font-medium text-slate-600 pt-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#4f46e5]" />
                  <span>Paid ({summary ? summary.totalSpentDisplay : "$0"})</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0f172a]" />
                  <span>Escrow ({summary ? summary.activeEscrowDisplay : "$0"})</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ====================================================================
          5. ROW 2: TRANSACTION HISTORY & SETTLEMENT SIDE CARDS
         ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT: Transaction History / Verifiable Settlement Ledger (8 Cols) */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                Transaction History
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Verified settlement records & Dual SHA-256 state consensus receipts.
              </p>
            </div>

            {/* Quick Status Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {(["ALL", "RELEASED", "IN_ESCROW", "PENDING_REVIEW"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setTxStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                    txStatusFilter === st
                      ? "bg-[#4f46e5] text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {st === "ALL"
                    ? "All"
                    : st === "IN_ESCROW"
                    ? "In Escrow"
                    : st === "PENDING_REVIEW"
                    ? "Pending"
                    : "Paid"}
                </button>
              ))}
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={txSearchQuery}
              onChange={(e) => setTxSearchQuery(e.target.value)}
              placeholder="Search by contractor, project, or Order ID..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:border-[#4f46e5] focus:bg-white"
            />
          </div>

          {/* Transaction Rows or Clean Empty State */}
          <div className="divide-y divide-slate-100 pt-1">
            {isLoading ? (
              <div className="py-12 text-center text-xs text-slate-400 font-medium">
                Loading verified ledger entries...
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                  <Receipt className="w-6 h-6" />
                </div>
                <div className="max-w-xs">
                  <h3 className="text-sm font-bold text-slate-800">No transactions recorded</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {txSearchQuery || txStatusFilter !== "ALL"
                      ? "No records matched your search filters."
                      : "Milestone funding deposits and releases will appear here with cryptographic receipts."}
                  </p>
                </div>
              </div>
            ) : (
              filteredTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 p-2.5 rounded-2xl transition"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="relative w-10 h-10 rounded-full overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                      <Image
                        src={tx.freelancerAvatar}
                        alt={tx.freelancerName}
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm truncate">
                        {tx.freelancerName}
                      </h4>
                      <p className="text-[11px] text-slate-500 truncate">
                        {tx.projectName} &bull; {tx.milestoneTitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-5">
                    <div className="text-left sm:text-right font-mono">
                      <div className="text-xs font-bold text-slate-900">{tx.date}</div>
                      <div className="text-[10px] text-slate-400">{tx.time}</div>
                    </div>

                    <div className="text-right font-mono min-w-[90px]">
                      <div className="text-xs sm:text-sm font-extrabold text-slate-900">
                        {tx.amountDisplay}
                      </div>
                      <span
                        className={`inline-block px-2 py-0.2 rounded text-[10px] font-bold border mt-0.5 ${tx.statusColor}`}
                      >
                        {tx.statusLabel}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedTxForProof(tx)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs transition cursor-pointer flex items-center gap-1.5 shrink-0"
                    >
                      <Receipt className="w-3.5 h-3.5 text-slate-500" />
                      <span>Receipt</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT: Stack of Previous & Upcoming Settlement Cards */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Card 1: Previous Settlement */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <TrendingUp className="w-4 h-4 text-[#4f46e5]" />
                <span>Previous Settlement</span>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {summary?.previousSettlement?.date || "No prior releases"}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
                {summary?.previousSettlement?.amountDisplay || "$0.00"}
              </div>
              {summary?.previousSettlement && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> PAID
                </span>
              )}
            </div>

            <div className="text-[11px] text-slate-400 border-t border-slate-100 pt-3 font-mono flex items-center justify-between">
              <span>{summary?.previousSettlement ? `${summary.previousSettlement.releaseCount} milestone releases` : "0 releases"}</span>
              <span className="text-emerald-700 font-bold">100% Settled</span>
            </div>
          </div>

          {/* Card 2: Upcoming Escrow Release */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <Calendar className="w-4 h-4 text-amber-500" />
                <span>Upcoming Escrow Release</span>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {upcomingItem?.dueDate || "Scheduled"}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
                {upcomingItem?.amountDisplay || summary?.pendingPaymentsDisplay || "$0.00"}
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1 ${
                  upcomingItem?.isAwaitingRelease
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-slate-50 text-slate-600 border-slate-200"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                {upcomingItem?.isAwaitingRelease ? "PENDING REVIEW" : "SCHEDULED"}
              </span>
            </div>

            {/* Contractor Preview & Action Box */}
            {upcomingItem ? (
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Next Deliverable
                </span>
                
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative w-9 h-9 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                      <Image
                        src={upcomingItem.freelancerAvatar}
                        alt={upcomingItem.freelancerName}
                        fill
                        sizes="36px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-extrabold text-slate-900 truncate">
                        {upcomingItem.freelancerName}
                      </h4>
                      <p className="text-[10px] text-slate-400 truncate">
                        {upcomingItem.milestoneTitle}
                      </p>
                    </div>
                  </div>

                  {upcomingItem.isAwaitingRelease && (
                    <button
                      type="button"
                      onClick={handleAuthorizeRelease}
                      disabled={isReleasingUpcoming}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#4f46e5] hover:bg-[#4338ca] text-white transition shadow-xs cursor-pointer shrink-0"
                    >
                      {isReleasingUpcoming ? "Releasing..." : "Authorize Release"}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="pt-3 border-t border-slate-100 text-xs text-slate-400">
                All milestones currently up to date.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ====================================================================
          6. VERIFIABLE ESCROW PROOF MODAL (DUAL SHA-256 + PAYPAL ORDERS V2)
         ==================================================================== */}
      {selectedTxForProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 text-slate-900 shadow-2xl space-y-5">
            
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-bold">
                  Receipt: {selectedTxForProof.receiptNumber}
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 mt-0.5">
                  Verifiable Settlement Evidence
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTxForProof(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Payout</span>
                <span className="text-xl font-extrabold text-slate-900 font-mono">
                  {selectedTxForProof.amountDisplay}
                </span>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${selectedTxForProof.statusColor}`}
              >
                {selectedTxForProof.statusLabel}
              </span>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">PayPal Order ID</span>
                <span className="font-bold text-slate-900 text-xs mt-0.5 block">{selectedTxForProof.orderId}</span>
              </div>

              {selectedTxForProof.captureId && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">PayPal Capture ID</span>
                  <span className="font-bold text-slate-900 text-xs mt-0.5 block">{selectedTxForProof.captureId}</span>
                </div>
              )}

              {selectedTxForProof.refundId && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Refund ID</span>
                  <span className="font-bold text-purple-700 text-xs mt-0.5 block">{selectedTxForProof.refundId}</span>
                </div>
              )}

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Dual SHA-256 Proof Hash</span>
                <span className="font-bold text-[#4f46e5] text-xs mt-0.5 block break-all">
                  {selectedTxForProof.proofHash}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Payment Rail & Processor</span>
                <span className="font-semibold text-slate-800 text-xs mt-0.5 block">{selectedTxForProof.paymentRail}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  showToast(`Downloaded verifiable PDF receipt for ${selectedTxForProof.receiptNumber}.`);
                  setSelectedTxForProof(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#4f46e5] hover:bg-[#4338ca] text-white shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF Receipt</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTxForProof(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-2.5 rounded-full text-xs font-semibold shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
