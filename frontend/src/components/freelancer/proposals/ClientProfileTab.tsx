"use client";

import React from "react";
import {
  Building2,
  CheckCircle2,
  MapPin,
  Users,
  ShieldCheck,
} from "lucide-react";
import { FreelancerProposalItem } from "@/lib/freelancer-proposals-types";

interface ClientProfileTabProps {
  proposal: FreelancerProposalItem;
}

export default function ClientProfileTab({ proposal }: ClientProfileTabProps) {
  const { client } = proposal;
  const hasDistinctCompany = client.companyName && client.companyName.trim() !== client.name.trim();

  return (
    <div className="space-y-6">
      {/* 1. Client Identity Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex items-start gap-4">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shrink-0 shadow-sm ${client.avatarBg || "bg-indigo-600 text-white"}`}
          >
            {client.avatarLetter || "C"}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-slate-900 truncate">
                {hasDistinctCompany ? client.companyName : client.name}
              </h3>
              {client.verified && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  <CheckCircle2 className="w-3 h-3 text-blue-600 fill-blue-50" />
                  Verified Client
                </span>
              )}
            </div>

            {hasDistinctCompany && (
              <p className="text-xs text-slate-500 mt-1">
                Primary Contact: <strong className="text-slate-800">{client.name}</strong>
              </p>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
              {client.industry && client.industry !== "General" && (
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  {client.industry}
                </span>
              )}
              {client.companySize && (
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  {client.companySize}
                </span>
              )}
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {client.location || "Remote"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Platform Trust & History */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Total Freelancers Hired
          </p>
          <p className="text-xl font-black text-slate-900">{client.totalHires || 0}</p>
          <p className="text-[10px] text-slate-500 font-medium">
            {(client.totalHires || 0) > 0 ? "Bilateral escrow verified" : "New client on Nexum"}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Client Verification
          </p>
          <p className="text-xl font-black text-indigo-600">
            {client.verified ? "Verified" : "Registered"}
          </p>
          <p className="text-[10px] text-slate-500">
            {client.verified ? "Authenticated account" : "Active workspace account"}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Member Since
          </p>
          <p className="text-xl font-black text-slate-900">{client.memberSince || 2026}</p>
          <p className="text-[10px] text-slate-500">Active member</p>
        </div>
      </div>

      {/* 3. Escrow Security Guarantee */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <span>
          <strong>Nexum Escrow Protocol:</strong> When this client accepts your proposal and contract agreement is ratified, all milestone funds are pre-deposited into verified bilateral escrow before you start development.
        </span>
      </div>
    </div>
  );
}
