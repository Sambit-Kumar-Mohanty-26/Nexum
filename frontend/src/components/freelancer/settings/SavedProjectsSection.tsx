"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trash2, ArrowUpRight, Bookmark, Loader2 } from "lucide-react";
import { SavedProject } from "@/lib/freelancer-settings-types";
import { getSavedFreelancerProjects, unsaveFreelancerProject } from "@/lib/api-client";

interface SavedProjectsSectionProps {
  showToast: (msg: string) => void;
  onOpenProject?: (project: SavedProject) => void;
}

export default function SavedProjectsSection({
  showToast,
  onOpenProject,
}: SavedProjectsSectionProps) {
  const router = useRouter();
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function loadSavedProjects() {
      setIsLoading(true);
      try {
        const res = await getSavedFreelancerProjects();
        if (!isMounted) return;

        const serverItems: SavedProject[] = [];
        if (res.success && Array.isArray(res.savedProjects)) {
          for (const p of res.savedProjects as any[]) {
            serverItems.push({
              id: p.id || p.projectId,
              title: p.title || "Untitled Project",
              clientCompany: p.client?.company || p.client?.name || "Client Team",
              budget:
                p.budgetDisplay ||
                (p.budgetCents
                  ? `$${(p.budgetCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })} ${p.currency || "USD"}`
                  : "Negotiable"),
              skills: Array.isArray(p.skills) ? p.skills : [],
              status:
                p.availability === "CLOSED"
                  ? "CLOSED"
                  : p.state === "MATCHING" || p.state === "OPEN" || p.state === "ACTIVE"
                  ? "OPEN"
                  : "IN_REVIEW",
              savedDate: p.savedAt
                ? new Date(p.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                : p.postedAt
                ? new Date(p.postedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                : "Recently",
            });
          }
        }

        // Merge with locally stored bookmarks if any
        let localItems: SavedProject[] = [];
        try {
          const raw = localStorage.getItem("nexum_saved_projects");
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              localItems = parsed;
            }
          }
        } catch {}

        // Combine unique projects by id
        const map = new Map<string, SavedProject>();
        for (const item of serverItems) {
          map.set(item.id, item);
        }
        for (const item of localItems) {
          if (!map.has(item.id)) {
            map.set(item.id, item);
          }
        }

        setProjects(Array.from(map.values()));
      } catch (err) {
        console.warn("Could not fetch saved projects from backend:", err);
        // Fallback to local storage
        try {
          const raw = localStorage.getItem("nexum_saved_projects");
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              setProjects(parsed);
            }
          } else {
            setProjects([]);
          }
        } catch {
          setProjects([]);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadSavedProjects();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleRemove = async (id: string, title: string) => {
    // Optimistically update UI
    setProjects((prev) => prev.filter((p) => p.id !== id));

    // Update localStorage
    try {
      const raw = localStorage.getItem("nexum_saved_projects");
      if (raw) {
        const parsed = JSON.parse(raw);
        const filtered = parsed.filter((p: any) => p.id !== id);
        localStorage.setItem("nexum_saved_projects", JSON.stringify(filtered));
      }
      const rawIds = localStorage.getItem("nexum_saved_project_ids");
      if (rawIds) {
        const parsedIds = JSON.parse(rawIds);
        const filteredIds = parsedIds.filter((pId: string) => pId !== id);
        localStorage.setItem("nexum_saved_project_ids", JSON.stringify(filteredIds));
      }
    } catch {}

    showToast(`Removed "${title}" from saved projects.`);

    try {
      await unsaveFreelancerProject(id);
    } catch (err) {
      console.warn("Failed to unsave project on backend:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
          Saved Projects
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Review and manage project briefs and client opportunities you bookmarked.
        </p>
      </div>

      <div className="space-y-3.5">
        {isLoading ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
            <Loader2 className="w-6 h-6 text-[#4f46e5] animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-500">
              Loading your bookmarked opportunities...
            </p>
          </div>
        ) : projects.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-[#4f46e5]">
              <Bookmark className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">No Saved Projects</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                You haven&apos;t bookmarked any opportunities yet. Browse verified opportunities in Find Projects to save them for later review.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/freelancer/dashboard?tab=find-projects")}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <span>Explore Available Projects</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          projects.map((proj) => (
            <div
              key={proj.id}
              className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3 hover:border-slate-300 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      {proj.title}
                    </h3>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                      {proj.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {proj.clientCompany} · Saved {proj.savedDate}
                  </p>
                </div>
                <div className="text-sm font-extrabold text-slate-900 font-mono">
                  {proj.budget}
                </div>
              </div>

              {/* Skills Tags */}
              {proj.skills && proj.skills.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {proj.skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium text-[11px]"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleRemove(proj.id, proj.title)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-red-600 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onOpenProject) {
                      onOpenProject(proj);
                    } else {
                      router.push(`/freelancer/projects/${proj.id}/apply`);
                    }
                  }}
                  className="flex items-center gap-1.5 text-xs font-bold text-[#4f46e5] hover:text-[#4338ca] transition cursor-pointer"
                >
                  <span>Open Brief</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
