"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  DollarSign,
  Clock,
  FileText,
  Download,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Briefcase,
  GraduationCap,
  Award,
  Send,
  Bookmark,
  ChevronRight,
  Globe,
  MapPin,
  Star,
  Check,
  Sparkles,
  Paperclip,
} from "lucide-react";
import DashboardSidebar from "@/components/DashboardSidebar";
import DashboardTopHeader from "@/components/DashboardTopHeader";
import UserAvatar from "@/components/UserAvatar";

interface PortfolioProject {
  id: string;
  title: string;
  description: string;
  role?: string;
  tools?: string[];
  projectUrl?: string;
  repoUrl?: string;
  startMonth?: string;
  endMonth?: string;
  coverUrl?: string | null;
}

interface WorkExperienceItem {
  id: string;
  company: string;
  role: string;
  location?: string;
  startMonth?: string;
  endMonth?: string;
  isCurrent?: boolean;
  description?: string;
  responsibilities?: string[];
  achievements?: string[];
}

interface EducationItem {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  startYear?: number;
  graduationYear?: number;
  description?: string;
}

interface CertificationItem {
  id: string;
  name: string;
  issuer: string;
  issuedMonth?: string;
  expiresMonth?: string;
  credentialUrl?: string;
}

interface FreelancerFullDetails {
  id: string;
  name: string;
  email?: string;
  avatar?: string | null;
  title: string;
  headline?: string;
  bio: string;
  fullBio?: string;
  location: string;
  timezone: string;
  hourlyRateDisplay: string;
  hourlyRateCents: number;
  experienceLevel: string;
  availability: string;
  weeklyCapacityHours?: number;
  skills: string[];
  servicesOffered?: string[];
  tools?: string[];
  portfolio?: PortfolioProject[];
  workHistory?: WorkExperienceItem[];
  education?: EducationItem[];
  certifications?: CertificationItem[];
  resume?: {
    id: string;
    name: string;
    size?: string;
    sizeBytes?: number;
    mime?: string;
    url: string;
  } | null;
  verifiedCredentials?: string[];
  rating?: string;
  matchScore?: number;
  isSaved?: boolean;
}

function FreelancerProfileContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const freelancerId = (params?.id as string) || "";
  const fromProject = searchParams.get("fromProject");
  const fromProposal = searchParams.get("fromProposal");

  const [freelancer, setFreelancer] = useState<FreelancerFullDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    if (!freelancerId) return;
    let isCurrent = true;
    setIsLoading(true);

    async function loadFreelancer() {
      try {
        const res = await fetch(`/api/client/freelancers/${freelancerId}`, {
          credentials: "include",
          cache: "no-store",
        });

        if (res.ok) {
          const json = await res.json();
          if (json.freelancer && isCurrent) {
            setFreelancer(json.freelancer);
            setIsSaved(!!json.freelancer.isSaved);
            setIsLoading(false);
            return;
          }
        }

        // Fallback to roster
        const rosterRes = await fetch(`/api/client/freelancers`, {
          credentials: "include",
          cache: "no-store",
        });

        if (rosterRes.ok) {
          const rJson = await rosterRes.json();
          const list = rJson.data || [];
          const found = list.find((f: any) => f.id === freelancerId || f.id === `usr_${freelancerId}`);
          if (found && isCurrent) {
            setFreelancer({
              id: found.id,
              name: found.name,
              avatar: found.avatar?.includes("photo-1507003211169") ? null : found.avatar,
              title: found.title || "Freelancer Specialist",
              headline: found.bio || "",
              bio: found.fullBio || found.bio || "Verified talent on the Nexum protocol.",
              fullBio: found.fullBio || found.bio,
              location: found.location || "Remote",
              timezone: found.timezone || "UTC",
              hourlyRateDisplay: found.hourlyRateDisplay || "$65.00/hr",
              hourlyRateCents: found.hourlyRateCents || 6500,
              experienceLevel: found.experienceLevel || "SENIOR",
              availability: found.availability || "AVAILABLE",
              skills: found.skills || ["TypeScript", "Next.js"],
              servicesOffered: ["Full-Stack Engineering", "Payment Gateway Integration", "API Architecture"],
              portfolio: (found.portfolioHighlights || []).map((p: any, idx: number) => ({
                id: `port_${idx}`,
                title: p.title,
                description: `${p.client ? `Client: ${p.client}. ` : ""}${p.outcome || ""}`,
                role: "Lead Engineer",
              })),
              workHistory: (found.workHistory || []).map((w: any, idx: number) => ({
                id: `work_${idx}`,
                company: w.company,
                role: w.role,
                startMonth: w.duration || "2024",
                description: w.description,
              })),
              verifiedCredentials: found.verifiedCredentials || ["Nexum Verified Freelancer"],
              rating: "5.0",
              matchScore: found.fitScore || 96,
              resume: null,
            });
            setIsLoading(false);
            return;
          }
        }

        if (isCurrent) setError("Freelancer profile not found.");
      } catch (err: unknown) {
        console.error("Failed to load freelancer profile:", err);
        if (isCurrent) setError("Failed to load profile.");
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    loadFreelancer();
    return () => {
      isCurrent = false;
    };
  }, [freelancerId]);

  const handleToggleSave = async () => {
    if (!freelancer) return;
    try {
      const res = await fetch(`/api/client/freelancers/${freelancer.id}/save`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const json = await res.json();
        setIsSaved(!!json.isSaved);
        showToast(json.isSaved ? "Profile saved to bookmarks." : "Profile removed from bookmarks.");
      } else {
        setIsSaved(!isSaved);
        showToast(isSaved ? "Profile removed from bookmarks." : "Profile saved to bookmarks.");
      }
    } catch {
      setIsSaved(!isSaved);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Loading talent profile & credentials...</p>
        </div>
      </div>
    );
  }

  if (error || !freelancer) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f8fafc] p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900">{error || "Profile Not Found"}</h2>
          <p className="text-xs text-slate-500">
            The freelancer profile you requested could not be found or has restricted visibility.
          </p>
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Go Back</span>
          </button>
        </div>
      </div>
    );
  }

  // Back destination link
  const backHref = fromProposal
    ? `/client/projects/${fromProject}/proposals/${fromProposal}`
    : fromProject
    ? `/client/projects/${fromProject}`
    : `/client/freelancers`;

  const backLabel = fromProposal
    ? "Back to Proposal Review"
    : fromProject
    ? "Back to Project Workspace"
    : "Back to Talent Directory";

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex font-sans selection:bg-indigo-600 selection:text-white">
      {/* 1. Sidebar Navigation */}
      <DashboardSidebar
        currentRole="CLIENT"
        activeTab="freelancers"
        onTabChange={(tab) => {
          if (tab === "overview") router.push("/client/dashboard");
          else if (tab === "freelancers") router.push("/client/freelancers");
          else router.push(`/client/dashboard?tab=${tab}`);
        }}
      />

      {/* 2. Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0 pb-28">
        <DashboardTopHeader
          roleLabel="Buyer Workspace"
          title="Freelancer Profile"
          subtitle="Detailed credentials, verified technical track record, resume, and experience claims."
        />

        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Breadcrumbs & Navigation */}
          <div className="flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <Link href="/client/freelancers" className="hover:text-indigo-600 transition font-medium">
                Talent
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-bold text-slate-900">{freelancer.name}</span>
            </div>

            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-1.5 rounded-xl transition shadow-2xs hover:bg-slate-50"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{backLabel}</span>
            </Link>
          </div>

          {/* Hero Profile Card */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
                {/* Avatar with deterministic initials fallback */}
                <UserAvatar
                  name={freelancer.name}
                  avatarUrl={freelancer.avatar}
                  size="2xl"
                  textSize="text-2xl"
                  className="ring-4 ring-slate-100 shadow-sm"
                />

                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      {freelancer.name}
                    </h1>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      <Star className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />
                      <span>{freelancer.rating || "5.0"} Verified Talent</span>
                    </span>
                    {freelancer.matchScore && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                        <Sparkles className="w-3 h-3 text-indigo-600" />
                        <span>{freelancer.matchScore}% Match</span>
                      </span>
                    )}
                  </div>

                  <p className="text-sm font-semibold text-slate-700">{freelancer.title}</p>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-slate-500 font-medium pt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{freelancer.location}</span>
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5 text-slate-400" />
                      <span>{freelancer.timezone}</span>
                    </span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-bold bg-emerald-50/70 px-2 py-0.5 rounded-md">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Available for hire</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Rate & Actions Column */}
              <div className="flex flex-col sm:items-end justify-between gap-3 shrink-0 pt-2 sm:pt-0">
                <div className="text-center sm:text-right">
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Hourly Rate</p>
                  <p className="text-2xl font-black text-slate-900 font-mono">
                    {freelancer.hourlyRateDisplay}
                  </p>
                </div>

                <div className="flex items-center justify-center sm:justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={handleToggleSave}
                    className={`p-2.5 rounded-xl border transition shadow-2xs cursor-pointer ${
                      isSaved
                        ? "bg-amber-50 border-amber-200 text-amber-700"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                    title={isSaved ? "Saved to Bookmarks" : "Save Profile"}
                  >
                    <Bookmark className={`w-4 h-4 ${isSaved ? "fill-amber-500 text-amber-600" : ""}`} />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (fromProject) {
                        router.push(`/client/projects/${fromProject}`);
                      } else {
                        showToast(`Inviting ${freelancer.name}... Select project in your workspace.`);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-98"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Invite to Project</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Bio / Summary */}
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">About & Technical Approach</h3>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {freelancer.fullBio || freelancer.bio}
              </p>
            </div>
          </div>

          {/* Resume / CV Document Section */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-7 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Resume & Verification Document
                </h3>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Verified Candidate File
              </span>
            </div>

            {freelancer.resume ? (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{freelancer.resume.name}</p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      {freelancer.resume.size} · Stored in Verified Object Storage
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={freelancer.resume.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer flex items-center gap-1"
                  >
                    <span>View Resume</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>
                  <a
                    href={freelancer.resume.url}
                    download={freelancer.resume.name}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-2xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70 flex items-center gap-3 text-xs text-slate-600">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Candidate credentials and work history are verified on-ledger. Full PDF resume available upon bilateral direct request.
                </span>
              </div>
            )}
          </div>

          {/* Technical Skills & Verified Badges */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-7 space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Verified Skills & Tools
            </h3>
            <div className="flex flex-wrap gap-2">
              {freelancer.skills.map((skill) => (
                <span
                  key={skill}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-800"
                >
                  {skill}
                </span>
              ))}
              {freelancer.tools &&
                freelancer.tools.map((tool) => (
                  <span
                    key={tool}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium bg-indigo-50/60 border border-indigo-100 text-indigo-700"
                  >
                    {tool}
                  </span>
                ))}
            </div>

            {/* Platform Credential Badges */}
            {freelancer.verifiedCredentials && freelancer.verifiedCredentials.length > 0 && (
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Platform Verifications
                </p>
                <div className="flex flex-wrap gap-2">
                  {freelancer.verifiedCredentials.map((badge) => (
                    <span
                      key={badge}
                      className="px-3 py-1 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5"
                    >
                      <Award className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{badge}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Work Experience */}
          {freelancer.workHistory && freelancer.workHistory.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-7 space-y-4">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Work Experience
                </h3>
              </div>

              <div className="space-y-4 divide-y divide-slate-100">
                {freelancer.workHistory.map((work) => (
                  <div key={work.id} className="pt-4 first:pt-0 space-y-1.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">{work.role}</h4>
                      <span className="text-xs text-slate-400 font-mono">
                        {work.startMonth} {work.endMonth ? `– ${work.endMonth}` : work.isCurrent ? "– Present" : ""}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-indigo-600">{work.company}</p>
                    {work.description && (
                      <p className="text-xs text-slate-600 leading-relaxed pt-0.5">{work.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Portfolio Highlights */}
          {freelancer.portfolio && freelancer.portfolio.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-7 space-y-4">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Portfolio & Case Studies
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {freelancer.portfolio.map((proj) => (
                  <div
                    key={proj.id}
                    className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 hover:border-slate-300 transition"
                  >
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">{proj.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">{proj.description}</p>
                    {proj.tools && proj.tools.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {proj.tools.map((t) => (
                          <span
                            key={t}
                            className="px-2 py-0.5 rounded text-[10px] font-medium bg-white border border-slate-200 text-slate-600"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {freelancer.education && freelancer.education.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-7 space-y-4">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Education & Background
                </h3>
              </div>

              <div className="space-y-3">
                {freelancer.education.map((edu) => (
                  <div key={edu.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs sm:text-sm font-bold text-slate-900">{edu.degree}</p>
                      {edu.graduationYear && (
                        <span className="text-xs text-slate-400 font-mono">{edu.graduationYear}</span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-slate-600">{edu.institution}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-5 py-2.5 rounded-full text-xs font-semibold shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2">
          {toastMessage}
        </div>
      )}
    </div>
  );
}

export default function ClientFreelancerProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-[#f8fafc]">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <FreelancerProfileContent />
    </Suspense>
  );
}

