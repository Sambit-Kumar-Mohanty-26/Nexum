"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Plus,
  Trash2,
  DollarSign,
  Calendar,
  ArrowRight,
  ShieldCheck,
  Check,
  Edit2,
  FileText,
  AlertCircle,
  Upload,
  Loader2,
  Clock,
  Wand2,
  RefreshCw,
  Layers,
  Scale,
  Eye,
  Edit3,
} from "lucide-react";
import DashboardSidebar from "@/components/DashboardSidebar";
import DashboardTopHeader from "@/components/DashboardTopHeader";
import { useAuth } from "@/context/AuthContext";
import { fetchProjectById, saveProject } from "@/lib/api-client";

const PROJECT_CATEGORIES: Record<string, string[]> = {
  "Web Development": ["Full Stack Development", "Frontend / Next.js", "Backend & APIs", "E-Commerce"],
  "AI / Machine Learning": ["LLM & Agent Workflows", "Computer Vision", "NLP & Semantic Search", "Fine-tuning"],
  "Blockchain / Web3": ["Smart Contracts", "DeFi Protocols", "Web3 Ingestion", "Solidity Audits"],
  "Mobile Development": ["React Native", "iOS / Swift", "Android / Kotlin", "Flutter"],
  "UI/UX Design": ["Design Systems", "Figma Prototyping", "User Research", "Wireframing"],
  "DevOps / Cloud": ["Kubernetes", "AWS & GCP Architecture", "CI/CD Pipelines", "Docker"],
};

const CATEGORY_SKILL_RECOMMENDATIONS: Record<string, string[]> = {
  "Web Development": [
    "React", "Next.js", "Node.js", "TypeScript", "PostgreSQL", "Tailwind CSS", "GraphQL", "Redis", "REST APIs", "Stripe"
  ],
  "AI / Machine Learning": [
    "Python", "PyTorch", "FastAPI", "OpenAI / LLMs", "LangChain", "pgvector", "RAG", "TensorFlow", "Pandas", "Hugging Face"
  ],
  "Blockchain / Web3": [
    "Solidity", "Smart Contracts", "Ethers.js", "Hardhat", "Web3.js", "Rust", "DeFi", "IPFS", "Ethereum", "Tokenomics"
  ],
  "Mobile Development": [
    "React Native", "Flutter", "Swift", "Kotlin", "iOS", "Android", "Firebase", "Mobile UI", "Expo", "SQLite"
  ],
  "UI/UX Design": [
    "Figma", "Design Systems", "Wireframing", "Prototyping", "User Research", "Mobile Design", "Web Design", "Tailwind CSS"
  ],
  "DevOps / Cloud": [
    "Docker", "Kubernetes", "AWS", "Terraform", "CI/CD Pipelines", "GCP", "Linux", "Prometheus", "Nginx", "GitHub Actions"
  ],
};

const KEYWORD_SKILL_MAP: Record<string, string[]> = {
  ecommerce: ["Stripe", "Shopify", "Payment Gateway", "Cart & Checkout", "PostgreSQL"],
  shop: ["Stripe", "Shopify", "Payment Gateway", "Cart & Checkout"],
  payment: ["Stripe", "PayPal", "Payment Gateway", "Financial Ledger", "Webhooks"],
  chat: ["WebSockets", "Socket.io", "Redis", "Real-Time Chat"],
  realtime: ["WebSockets", "Redis", "Socket.io"],
  auth: ["OAuth", "JWT", "NextAuth", "RBAC"],
  dashboard: ["Data Visualization", "Chart.js", "Tailwind CSS", "Analytics"],
  analytics: ["Data Visualization", "Mixpanel", "Analytics", "PostgreSQL"],
  database: ["PostgreSQL", "Prisma", "Redis", "MongoDB", "SQL Optimization"],
  api: ["REST APIs", "GraphQL", "FastAPI", "Swagger / OpenAPI"],
  mobile: ["React Native", "Flutter", "Swift", "Kotlin"],
  ios: ["iOS", "Swift", "Apple Pay", "Mobile UI"],
  android: ["Android", "Kotlin", "Jetpack Compose"],
  flutter: ["Flutter", "Dart", "Cross-Platform Mobile"],
  ai: ["Python", "OpenAI / LLMs", "FastAPI", "pgvector", "LangChain"],
  llm: ["OpenAI / LLMs", "LangChain", "RAG", "Prompt Engineering"],
  agent: ["LLM Agents", "LangChain", "Autonomous Workflows", "Vector DB"],
  figma: ["Figma", "Design Systems", "UI Prototyping"],
  crypto: ["Solidity", "Web3.js", "Smart Contracts", "Ethers.js"],
};

const SUGGESTED_SKILLS = [
  "React",
  "Next.js",
  "Node.js",
  "TypeScript",
  "PostgreSQL",
  "Python",
  "FastAPI",
  "AI/ML",
  "Data Visualization",
  "Docker",
  "Redis",
];

const MATCHING_FREELANCERS_PREVIEW = [
  {
    name: "Rohan Verma",
    role: "Senior Full-Stack & Payment Rails Engineer",
    rating: "5.0",
    skills: ["PayPal v2", "Next.js", "PostgreSQL", "State Machines"],
    rate: "$65/hr",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80",
  },
  {
    name: "Sambit Kumar Mohanty",
    role: "Full-Stack Specialist & Escrow Engineer",
    rating: "5.0",
    skills: ["Next.js", "React", "TypeScript", "Tailwind CSS"],
    rate: "$60/hr",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80",
  },
  {
    name: "Chandrasekhar",
    role: "Freelancer Specialist",
    rating: "5.0",
    skills: ["Web development", "Backend / API development", "TypeScript"],
    rate: "$60/hr",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80",
  },
];

const DEFAULT_SCOPE_OPTIONS = [
  "Frontend development",
  "Backend development",
  "Database design",
  "AI/ML integration",
  "Dashboard and reports",
  "Testing and deployment",
];

function PostNewProjectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftIdParam = searchParams.get("draftId");
  const templateParam = searchParams.get("template");
  const { user } = useAuth();

  const [activeDraftId, setActiveDraftId] = useState<string | null>(draftIdParam);
  const [loadedDraftNotice, setLoadedDraftNotice] = useState<string | null>(null);

  // Wizard Step: 1: Details, 2: Requirements, 3: Budget & Timeline, 4: Preferences, 5: Review & Publish
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Project Details (Clean un-mocked baseline)
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [overview, setOverview] = useState("");
  const [keyGoals, setKeyGoals] = useState<string[]>([]);
  const [otherGoal, setOtherGoal] = useState("");

  // Step 2: Requirements & Scope (Clean un-mocked baseline with custom input support)
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [customSkillInput, setCustomSkillInput] = useState("");
  const [detailedRequirements, setDetailedRequirements] = useState("");
  const [requirementsViewMode, setRequirementsViewMode] = useState<"write" | "preview">("write");
  const [scopeOfWork, setScopeOfWork] = useState<string[]>([]);
  const [customScopeInput, setCustomScopeInput] = useState("");
  const [customScopeItems, setCustomScopeItems] = useState<string[]>([]);

  // Step 3: Budget & Milestones (Clean un-mocked baseline - no automatic preselection)
  const [budgetType, setBudgetType] = useState<"FIXED" | "HOURLY" | null>(null);
  const [budgetAmount, setBudgetAmount] = useState("");
  const [timelineDuration, setTimelineDuration] = useState("");
  const [milestones, setMilestones] = useState([
    { title: "", amount: "", days: "14" },
  ]);

  // Gemini AI Scope & Schedule Balancer State
  const [isAiBalancingSchedule, setIsAiBalancingSchedule] = useState(false);
  const [aiAdjustmentMessage, setAiAdjustmentMessage] = useState<string | null>(null);
  const [addonInputText, setAddonInputText] = useState("");
  const [isAddonModalOpen, setIsAddonModalOpen] = useState(false);
  const [previousScheduleSnapshot, setPreviousScheduleSnapshot] = useState<{
    milestones: Array<{ title: string; amount: string; days: string }>;
    budgetAmount: string;
    timelineDuration: string;
  } | null>(null);

  // --- Budget and Timeline Calculations & Synchronization ---
  const totalBudget = parseFloat(budgetAmount) || 0;
  const allocatedBudget = milestones.reduce((sum, m) => sum + (parseFloat(m.amount) || 0), 0);
  const remainingBudget = Math.round((totalBudget - allocatedBudget) * 100) / 100;

  const totalMilestoneDays = milestones.reduce((sum, m) => sum + (parseInt(m.days, 10) || 0), 0);

  const getTimelineTargetDays = (duration: string): { targetDays: number; label: string } => {
    const str = (duration || "").trim().toLowerCase();
    if (str === "< 1 month") return { targetDays: 30, label: "< 1 month (~30 days)" };
    if (str === "1 - 2 months") return { targetDays: 60, label: "1 - 2 months (~60 days)" };
    if (str === "3 - 6 months") return { targetDays: 90, label: "3 - 6 months (~90 - 180 days)" };
    if (str === "6+ months") return { targetDays: 180, label: "6+ months (~180+ days)" };

    const mMatch = str.match(/(\d+)\s*(?:-|to)?\s*(\d+)?\s*month/);
    if (mMatch) {
      const m = parseInt(mMatch[1], 10);
      return { targetDays: m * 30, label: `${m} months (~${m * 30} days)` };
    }
    const wMatch = str.match(/(\d+)\s*(?:-|to)?\s*(\d+)?\s*week/);
    if (wMatch) {
      const w = parseInt(wMatch[1], 10);
      return { targetDays: w * 7, label: `${w} weeks (~${w * 7} days)` };
    }
    const dMatch = str.match(/(\d+)\s*day/);
    if (dMatch) {
      const d = parseInt(dMatch[1], 10);
      return { targetDays: d, label: `${d} days` };
    }
    return { targetDays: 60, label: duration || "60 days" };
  };

  const timelineInfo = getTimelineTargetDays(timelineDuration);
  const targetTimelineDays = timelineInfo.targetDays;
  const isTimelineExceeded = totalMilestoneDays > targetTimelineDays && targetTimelineDays > 0;
  const overTimelineDays = isTimelineExceeded ? totalMilestoneDays - targetTimelineDays : 0;
  const unallocatedDays = !isTimelineExceeded && targetTimelineDays > 0 ? targetTimelineDays - totalMilestoneDays : 0;

  // Auto-balance budget evenly across milestones
  const handleAutoBalanceBudget = () => {
    if (milestones.length === 0 || totalBudget <= 0) return;
    const count = milestones.length;
    const baseAmount = Math.floor(totalBudget / count);
    const updated = milestones.map((m, idx) => {
      const isLast = idx === count - 1;
      const amt = isLast ? totalBudget - baseAmount * (count - 1) : baseAmount;
      return { ...m, amount: String(Math.max(amt, 0)) };
    });
    setMilestones(updated);
    showToast(`Milestone budget balanced to equal $${totalBudget}!`);
  };

  // Fill remaining budget into a specific milestone index or last milestone
  const handleFillRemainingBudget = (targetIdx?: number) => {
    if (remainingBudget <= 0 || milestones.length === 0) return;
    const idx = targetIdx !== undefined ? targetIdx : milestones.length - 1;
    const currentVal = parseFloat(milestones[idx].amount) || 0;
    const updated = [...milestones];
    updated[idx].amount = String(currentVal + remainingBudget);
    setMilestones(updated);
    showToast(`Allocated remaining $${remainingBudget} into Milestone ${idx + 1}!`);
  };

  // Auto-expand total budget to match milestones if over-budget
  const handleAutoExpandBudget = () => {
    if (allocatedBudget <= 0) return;
    setBudgetAmount(String(allocatedBudget));
    showToast(`Project budget adjusted to $${allocatedBudget} to match milestones!`);
  };

  // Distribute timeline target days evenly across milestones
  const handleAutoDistributeTimelineDays = () => {
    if (milestones.length === 0 || targetTimelineDays <= 0) return;
    const count = milestones.length;
    const baseDays = Math.floor(targetTimelineDays / count);
    const updated = milestones.map((m, idx) => {
      const isLast = idx === count - 1;
      const days = isLast ? targetTimelineDays - baseDays * (count - 1) : baseDays;
      return { ...m, days: String(Math.max(days, 1)) };
    });
    setMilestones(updated);
    showToast(`Milestone days distributed to match ${targetTimelineDays} days timeline!`);
  };

  // Auto-extend project timeline to match total milestone days
  const handleKeepExtendedTimeline = () => {
    if (totalMilestoneDays <= 0) return;
    let label = `${totalMilestoneDays} days`;
    if (totalMilestoneDays > 180) label = "6+ months";
    else if (totalMilestoneDays > 60) label = "3 - 6 months";
    else if (totalMilestoneDays > 30) label = "1 - 2 months";
    else label = "< 1 month";
    setTimelineDuration(label);
    showToast(`Project timeline updated to ${label} (${totalMilestoneDays} days total)!`);
  };

  // Scale down milestone days to fit original timeline
  const handleCompressMilestonesToFitTimeline = () => {
    if (milestones.length === 0 || targetTimelineDays <= 0) return;
    const count = milestones.length;
    const ratio = targetTimelineDays / totalMilestoneDays;
    let accumulated = 0;
    const updated = milestones.map((m, idx) => {
      const isLast = idx === count - 1;
      if (isLast) {
        const remaining = Math.max(targetTimelineDays - accumulated, 1);
        return { ...m, days: String(remaining) };
      }
      const raw = parseInt(m.days, 10) || 14;
      const scaled = Math.max(Math.round(raw * ratio), 1);
      accumulated += scaled;
      return { ...m, days: String(scaled) };
    });
    setMilestones(updated);
    showToast(`Milestones compressed to fit within ${targetTimelineDays} days!`);
  };

  // Gemini AI Auto-Sync Schedule & Budget
  const handleAiAutoSyncSchedule = async () => {
    setIsAiBalancingSchedule(true);
    setPreviousScheduleSnapshot({
      milestones: JSON.parse(JSON.stringify(milestones)),
      budgetAmount,
      timelineDuration,
    });
    try {
      const res = await fetch("/api/client/projects/ai/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "AUTO_SYNC_SCHEDULE",
          title,
          overview,
          budgetAmount,
          timelineDuration,
          milestones,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        if (Array.isArray(json.data.updatedMilestones)) {
          setMilestones(json.data.updatedMilestones);
        }
        if (json.data.adjustedBudget) {
          setBudgetAmount(json.data.adjustedBudget);
        }
        if (json.data.adjustedTimeline) {
          setTimelineDuration(json.data.adjustedTimeline);
        }
        setAiAdjustmentMessage(json.data.explanation || "Schedule & budget synchronized by Gemini AI.");
        showToast("Gemini AI balanced milestone schedule & budget!");
      }
    } catch {
      showToast("AI Auto-Sync unavailable. You can adjust values manually.");
    } finally {
      setIsAiBalancingSchedule(false);
    }
  };

  // Gemini AI Evaluate and Add Scope Add-on
  const handleAiEvaluateAddon = async (customText?: string) => {
    const textToEvaluate = customText || addonInputText.trim();
    if (!textToEvaluate) return;

    setIsAiBalancingSchedule(true);
    setPreviousScheduleSnapshot({
      milestones: JSON.parse(JSON.stringify(milestones)),
      budgetAmount,
      timelineDuration,
    });
    try {
      const res = await fetch("/api/client/projects/ai/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "EVALUATE_ADDON_OR_SCOPE",
          title,
          overview,
          budgetAmount,
          timelineDuration,
          milestones,
          addonDescription: textToEvaluate,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        if (Array.isArray(json.data.updatedMilestones)) {
          setMilestones(json.data.updatedMilestones);
        }
        if (json.data.adjustedBudget) {
          setBudgetAmount(json.data.adjustedBudget);
        }
        if (json.data.adjustedTimeline) {
          setTimelineDuration(json.data.adjustedTimeline);
        }
        setAiAdjustmentMessage(json.data.explanation || `Scope add-on '${textToEvaluate}' incorporated by Gemini AI.`);
        setAddonInputText("");
        setIsAddonModalOpen(false);
        showToast("Scope add-on incorporated & schedule auto-adjusted by Gemini AI!");
      }
    } catch {
      showToast("AI Scope Evaluation offline. Added milestone manually.");
    } finally {
      setIsAiBalancingSchedule(false);
    }
  };

  // Undo AI Auto-Adjustment
  const handleUndoAiAdjustment = () => {
    if (!previousScheduleSnapshot) return;
    setMilestones(previousScheduleSnapshot.milestones);
    setBudgetAmount(previousScheduleSnapshot.budgetAmount);
    setTimelineDuration(previousScheduleSnapshot.timelineDuration);
    setPreviousScheduleSnapshot(null);
    setAiAdjustmentMessage(null);
    showToast("Reverted schedule and budget to previous state.");
  };

  // Step 4: Hiring Preferences (Clean un-mocked baseline - no automatic preselection)
  const [experienceLevel, setExperienceLevel] = useState<"ENTRY" | "INTERMEDIATE" | "EXPERT" | null>(null);
  const [englishLevel, setEnglishLevel] = useState<"CONVERSATIONAL" | "FLUENT" | "NATIVE" | null>(null);
  const [proposalsLimit, setProposalsLimit] = useState<"10_15" | "15_30" | "OPEN" | "">("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "INVITE_ONLY" | "">("");

  // Toast / Publishing State
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Document Extraction & AI Assistant State
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isExtractingDoc, setIsExtractingDoc] = useState(false);
  const [extractedFileName, setExtractedFileName] = useState<string | null>(null);
  const [uploadedDocAttachment, setUploadedDocAttachment] = useState<{
    name: string;
    size: string;
    type: string;
    uploadedAt: string;
    dataUrl?: string;
  } | null>(null);
  const [isAiImprovingOverview, setIsAiImprovingOverview] = useState(false);
  const [isAiSuggestingSkills, setIsAiSuggestingSkills] = useState(false);
  const [isAiRefiningRequirements, setIsAiRefiningRequirements] = useState(false);
  const [recommendedSkillsList, setRecommendedSkillsList] = useState<string[]>([
    "React",
    "Next.js",
    "Node.js",
    "TypeScript",
    "PostgreSQL",
    "Docker",
  ]);

  // Dynamically derive recommended skills based on what the client is filling up
  useEffect(() => {
    // 1. Category-specific base pool
    let dynamicPool: string[] = [];
    if (category && CATEGORY_SKILL_RECOMMENDATIONS[category]) {
      dynamicPool = [...CATEGORY_SKILL_RECOMMENDATIONS[category]];
    } else {
      dynamicPool = ["React", "Next.js", "TypeScript", "Node.js", "PostgreSQL", "Docker", "Redis"];
    }

    // 2. Keyword scan across Title, Overview, and Subcategory
    const contextText = `${title} ${overview} ${subcategory}`.toLowerCase();
    const keywordMatches: string[] = [];

    for (const [kw, skills] of Object.entries(KEYWORD_SKILL_MAP)) {
      if (contextText.includes(kw)) {
        keywordMatches.push(...skills);
      }
    }

    // 3. Subcategory-specific boosters
    if (subcategory) {
      const subLower = subcategory.toLowerCase();
      if (subLower.includes("mobile") || subLower.includes("ios") || subLower.includes("flutter") || subLower.includes("react native")) {
        keywordMatches.unshift("React Native", "Flutter", "Swift", "Kotlin", "iOS", "Android");
      } else if (subLower.includes("llm") || subLower.includes("agent") || subLower.includes("ai")) {
        keywordMatches.unshift("Python", "FastAPI", "OpenAI / LLMs", "pgvector", "LangChain");
      } else if (subLower.includes("figma") || subLower.includes("design") || subLower.includes("wireframing")) {
        keywordMatches.unshift("Figma", "Design Systems", "UI Prototyping", "Tailwind CSS");
      } else if (subLower.includes("e-commerce")) {
        keywordMatches.unshift("Stripe", "Shopify", "Next.js", "PostgreSQL");
      } else if (subLower.includes("smart contracts") || subLower.includes("solidity")) {
        keywordMatches.unshift("Solidity", "Smart Contracts", "Ethers.js", "Hardhat");
      } else if (subLower.includes("kubernetes") || subLower.includes("aws") || subLower.includes("devops")) {
        keywordMatches.unshift("Kubernetes", "Docker", "AWS", "CI/CD Pipelines");
      }
    }

    // Combine: specific keyword matches first, followed by category pool
    const combined = Array.from(new Set([...keywordMatches, ...dynamicPool]));

    if (combined.length > 0) {
      setRecommendedSkillsList(combined.slice(0, 8));
    }
  }, [category, subcategory, title, overview]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsExtractingDoc(true);
    setExtractedFileName(file.name);

    const sizeStr =
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;

    const fileMeta = {
      name: file.name,
      size: sizeStr,
      type: file.type || "application/pdf",
      uploadedAt: new Date().toLocaleDateString(),
    };

    try {
      const reader = new FileReader();
      reader.onload = () => {
        setUploadedDocAttachment({
          ...fileMeta,
          dataUrl: reader.result as string,
        });
      };
      reader.onerror = () => {
        setUploadedDocAttachment(fileMeta);
      };
      reader.readAsDataURL(file);
    } catch {
      setUploadedDocAttachment(fileMeta);
    }
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/client/projects/ai/extract-doc", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        const isGarbled = (s: string) => /[\uFFFD]|^PK|\[Content_Types\]|\.xml/i.test(s);

        if (d.title && !isGarbled(d.title)) {
          setTitle(d.title);
        } else if (file?.name) {
          const cleanName = file.name
            .replace(/\.[^/.]+$/, "")
            .replace(/[-_]+/g, " ")
            .replace(/\s*v\d+(\.\d+)*$/i, "")
            .replace(/\s*(?:Business Requirements Document|PRD|BRD|Product Requirements|Specification)$/i, "")
            .trim();
          setTitle(cleanName || "Technical Engineering Project");
        }

        if (d.category) setCategory(d.category);
        if (d.subcategory) setSubcategory(d.subcategory);

        if (d.overview && !isGarbled(d.overview)) {
          setOverview(d.overview);
        }

        const CANONICAL_GOALS = [
          "Build a new product",
          "Integrate AI/ML",
          "Improve existing system",
          "Fix issues / maintenance",
        ];

        const matchedGoals: string[] = [];
        let detectedOtherGoal = "";

        const mapGoalString = (g: string) => {
          const lower = g.toLowerCase().trim();
          if (CANONICAL_GOALS.some((cg) => cg.toLowerCase() === lower)) {
            return CANONICAL_GOALS.find((cg) => cg.toLowerCase() === lower)!;
          }
          if (/\b(ai|ml|machine learning|nlp|llm|model|intelligence|smart|algorithm|classifier|neural)\b/i.test(lower)) {
            return "Integrate AI/ML";
          }
          if (/\b(improve|upgrade|refactor|optimize|enhance|scale|modernize|revamp)\b/i.test(lower)) {
            return "Improve existing system";
          }
          if (/\b(fix|bug|issue|maintenance|patch|troubleshoot|debug)\b/i.test(lower)) {
            return "Fix issues / maintenance";
          }
          if (/\b(build|new|platform|create|develop|greenfield|mvp|product|app|system)\b/i.test(lower)) {
            return "Build a new product";
          }
          return null;
        };

        if (Array.isArray(d.keyGoals) && d.keyGoals.length > 0) {
          for (const rawGoal of d.keyGoals) {
            const matched = mapGoalString(String(rawGoal));
            if (matched && !matchedGoals.includes(matched)) {
              matchedGoals.push(matched);
            } else if (!detectedOtherGoal && typeof rawGoal === "string" && rawGoal.trim().length > 3 && rawGoal.trim().length < 80) {
              detectedOtherGoal = rawGoal.trim();
            }
          }
        }

        const docContext = `${d.title || ""} ${d.overview || ""} ${d.detailedRequirements || ""}`.toLowerCase();
        if (!matchedGoals.includes("Integrate AI/ML") && /\b(ai|ml|machine learning|nlp|llm|neural|model|deepseek|openai|intelligence)\b/i.test(docContext)) {
          matchedGoals.push("Integrate AI/ML");
        }
        if (!matchedGoals.includes("Improve existing system") && /\b(improve existing|upgrade existing|refactor|modernize legacy|revamp)\b/i.test(docContext)) {
          matchedGoals.push("Improve existing system");
        }
        if (!matchedGoals.includes("Fix issues / maintenance") && /\b(fix issues|maintenance|bug fixes|patching|troubleshoot)\b/i.test(docContext)) {
          matchedGoals.push("Fix issues / maintenance");
        }
        if (!matchedGoals.includes("Build a new product") && (/\b(build|new product|new platform|from scratch|greenfield|mvp|create a platform)\b/i.test(docContext) || matchedGoals.length === 0)) {
          matchedGoals.unshift("Build a new product");
        }

        const finalGoals = Array.from(new Set(matchedGoals)).slice(0, 3);
        if (finalGoals.length > 0) setKeyGoals(finalGoals);
        if (d.customGoal || detectedOtherGoal) {
          setOtherGoal(d.customGoal || detectedOtherGoal);
        }
        if (Array.isArray(d.requiredSkills) && d.requiredSkills.length > 0) {
          setRequiredSkills((prev) => Array.from(new Set([...prev, ...d.requiredSkills])));
          setRecommendedSkillsList((prev) => Array.from(new Set([...d.requiredSkills, ...prev])).slice(0, 8));
        }
        if (d.detailedRequirements) {
          setDetailedRequirements(cleanMarkdownFormatting(d.detailedRequirements));
        }
        if (Array.isArray(d.scopeOfWork) && d.scopeOfWork.length > 0) {
          setScopeOfWork((prev) => Array.from(new Set([...prev, ...d.scopeOfWork])));
        }
        if (d.estimatedBudgetCents && typeof d.estimatedBudgetCents === "number") {
          const dollars = Math.round(d.estimatedBudgetCents / 100);
          setBudgetAmount(String(dollars));
          setBudgetType("FIXED");
        }
        showToast("PRD parsed! Fields auto-filled below. You can freely edit any details manually.");
      } else {
        showToast(json.error?.message || "Could not parse document. You can type manually.");
      }
    } catch {
      showToast("Document upload failed. You can type manually.");
    } finally {
      setIsExtractingDoc(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const cleanMarkdownFormatting = (text: string): string => {
    if (!text) return "";
    return text
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/(^|[^\*])\*([^\*\n]+)\*([^\*]|$)/g, "$1$2$3")
      .replace(/^(\s*)\*\s+/gm, "$1• ")
      .replace(/^(\s*)-\s+/gm, "$1• ")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\*\*/g, "")
      .trim();
  };

  const renderFormattedRequirements = (rawText: string) => {
    if (!rawText || !rawText.trim()) {
      return (
        <div className="py-8 text-center text-slate-400">
          <p className="text-xs">No requirements entered yet.</p>
          <button
            type="button"
            onClick={() => setRequirementsViewMode("write")}
            className="mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700 underline cursor-pointer"
          >
            Switch to edit mode and type specifications
          </button>
        </div>
      );
    }

    const lines = rawText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    return (
      <div className="space-y-2">
        {lines.map((line, idx) => {
          // Clean leading bullet markers
          const cleanLine = line.replace(/^[-*•\d.]\s*/, "").trim();

          // Check for requirement ID pattern like **FR-01**: or FR-01: or [FR-01]
          const tagMatch = cleanLine.match(/^(?:\*\*)?([A-Za-z0-9_-]+)(?:\*\*)?[:\-]\s*(.*)$/);
          let tag = "";
          let body = cleanLine;

          if (tagMatch && tagMatch[1].length <= 14) {
            tag = tagMatch[1].replace(/\*/g, "");
            body = tagMatch[2] || "";
          }

          // Strip leftover markdown stars inside body
          const cleanBody = body
            .replace(/\*\*([^*]+)\*\*/g, "$1")
            .replace(/(^|[^\*])\*([^\*\n]+)\*([^\*]|$)/g, "$1$2$3")
            .replace(/\*\*/g, "");

          return (
            <div
              key={idx}
              className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200/80 bg-slate-50/70 hover:bg-slate-50 transition text-xs text-slate-800 leading-relaxed group"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0 group-hover:scale-125 transition" />
              <div className="flex-1 min-w-0">
                {tag ? (
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10.5px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/90 tracking-wide shrink-0">
                      {tag}
                    </span>
                    <span className="text-slate-800 font-medium">{cleanBody}</span>
                  </div>
                ) : (
                  <span className="text-slate-800 font-normal">{cleanBody}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const handleImproveOverview = async () => {
    setIsAiImprovingOverview(true);
    try {
      const res = await fetch("/api/client/projects/ai/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "IMPROVE_OVERVIEW",
          title,
          overview,
          category,
        }),
      });
      const json = await res.json();
      if (json.success && json.data?.improvedOverview) {
        setOverview(cleanMarkdownFormatting(json.data.improvedOverview));
        showToast("Overview enriched with technical architecture benchmarks!");
      } else {
        showToast("Could not enhance overview. Manual editing preserved.");
      }
    } catch {
      showToast("AI Assistant offline. You can edit overview manually.");
    } finally {
      setIsAiImprovingOverview(false);
    }
  };

  const handleSuggestSkills = async () => {
    setIsAiSuggestingSkills(true);
    try {
      const res = await fetch("/api/client/projects/ai/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SUGGEST_SKILLS",
          title,
          overview,
          category,
          existingSkills: requiredSkills,
        }),
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data?.suggestedSkills) && json.data.suggestedSkills.length > 0) {
        setRecommendedSkillsList(json.data.suggestedSkills);
        for (const s of json.data.suggestedSkills.slice(0, 2)) {
          addSkill(s);
        }
        showToast("AI recommended skills loaded and added to scope!");
      } else {
        showToast("Suggestion offline. Pick from default skills below.");
      }
    } catch {
      showToast("AI Assistant offline. Pick from default skills below.");
    } finally {
      setIsAiSuggestingSkills(false);
    }
  };

  const handleRefineRequirements = async () => {
    setIsAiRefiningRequirements(true);
    try {
      const res = await fetch("/api/client/projects/ai/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REFINE_REQUIREMENTS",
          title,
          overview,
          category,
          existingRequirements: detailedRequirements,
        }),
      });
      const json = await res.json();
      if (json.success && json.data?.refinedRequirements) {
        setDetailedRequirements(cleanMarkdownFormatting(json.data.refinedRequirements));
        if (Array.isArray(json.data.suggestedScope) && json.data.suggestedScope.length > 0) {
          setScopeOfWork((prev) => Array.from(new Set([...prev, ...json.data.suggestedScope])));
        }
        showToast("Requirements refined with technical specifications & scope!");
      } else {
        showToast("Could not refine requirements. Manual editing preserved.");
      }
    } catch {
      showToast("AI Assistant offline. You can edit requirements manually.");
    } finally {
      setIsAiRefiningRequirements(false);
    }
  };

  // Optional Template Loader (When client clicks a starter template from empty workspace)
  useEffect(() => {
    if (draftIdParam) return; // Prioritize resuming draft if provided

    if (templateParam === "web") {
      setTitle("Full-Stack Web App Architecture");
      setCategory("Web Development");
      setSubcategory("Full Stack Development");
      setOverview("Develop responsive Next.js application with Node.js APIs, PostgreSQL schema, and verified milestone deliverables.");
      setKeyGoals(["Build a new product"]);
      setRequiredSkills(["React", "Next.js", "Node.js", "TypeScript", "PostgreSQL"]);
      setDetailedRequirements("• Develop responsive web application using Next.js\n• Build backend APIs with automated test assert logs\n• Adhere to Dual SHA-256 state consensus");
      setScopeOfWork(["Frontend development", "Backend development", "Database design", "Testing and deployment"]);
      setBudgetAmount("3500");
      setMilestones([
        { title: "Project Architecture & DB Schema", amount: "1000", days: "14" },
        { title: "Core APIs & Dashboard", amount: "1500", days: "21" },
        { title: "Final QA & Production Deployment", amount: "1000", days: "14" },
      ]);
    } else if (templateParam === "ai") {
      setTitle("AI Provider Gateway with Semantic Caching");
      setCategory("AI / Machine Learning");
      setSubcategory("LLM & Agent Workflows");
      setOverview("Unified streaming API across LLM providers with semantic pgvector caching, row-level isolation & rate limiters.");
      setKeyGoals(["Integrate AI/ML"]);
      setRequiredSkills(["Python", "FastAPI", "pgvector", "Redis"]);
      setDetailedRequirements("• Unified streaming API across providers\n• Semantic pgvector caching\n• Circuit breaker & rate limiters");
      setScopeOfWork(["API Gateway", "Vector Cache", "Rate Limiter"]);
      setBudgetAmount("4500");
      setMilestones([
        { title: "Gateway Router & Provider Abstraction", amount: "1500", days: "14" },
        { title: "pgvector Semantic Cache Engine", amount: "1500", days: "20" },
        { title: "Benchmarking & Cloud Deployment", amount: "1500", days: "15" },
      ]);
    } else if (templateParam === "design") {
      setTitle("Enterprise Component Design System");
      setCategory("UI/UX Design");
      setSubcategory("Design Systems");
      setOverview("Accessible Figma component library with Tailwind CSS & Radix UI code mappings for cross-platform consistency.");
      setKeyGoals(["Build a new product"]);
      setRequiredSkills(["Figma", "Tailwind CSS", "Radix UI", "React"]);
      setDetailedRequirements("• Figma token synchronization\n• WCAG 2.1 AA accessibility compliance\n• Storybook component documentation");
      setScopeOfWork(["Design tokens", "Component library", "Documentation"]);
      setBudgetAmount("2500");
      setMilestones([
        { title: "Design Tokens & Foundation", amount: "1000", days: "14" },
        { title: "Core Accessible Components", amount: "1500", days: "20" },
      ]);
    }
  }, [templateParam, draftIdParam]);

  // Resume draft on mount if draftId exists
  useEffect(() => {
    if (!draftIdParam) return;

    let isMounted = true;
    async function loadDraft() {
      try {
        const draft = await fetchProjectById(draftIdParam!);
        if (draft && isMounted) {
          setActiveDraftId(draft.id);
          setTitle(draft.title || draft.name || "");
          if (draft.category) setCategory(draft.category);
          if (draft.subcategory) setSubcategory(draft.subcategory);
          if (draft.description) setOverview(draft.description);
          if (draft.goals) {
            setKeyGoals(draft.goals.split(",").map((g: string) => g.trim()).filter(Boolean));
          }
          const loadedSkills = draft.requiredSkills?.length ? draft.requiredSkills : draft.skills;
          if (loadedSkills && loadedSkills.length > 0) {
            setRequiredSkills(loadedSkills);
          }
          if (draft.detailedRequirements) setDetailedRequirements(draft.detailedRequirements);
          if (draft.scopeOfWork && draft.scopeOfWork.length > 0) setScopeOfWork(draft.scopeOfWork);
          if (draft.budgetType) setBudgetType(draft.budgetType);
          if (draft.budgetCents) {
            setBudgetAmount(String(Math.round(draft.budgetCents / 100)));
          } else if (draft.budgetAmount) {
            setBudgetAmount(String(draft.budgetAmount));
          } else if (draft.totalBudget) {
            const parsedNum = String(draft.totalBudget).replace(/[^0-9.]/g, "");
            if (parsedNum) setBudgetAmount(parsedNum);
          }
          if (draft.timelineDuration) setTimelineDuration(draft.timelineDuration);
          if (draft.milestones && draft.milestones.length > 0) {
            setMilestones(
              draft.milestones.map((m: any) => ({
                title: m.title || "Milestone",
                amount: String(m.amountCents ? m.amountCents / 100 : m.amount || "1000"),
                days: String(m.days || "14"),
              }))
            );
          }
          if (draft.experienceLevel) setExperienceLevel(draft.experienceLevel);
          if (draft.englishLevel) setEnglishLevel(draft.englishLevel);
          if (draft.visibility) setVisibility(draft.visibility);
          setLoadedDraftNotice(`Resumed draft: "${draft.title || draft.name}"`);
        }
      } catch {
        // Fallback to default
      }
    }

    loadDraft();
    return () => {
      isMounted = false;
    };
  }, [draftIdParam]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const addSkill = (skill: string) => {
    if (!requiredSkills.includes(skill)) {
      setRequiredSkills([...requiredSkills, skill]);
    }
  };

  const removeSkill = (skill: string) => {
    setRequiredSkills(requiredSkills.filter((s) => s !== skill));
  };

  const validateStep = (stepNumber: number): { valid: boolean; message?: string } => {
    switch (stepNumber) {
      case 1:
        if (!title.trim() || title.trim().length < 5) {
          return { valid: false, message: "Please provide a project title (minimum 5 characters)." };
        }
        if (!category.trim()) {
          return { valid: false, message: "Please select a project category." };
        }
        if (!overview.trim() || overview.trim().length < 10) {
          return { valid: false, message: "Please provide a project overview (minimum 10 characters)." };
        }
        return { valid: true };
      case 2:
        if (requiredSkills.length === 0) {
          return { valid: false, message: "Please select or type at least one required skill." };
        }
        if (!detailedRequirements.trim() || detailedRequirements.trim().length < 10) {
          return { valid: false, message: "Please specify detailed requirements (minimum 10 characters)." };
        }
        if (scopeOfWork.length === 0) {
          return { valid: false, message: "Please select or add at least one scope of work item." };
        }
        return { valid: true };
      case 3:
        if (!budgetType) {
          return { valid: false, message: "Please select a budget type (Fixed Price or Hourly Rate)." };
        }
        if (!budgetAmount.trim() || isNaN(Number(budgetAmount)) || Number(budgetAmount) <= 0) {
          return { valid: false, message: "Please enter an estimated budget amount (e.g. 3500)." };
        }
        if (!timelineDuration.trim()) {
          return { valid: false, message: "Please enter or select expected project timeline." };
        }
        return { valid: true };
      case 4:
        if (!experienceLevel) {
          return { valid: false, message: "Please select required experience level." };
        }
        if (!englishLevel) {
          return { valid: false, message: "Please select English language proficiency." };
        }
        if (!proposalsLimit) {
          return { valid: false, message: "Please select expected proposals limit." };
        }
        if (!visibility) {
          return { valid: false, message: "Please select project visibility." };
        }
        return { valid: true };
      default:
        return { valid: true };
    }
  };

  const isStepValid = (stepNumber: number): boolean => {
    return validateStep(stepNumber).valid;
  };

  const handleNextStep = () => {
    const check = validateStep(currentStep);
    if (!check.valid) {
      showToast(check.message || "Please complete required fields before proceeding.");
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, 5));
  };

  const handleGoToStep = (targetStep: number) => {
    if (targetStep < currentStep) {
      setCurrentStep(targetStep);
      return;
    }
    for (let s = 1; s < targetStep; s++) {
      const check = validateStep(s);
      if (!check.valid) {
        showToast(check.message || `Please complete Step ${s} first.`);
        setCurrentStep(s);
        return;
      }
    }
    setCurrentStep(targetStep);
  };

  const handleAddCustomSkills = (input: string) => {
    if (!input.trim()) return;
    const items = input
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const updated = [...requiredSkills];
    items.forEach((item) => {
      if (!updated.some((s) => s.toLowerCase() === item.toLowerCase())) {
        updated.push(item);
      }
    });
    setRequiredSkills(updated);
    setCustomSkillInput("");
  };

  const handleAddCustomScope = () => {
    const trimmed = customScopeInput.trim();
    if (!trimmed) return;
    if (!DEFAULT_SCOPE_OPTIONS.includes(trimmed) && !customScopeItems.includes(trimmed)) {
      setCustomScopeItems((prev) => [...prev, trimmed]);
    }
    if (!scopeOfWork.includes(trimmed)) {
      setScopeOfWork((prev) => [...prev, trimmed]);
    }
    setCustomScopeInput("");
  };

  const handleRemoveCustomScope = (item: string) => {
    setCustomScopeItems((prev) => prev.filter((i) => i !== item));
    setScopeOfWork((prev) => prev.filter((i) => i !== item));
  };

  const handlePublish = async () => {
    for (let s = 1; s <= 4; s++) {
      const check = validateStep(s);
      if (!check.valid) {
        showToast(check.message || `Please complete Step ${s} before publishing.`);
        setCurrentStep(s);
        return;
      }
    }

    setIsPublishing(true);
    showToast("Generating Dual SHA-256 agreement spec and publishing scope...");

    try {
      const budgetNum = parseFloat(budgetAmount) || 0;
      const formattedMilestones = milestones
        .filter((m) => m.title.trim().length > 0)
        .map((m) => ({
          title: m.title,
          amountCents: Math.round((parseFloat(m.amount) || 0) * 100),
          days: m.days,
        }));

      const res = await saveProject({
        id: activeDraftId || undefined,
        clientId: user?.id,
        title: title.trim(),
        description: overview || "Project requirements and deliverables spec",
        state: "MATCHING",
        budgetCents: Math.round(budgetNum * 100),
        currency: "USD",
        category,
        subcategory,
        goals: keyGoals.join(", "),
        requiredSkills,
        detailedRequirements,
        scopeOfWork,
        budgetType: budgetType || "FIXED",
        timelineDuration: timelineDuration || "",
        experienceLevel: experienceLevel || undefined,
        englishLevel: englishLevel || undefined,
        visibility: visibility || "PUBLIC",
        milestones: formattedMilestones,
        uploadedDocument: uploadedDocAttachment || (extractedFileName ? {
          name: extractedFileName,
          size: "1.8 MB",
          type: "application/pdf",
          uploadedAt: new Date().toLocaleDateString(),
        } : undefined),
      });

      if (!res.success) {
        showToast(res.error || "Could not publish project. Please check required fields.");
        return;
      }

      showToast("Project published successfully! Redirecting to your workspace...");
      setTimeout(() => {
        router.push("/client/dashboard?tab=projects");
      }, 1000);
    } catch {
      showToast("Could not publish project. Please check network connection.");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    showToast("Saving project draft to workspace...");

    try {
      const budgetNum = parseFloat(budgetAmount) || 0;
      const formattedMilestones = milestones.map((m) => ({
        title: m.title,
        amountCents: Math.round((parseFloat(m.amount) || 0) * 100),
        days: m.days,
      }));

      const res = await saveProject({
        id: activeDraftId || undefined,
        clientId: user?.id,
        title: title || "Untitled Draft Specification",
        description: overview || "",
        state: "DRAFT",
        budgetCents: Math.round(budgetNum * 100),
        currency: "USD",
        category,
        subcategory,
        goals: keyGoals.join(", "),
        requiredSkills,
        detailedRequirements,
        scopeOfWork,
        budgetType: budgetType || "FIXED",
        timelineDuration: timelineDuration || "",
        experienceLevel: experienceLevel || undefined,
        englishLevel: englishLevel || undefined,
        visibility: visibility || "PUBLIC",
        milestones: formattedMilestones,
        uploadedDocument: uploadedDocAttachment || (extractedFileName ? {
          name: extractedFileName,
          size: "1.8 MB",
          type: "application/pdf",
          uploadedAt: new Date().toLocaleDateString(),
        } : undefined),
      });

      if (!res.success) {
        showToast(res.error || "Could not save draft. Please try again.");
        return;
      }

      if (res.data?.id) {
        setActiveDraftId(res.data.id);
      }

      showToast("Draft saved successfully! Opening Drafts tab...");
      setTimeout(() => {
        router.push("/client/dashboard?tab=projects&filter=DRAFT");
      }, 800);
    } catch {
      showToast("Could not save draft. Please try again.");
    } finally {
      setIsSavingDraft(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex font-sans selection:bg-[#4f46e5] selection:text-white">
      {/* 1. Left Navbar Sidebar */}
      <DashboardSidebar
        currentRole="CLIENT"
        activeTab="projects"
        onTabChange={(tab) => router.push(`/client/dashboard?tab=${tab}`)}
      />

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardTopHeader />

        <main className="flex-1 px-4 sm:px-8 py-6 max-w-7xl w-full mx-auto space-y-6">
          
          {/* Top Breadcrumb & Header Action Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <Link
                href="/client/dashboard?tab=projects"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#4f46e5] transition group mb-1"
              >
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                <span>Back to Projects</span>
              </Link>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 font-heading">
                  {activeDraftId ? "Resume & Finalize Project" : "Post a New Project"}
                </h1>
                {activeDraftId && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    Draft Active
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-500">
                {activeDraftId
                  ? "Continue editing your saved project specification, adjust milestones, or publish to match talent."
                  : "Describe your project, set your preferences, and get matched with verified talent."}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSavingDraft}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>{isSavingDraft ? "Saving..." : "Save as Draft"}</span>
              </button>

              {currentStep < 5 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-5 py-2 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-bold shadow-xs hover:shadow-indigo-500/25 transition cursor-pointer flex items-center gap-1.5 active:scale-98"
                >
                  <span>Next Step</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={isPublishing}
                  className="px-5 py-2 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-bold shadow-xs hover:shadow-indigo-500/25 transition cursor-pointer flex items-center gap-2 active:scale-98 disabled:opacity-50"
                >
                  <span>{isPublishing ? "Publishing..." : "Publish Project"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Draft Resume Notice Banner */}
          {loadedDraftNotice && (
            <div className="p-3 px-4 rounded-xl bg-amber-50 border border-amber-200/90 text-amber-900 flex items-center justify-between gap-3 text-xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Draft Loaded:</strong> All previously saved project requirements, milestones, and budget have been restored.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setLoadedDraftNotice(null)}
                className="text-amber-600 hover:text-amber-800 text-[11px] font-bold underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* ==============================================================
              INTERACTIVE 5-STEP STEPPER BAR
             ============================================================== */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              {[
                { step: 1, title: "Project Details", sub: "Basic information" },
                { step: 2, title: "Requirements", sub: "Skills and scope" },
                { step: 3, title: "Budget & Timeline", sub: "Budget and milestones" },
                { step: 4, title: "Preferences", sub: "Hiring preferences" },
                { step: 5, title: "Review & Publish", sub: "Final review" },
              ].map((s) => {
                const isActive = currentStep === s.step;
                const isCompleted = isStepValid(s.step);
                return (
                  <button
                    key={s.step}
                    type="button"
                    onClick={() => handleGoToStep(s.step)}
                    className="flex items-center gap-3 text-left group cursor-pointer"
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-all ${
                        isCompleted
                          ? "bg-emerald-500 text-white ring-2 ring-emerald-500/20"
                          : isActive
                          ? "bg-[#4f46e5] text-white ring-4 ring-[#4f46e5]/15"
                          : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                      }`}
                    >
                      {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : s.step}
                    </div>
                    <div className="min-w-0">
                      <p
                        className={`text-xs font-bold truncate ${
                          isActive ? "text-[#4f46e5]" : "text-slate-800"
                        }`}
                      >
                        {s.title}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">{s.sub}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ==============================================================
              2-COLUMN WIZARD LAYOUT:
              LEFT (8 COLS): Current Active Step Form
              RIGHT (4 COLS): Contextual AI & Live Step Insights
             ============================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* ============================================================
                LEFT COLUMN: 8 COLS (DYNAMIC WIZARD STEP VIEW)
               ============================================================ */}
            <div className="lg:col-span-8 space-y-6">

              {/* ----------------------------------------------------------
                  STEP 1: PROJECT DETAILS
                 ---------------------------------------------------------- */}
              {currentStep === 1 && (
                <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-5 animate-in fade-in duration-150">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                    <div className="w-7 h-7 rounded-full bg-[#4f46e5] text-white flex items-center justify-center font-bold text-xs">
                      1
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 leading-tight">
                        Project Details
                      </h2>
                      <p className="text-xs text-slate-500">
                        Give a clear and specific overview of your project.
                      </p>
                    </div>
                  </div>

                  {/* Document Upload / AI Extraction Dropzone Banner */}
                  <div className="p-3.5 sm:p-4 rounded-xl border border-dashed border-[#4f46e5]/40 bg-gradient-to-r from-[#f8f9ff] via-[#f1f4ff] to-[#eef2ff] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-[#4f46e5] text-white flex items-center justify-center shrink-0 shadow-xs">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900">Upload Project Brief / PRD</h4>
                          <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#4f46e5] bg-white border border-[#4f46e5]/20 px-1.5 py-0.5 rounded shadow-2xs">
                            Nexum AI
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 truncate mt-0.5">
                          {isExtractingDoc
                            ? "Extracting parameters & scope from document with Nexum AI..."
                            : extractedFileName
                            ? `Parsed: ${extractedFileName} (fields populated below)`
                            : "Upload PDF, Word, Markdown, or text file to auto-populate fields (100% editable)"}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-2 self-end sm:self-auto">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".pdf,.docx,.doc,.txt,.md,.json"
                        className="hidden"
                      />
                      <button
                        type="button"
                        disabled={isExtractingDoc}
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-bold shadow-2xs transition cursor-pointer disabled:opacity-50"
                      >
                        {isExtractingDoc ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Extracting...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload Document</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Project Title */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700">Project Title *</label>
                      <span className="text-[10.5px] font-mono text-slate-400">{title.length}/100</span>
                    </div>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={100}
                      placeholder="e.g. AI-Powered Educational Analytics Dashboard"
                      required
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/15 focus:border-[#4f46e5] transition"
                    />
                  </div>

                  {/* Category & Subcategory Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Project Category *
                      </label>
                      <select
                        value={category}
                        onChange={(e) => {
                          const newCat = e.target.value;
                          setCategory(newCat);
                          if (newCat && PROJECT_CATEGORIES[newCat]?.length) {
                            setSubcategory(PROJECT_CATEGORIES[newCat][0]);
                          } else {
                            setSubcategory("");
                          }
                        }}
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:outline-none focus:border-[#4f46e5] cursor-pointer"
                      >
                        <option value="">Select project category...</option>
                        {Object.keys(PROJECT_CATEGORIES).map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Subcategory *
                      </label>
                      <select
                        value={subcategory}
                        onChange={(e) => setSubcategory(e.target.value)}
                        disabled={!category}
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:outline-none focus:border-[#4f46e5] cursor-pointer disabled:opacity-50"
                      >
                        <option value="">{category ? "Select subcategory..." : "Select a category first"}</option>
                        {(PROJECT_CATEGORIES[category] || []).map((sub) => (
                          <option key={sub} value={sub}>
                            {sub}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Project Overview */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700">Project Overview *</label>
                      <span className="text-[10.5px] font-mono text-slate-400">{overview.length}/2000</span>
                    </div>
                    <textarea
                      rows={5}
                      value={overview}
                      onChange={(e) => setOverview(e.target.value)}
                      maxLength={2000}
                      placeholder="Describe the problem you are solving, core user workflows, and target outcomes..."
                      required
                      className="w-full p-3.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/15 focus:border-[#4f46e5] transition leading-relaxed"
                    />
                  </div>

                  {/* Key Goals */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">
                      Key Goals <span className="text-slate-400 font-normal">(Select up to 3)</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {[
                        "Build a new product",
                        "Integrate AI/ML",
                        "Improve existing system",
                        "Fix issues / maintenance",
                      ].map((goal) => {
                        const isSelected = keyGoals.includes(goal);
                        return (
                          <button
                            key={goal}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setKeyGoals(keyGoals.filter((g) => g !== goal));
                              } else if (keyGoals.length < 3) {
                                setKeyGoals([...keyGoals, goal]);
                              }
                            }}
                            className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2.5 text-left transition cursor-pointer ${
                              isSelected
                                ? "bg-[#eef2ff] border-[#4f46e5] text-[#4f46e5] shadow-xs"
                                : "bg-slate-50/70 border-slate-200 hover:bg-slate-100 text-slate-700"
                            }`}
                          >
                            <div
                              className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                                isSelected ? "bg-[#4f46e5] border-[#4f46e5] text-white" : "border-slate-300"
                              }`}
                            >
                              {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </div>
                            <span className="truncate">{goal}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-2.5 flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-semibold shrink-0">Other:</span>
                      <input
                        type="text"
                        value={otherGoal}
                        onChange={(e) => setOtherGoal(e.target.value)}
                        placeholder="Specify custom goal..."
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-[#4f46e5]"
                      />
                    </div>
                  </div>

                  {/* Step 1 Footer Action Navigation */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                    >
                      Save draft & exit
                    </button>
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-98"
                    >
                      <span>Next: Requirements & Scope</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* ----------------------------------------------------------
                  STEP 2: REQUIREMENTS & SCOPE
                 ---------------------------------------------------------- */}
              {currentStep === 2 && (
                <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-5 animate-in fade-in duration-150">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                    <div className="w-7 h-7 rounded-full bg-[#4f46e5] text-white flex items-center justify-center font-bold text-xs">
                      2
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 leading-tight">
                        Requirements & Scope
                      </h2>
                      <p className="text-xs text-slate-500">
                        Specify what you need and the exact skills required.
                      </p>
                    </div>
                  </div>

                  {/* Document Upload / AI Extraction Dropzone Banner */}
                  <div className="p-3.5 sm:p-4 rounded-xl border border-dashed border-[#4f46e5]/40 bg-gradient-to-r from-[#f8f9ff] via-[#f1f4ff] to-[#eef2ff] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-[#4f46e5] text-white flex items-center justify-center shrink-0 shadow-xs">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900">Upload Project Brief / PRD</h4>
                          <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#4f46e5] bg-white border border-[#4f46e5]/20 px-1.5 py-0.5 rounded shadow-2xs">
                            Nexum AI
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 truncate mt-0.5">
                          {isExtractingDoc
                            ? "Extracting skills, scope & detailed specs with Nexum AI..."
                            : extractedFileName
                            ? `Parsed: ${extractedFileName} (fields populated below)`
                            : "Upload PDF, Word, Markdown, or text file to extract scope & skills automatically"}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        disabled={isExtractingDoc}
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-bold shadow-2xs transition cursor-pointer disabled:opacity-50"
                      >
                        {isExtractingDoc ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Extracting...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload Document</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Required Skills Tag List */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-slate-700">
                        Required Skills * {requiredSkills.length > 0 && <span className="text-slate-400 font-normal">({requiredSkills.length} selected)</span>}
                      </label>
                      {requiredSkills.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setRequiredSkills([])}
                          className="text-[11px] text-slate-400 hover:text-rose-600 transition cursor-pointer"
                        >
                          Clear all
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5 p-3 rounded-xl border border-slate-200 bg-slate-50/50 min-h-[52px] items-center">
                      {requiredSkills.length === 0 ? (
                        <span className="text-xs text-slate-400 italic">No skills selected yet. Choose from suggested below or type custom skills.</span>
                      ) : (
                        requiredSkills.map((skill) => (
                          <span
                            key={skill}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#eef2ff] border border-[#4f46e5]/20 text-[#4f46e5] text-xs font-semibold"
                          >
                            <span>{skill}</span>
                            <button
                              type="button"
                              onClick={() => removeSkill(skill)}
                              className="hover:text-rose-600 font-bold ml-0.5 cursor-pointer text-sm leading-none"
                            >
                              ×
                            </button>
                          </span>
                        ))
                      )}
                    </div>

                    {/* Custom Skill Input (supports single or comma-separated items + Enter key) */}
                    <div className="flex items-center gap-2 mt-2.5">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={customSkillInput}
                          onChange={(e) => setCustomSkillInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === ",") {
                              e.preventDefault();
                              handleAddCustomSkills(customSkillInput);
                            }
                          }}
                          placeholder="Type custom skill(s) (press Enter or comma for multiple: e.g. WebSockets, Redis, GraphQL)..."
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/10"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddCustomSkills(customSkillInput)}
                        disabled={!customSkillInput.trim()}
                        className="px-3.5 py-2 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-bold transition disabled:opacity-40 cursor-pointer shrink-0 shadow-xs"
                      >
                        + Add Skill
                      </button>
                    </div>

                    {/* Suggested Skills */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                      <span className="text-[11px] font-bold text-slate-500 mr-1">Suggested:</span>
                      {recommendedSkillsList.filter((s) => !requiredSkills.includes(s)).map((skill) => (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => addSkill(skill)}
                          className="text-[10.5px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-[#eef2ff] hover:text-[#4f46e5] text-slate-700 transition cursor-pointer font-medium"
                        >
                          + {skill}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const toAdd = recommendedSkillsList.filter((s) => !requiredSkills.includes(s));
                          setRequiredSkills((prev) => Array.from(new Set([...prev, ...toAdd])));
                        }}
                        className="text-[10.5px] font-bold text-[#4f46e5] hover:underline ml-1 cursor-pointer"
                      >
                        + Add All
                      </button>
                    </div>
                  </div>

                  {/* Detailed Requirements & Scope of Work Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                    <div className="md:col-span-8 space-y-1.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <label className="text-xs font-bold text-slate-700">Detailed Requirements *</label>
                        <div className="flex items-center gap-1.5">
                          {detailedRequirements.includes("**") && (
                            <button
                              type="button"
                              onClick={() => setDetailedRequirements(cleanMarkdownFormatting(detailedRequirements))}
                              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 px-2 py-0.5 rounded-md transition flex items-center gap-1 cursor-pointer"
                              title="Strip markdown asterisks into clean bullets"
                            >
                              <Sparkles className="w-3 h-3 text-indigo-500" />
                              Clean Formatting
                            </button>
                          )}
                          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-medium">
                            <button
                              type="button"
                              onClick={() => setRequirementsViewMode("write")}
                              className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium transition cursor-pointer flex items-center gap-1 ${
                                requirementsViewMode === "write"
                                  ? "bg-white text-slate-900 shadow-xs font-bold"
                                  : "text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              <Edit3 className="w-3 h-3 text-slate-500" />
                              Edit Text
                            </button>
                            <button
                              type="button"
                              onClick={() => setRequirementsViewMode("preview")}
                              className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium transition cursor-pointer flex items-center gap-1 ${
                                requirementsViewMode === "preview"
                                  ? "bg-white text-indigo-700 shadow-xs font-bold"
                                  : "text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              <Eye className="w-3 h-3 text-indigo-600" />
                              Formatted View
                            </button>
                          </div>
                        </div>
                      </div>

                      {requirementsViewMode === "write" ? (
                        <div className="space-y-1">
                          <textarea
                            rows={7}
                            value={detailedRequirements}
                            onChange={(e) => setDetailedRequirements(e.target.value)}
                            placeholder="• FR-01: Authenticate users and enforce role-based access..."
                            className="w-full p-3 font-sans text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/15 focus:border-[#4f46e5] transition leading-relaxed placeholder:text-slate-400"
                          />
                          <div className="text-[11px] text-slate-500 flex items-center justify-between">
                            <span>Use bullet points with &apos;•&apos; or requirement IDs like &apos;FR-01:&apos;</span>
                            <button
                              type="button"
                              onClick={() => setRequirementsViewMode("preview")}
                              className="text-indigo-600 font-semibold hover:underline cursor-pointer"
                            >
                              Preview formatted list →
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div
                            onDoubleClick={() => setRequirementsViewMode("write")}
                            className="min-h-[175px] max-h-[280px] overflow-y-auto p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs"
                            title="Double-click to edit"
                          >
                            {renderFormattedRequirements(detailedRequirements)}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center justify-between">
                            <span>Formatted view displays requirement tags and styled bullets.</span>
                            <button
                              type="button"
                              onClick={() => setRequirementsViewMode("write")}
                              className="text-indigo-600 font-semibold hover:underline cursor-pointer flex items-center gap-1"
                            >
                              <Edit3 className="w-3 h-3" />
                              Click to edit
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Scope of Work Checkboxes & Custom Scope */}
                    <div className="md:col-span-4 space-y-2">
                      <label className="text-xs font-bold text-slate-700">Scope of Work *</label>
                      <div className="space-y-1.5 p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                        {[...DEFAULT_SCOPE_OPTIONS, ...customScopeItems].map((item) => {
                          const isChecked = scopeOfWork.includes(item);
                          const isCustom = customScopeItems.includes(item);
                          return (
                            <div
                              key={item}
                              className="flex items-center justify-between gap-1 group py-0.5"
                            >
                              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer min-w-0 flex-1">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() =>
                                    setScopeOfWork((prev) =>
                                      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
                                    )
                                  }
                                  className="w-3.5 h-3.5 rounded border-slate-300 accent-[#4f46e5]"
                                />
                                <span className="truncate">{item}</span>
                              </label>
                              {isCustom && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCustomScope(item)}
                                  className="text-slate-400 hover:text-rose-600 text-xs px-1 cursor-pointer font-bold"
                                  title="Remove custom scope item"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          );
                        })}

                        {/* Add Custom Scope Item Input */}
                        <div className="pt-2.5 mt-2 border-t border-slate-200 flex items-center gap-1.5">
                          <input
                            type="text"
                            value={customScopeInput}
                            onChange={(e) => setCustomScopeInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddCustomScope();
                              }
                            }}
                            placeholder="+ Add custom scope..."
                            className="w-full px-2 py-1 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#4f46e5]"
                          />
                          <button
                            type="button"
                            onClick={handleAddCustomScope}
                            disabled={!customScopeInput.trim()}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-[11px] font-bold disabled:opacity-40 cursor-pointer shrink-0"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 2 Footer Navigation */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Project Details</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-98"
                    >
                      <span>Next: Budget & Timeline</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* ----------------------------------------------------------
                  STEP 3: BUDGET & TIMELINE
                 ---------------------------------------------------------- */}
              {currentStep === 3 && (
                <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-5 animate-in fade-in duration-150">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                    <div className="w-7 h-7 rounded-full bg-[#4f46e5] text-white flex items-center justify-center font-bold text-xs">
                      3
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 leading-tight">
                        Budget & Milestones Breakdown
                      </h2>
                      <p className="text-xs text-slate-500">
                        Set funding milestones to protect deliverable verification with PayPal escrow.
                      </p>
                    </div>
                  </div>

                  {/* Budget Type Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">Budget Type *</label>
                    <div className="grid grid-cols-2 gap-3 max-w-md">
                      <button
                        type="button"
                        onClick={() => setBudgetType("FIXED")}
                        className={`p-3 rounded-xl border text-xs font-bold text-left transition cursor-pointer flex items-center gap-2 ${
                          budgetType === "FIXED"
                            ? "bg-[#eef2ff] border-[#4f46e5] text-[#4f46e5] ring-2 ring-[#4f46e5]/10"
                            : "bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <div
                          className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                            budgetType === "FIXED" ? "border-[#4f46e5] bg-[#4f46e5]" : "border-slate-300"
                          }`}
                        >
                          {budgetType === "FIXED" && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <div>
                          <div>Fixed Price</div>
                          <div className="text-[10px] text-slate-500 font-normal">Milestone-based release</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setBudgetType("HOURLY")}
                        className={`p-3 rounded-xl border text-xs font-bold text-left transition cursor-pointer flex items-center gap-2 ${
                          budgetType === "HOURLY"
                            ? "bg-[#eef2ff] border-[#4f46e5] text-[#4f46e5] ring-2 ring-[#4f46e5]/10"
                            : "bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <div
                          className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                            budgetType === "HOURLY" ? "border-[#4f46e5] bg-[#4f46e5]" : "border-slate-300"
                          }`}
                        >
                          {budgetType === "HOURLY" && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <div>
                          <div>Hourly Rate</div>
                          <div className="text-[10px] text-slate-500 font-normal">Tracked sprint intervals</div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Total Budget & Timeline Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Estimated Budget (USD) *
                      </label>
                      <div className="relative flex items-center">
                        <DollarSign className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                        <input
                          type="number"
                          value={budgetAmount}
                          onChange={(e) => setBudgetAmount(e.target.value)}
                          placeholder="e.g. 3500"
                          className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 bg-slate-50/50 text-xs sm:text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-[#4f46e5]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Expected Timeline *
                      </label>
                      <div className="relative flex items-center">
                        <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                        <input
                          type="text"
                          value={timelineDuration}
                          onChange={(e) => setTimelineDuration(e.target.value)}
                          placeholder="e.g. 1 - 2 months, 4 weeks"
                          className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 bg-slate-50/50 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-[#4f46e5]"
                        />
                      </div>
                      {/* Quick Choice Timeline Pills */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className="text-[10.5px] text-slate-400">Quick select:</span>
                        {["< 1 month", "1 - 2 months", "3 - 6 months", "6+ months"].map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setTimelineDuration(t)}
                            className={`text-[10.5px] px-2 py-0.5 rounded-md border transition cursor-pointer ${
                              timelineDuration === t
                                ? "bg-[#eef2ff] border-[#4f46e5] text-[#4f46e5] font-bold"
                                : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Gemini AI Auto-Adjustment Callout Banner */}
                  {aiAdjustmentMessage && (
                    <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-50/90 via-purple-50/80 to-blue-50/90 border border-indigo-200/80 text-xs text-indigo-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-in fade-in duration-200 shadow-2xs">
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <Sparkles className="w-4 h-4 text-[#4f46e5] shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-[#4f46e5] mr-1.5">✨ Gemini AI Auto-Adjustment:</span>
                          <span className="text-slate-700 leading-relaxed">{aiAdjustmentMessage}</span>
                        </div>
                      </div>
                      {previousScheduleSnapshot && (
                        <button
                          type="button"
                          onClick={handleUndoAiAdjustment}
                          className="px-2.5 py-1 rounded-lg bg-white border border-indigo-200 hover:border-indigo-400 text-[11px] font-bold text-indigo-700 shadow-2xs transition shrink-0 cursor-pointer"
                        >
                          Undo AI Adjustment
                        </button>
                      )}
                    </div>
                  )}

                  {/* Budget & Timeline Health Synchronization Widget */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3.5 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
                    {/* Column 1: Budget Balance Counter */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700 flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Budget Allocation</span>
                        </span>
                        <span className="font-mono text-[11px] text-slate-500">
                          Allocated: <strong className="text-slate-900">${allocatedBudget}</strong> / ${totalBudget}
                        </span>
                      </div>

                      {/* Budget Health Pill & Actions */}
                      {remainingBudget === 0 ? (
                        <div className="flex items-center gap-1.5 p-2 rounded-lg bg-emerald-50 border border-emerald-200/70 text-emerald-800 text-[11px] font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>✓ 100% Balanced — Milestone sum matches project budget perfectly.</span>
                        </div>
                      ) : remainingBudget > 0 ? (
                        <div className="p-2 rounded-lg bg-amber-50/80 border border-amber-200/80 text-amber-900 text-[11px] space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-amber-800 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                              <span>${remainingBudget} unallocated remaining</span>
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            <button
                              type="button"
                              onClick={() => handleFillRemainingBudget()}
                              className="px-2 py-0.5 rounded bg-white border border-amber-300 hover:border-amber-400 text-amber-900 font-bold text-[10px] shadow-2xs transition cursor-pointer"
                            >
                              Fill into Milestone {milestones.length}
                            </button>
                            <button
                              type="button"
                              onClick={handleAutoBalanceBudget}
                              className="px-2 py-0.5 rounded bg-white border border-amber-300 hover:border-amber-400 text-amber-900 font-bold text-[10px] shadow-2xs transition cursor-pointer"
                            >
                              Auto-balance all milestones
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-2 rounded-lg bg-rose-50 border border-rose-200/80 text-rose-900 text-[11px] space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-rose-800 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                              <span>Over budget by ${Math.abs(remainingBudget)} (${allocatedBudget} vs ${totalBudget})</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 pt-0.5">
                            <button
                              type="button"
                              onClick={handleAutoExpandBudget}
                              className="px-2 py-0.5 rounded bg-white border border-rose-300 hover:border-rose-400 text-rose-900 font-bold text-[10px] shadow-2xs transition cursor-pointer"
                            >
                              Expand project budget to ${allocatedBudget}
                            </button>
                            <button
                              type="button"
                              onClick={handleAutoBalanceBudget}
                              className="px-2 py-0.5 rounded bg-white border border-rose-300 hover:border-rose-400 text-rose-900 font-bold text-[10px] shadow-2xs transition cursor-pointer"
                            >
                              Scale down milestones to ${totalBudget}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Column 2: Timeline Duration & Schedule Synchronization */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#4f46e5]" />
                          <span>Schedule & Duration Sync</span>
                        </span>
                        <span className="font-mono text-[11px] text-slate-500">
                          Total Days: <strong className="text-slate-900">{totalMilestoneDays} days</strong>
                          {targetTimelineDays > 0 && ` (~${targetTimelineDays} target)`}
                        </span>
                      </div>

                      {/* Schedule Health Pill & Actions */}
                      {isTimelineExceeded ? (
                        <div className="p-2 rounded-lg bg-amber-50/80 border border-amber-200/80 text-amber-900 text-[11px] space-y-1.5">
                          <div className="flex items-start gap-1">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                            <span>
                              <strong>Schedule extended:</strong> Milestones total {totalMilestoneDays} days ({overTimelineDays} days beyond original {targetTimelineDays}-day timeline).
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            <button
                              type="button"
                              onClick={handleKeepExtendedTimeline}
                              className="px-2 py-0.5 rounded bg-white border border-amber-300 hover:border-amber-400 text-amber-900 font-bold text-[10px] shadow-2xs transition cursor-pointer"
                            >
                              Auto-extend timeline ({totalMilestoneDays} days)
                            </button>
                            <button
                              type="button"
                              onClick={handleCompressMilestonesToFitTimeline}
                              className="px-2 py-0.5 rounded bg-white border border-amber-300 hover:border-amber-400 text-amber-900 font-bold text-[10px] shadow-2xs transition cursor-pointer"
                            >
                              Compress milestones to fit {targetTimelineDays} days
                            </button>
                          </div>
                        </div>
                      ) : unallocatedDays > 0 ? (
                        <div className="p-2 rounded-lg bg-indigo-50/70 border border-indigo-200/70 text-indigo-950 text-[11px] space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                              <span>{totalMilestoneDays} of {targetTimelineDays} days scheduled ({unallocatedDays} days unallocated)</span>
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={handleAutoDistributeTimelineDays}
                            className="px-2 py-0.5 rounded bg-white border border-indigo-300 hover:border-indigo-400 text-indigo-900 font-bold text-[10px] shadow-2xs transition cursor-pointer"
                          >
                            Auto-distribute {targetTimelineDays} days across milestones
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 p-2 rounded-lg bg-emerald-50 border border-emerald-200/70 text-emerald-800 text-[11px] font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>✓ Timeline Synced — Milestone schedule matches expected project duration.</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Milestone Breakdown Table */}
                  <div className="space-y-2 pt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-slate-800">Milestone Schedule Breakdown</span>
                        <span className="text-[11px] text-slate-400 ml-2 font-mono">
                          ({milestones.length} milestones, ${allocatedBudget} allocated)
                        </span>
                      </div>

                      <div className="flex items-center gap-2">

                        {/* AI Auto-Sync Button */}
                        <button
                          type="button"
                          disabled={isAiBalancingSchedule}
                          onClick={handleAiAutoSyncSchedule}
                          className="text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition disabled:opacity-50"
                          title="Auto-distribute budget and schedule to 100% match project timeline"
                        >
                          {isAiBalancingSchedule ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3 h-3 text-slate-600" />
                          )}
                          <span>Auto-Sync</span>
                        </button>

                        {/* Add Milestone Button */}
                        <button
                          type="button"
                          onClick={() =>
                            setMilestones([
                              ...milestones,
                              {
                                title: `Milestone ${milestones.length + 1}`,
                                amount: remainingBudget > 0 ? String(remainingBudget) : "1000",
                                days: unallocatedDays > 0 ? String(unallocatedDays) : "14",
                              },
                            ])
                          }
                          className="text-xs font-bold text-white bg-[#4f46e5] hover:bg-[#4338ca] px-3 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Milestone</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {milestones.map((ms, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <span className="w-5 h-5 rounded-full bg-slate-200 font-bold text-[10px] text-slate-700 flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <input
                              type="text"
                              value={ms.title}
                              placeholder={`Milestone ${idx + 1} title`}
                              onChange={(e) => {
                                const updated = [...milestones];
                                updated[idx].title = e.target.value;
                                setMilestones(updated);
                              }}
                              className="w-full bg-transparent font-semibold text-slate-900 focus:outline-none focus:border-b border-[#4f46e5]"
                            />
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0">
                            {/* Milestone Amount Input with remaining budget helper */}
                            <div className="flex items-center gap-1">
                              <span className="text-slate-400 font-mono">$</span>
                              <input
                                type="number"
                                value={ms.amount}
                                placeholder="0"
                                onChange={(e) => {
                                  const updated = [...milestones];
                                  updated[idx].amount = e.target.value;
                                  setMilestones(updated);
                                }}
                                className="w-20 px-2 py-1 bg-white border border-slate-200 rounded font-mono font-bold text-slate-900"
                              />
                              {(!ms.amount || parseFloat(ms.amount) === 0) && remainingBudget > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleFillRemainingBudget(idx)}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold hover:bg-emerald-100 transition cursor-pointer"
                                  title={`Fill remaining $${remainingBudget}`}
                                >
                                  +Fill ${remainingBudget}
                                </button>
                              )}
                            </div>

                            {/* Milestone Days Input */}
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={ms.days}
                                onChange={(e) => {
                                  const updated = [...milestones];
                                  updated[idx].days = e.target.value;
                                  setMilestones(updated);
                                }}
                                className="w-14 px-2 py-1 bg-white border border-slate-200 rounded font-mono text-slate-900"
                              />
                              <span className="text-slate-400 text-[11px]">days</span>
                            </div>

                            {milestones.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setMilestones(milestones.filter((_, i) => i !== idx))}
                                className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                                title="Delete milestone"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Step 3 Footer Navigation */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Requirements</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-98"
                    >
                      <span>Next: Hiring Preferences</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* ----------------------------------------------------------
                  STEP 4: HIRING PREFERENCES
                 ---------------------------------------------------------- */}
              {currentStep === 4 && (
                <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-5 animate-in fade-in duration-150">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                    <div className="w-7 h-7 rounded-full bg-[#4f46e5] text-white flex items-center justify-center font-bold text-xs">
                      4
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 leading-tight">
                        Hiring Preferences
                      </h2>
                      <p className="text-xs text-slate-500">
                        Set talent seniority, language fluency, and discovery privacy.
                      </p>
                    </div>
                  </div>

                  {/* Experience Level */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">
                      Experience Level Required *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { id: "ENTRY", label: "Junior / Entry", desc: "1-2 years experience" },
                        { id: "INTERMEDIATE", label: "Intermediate", desc: "3-5 years experience" },
                        { id: "EXPERT", label: "Expert / Senior", desc: "6+ years experience" },
                      ].map((lvl) => (
                        <button
                          key={lvl.id}
                          type="button"
                          onClick={() => setExperienceLevel(lvl.id as "ENTRY" | "INTERMEDIATE" | "EXPERT")}
                          className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                            experienceLevel === lvl.id
                              ? "bg-[#eef2ff] border-[#4f46e5] text-[#4f46e5] shadow-xs ring-2 ring-[#4f46e5]/10"
                              : "bg-slate-50/70 border-slate-200 hover:bg-slate-100 text-slate-700"
                          }`}
                        >
                          <div className="font-bold text-xs">{lvl.label}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{lvl.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* English Fluency */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">
                      English Language Proficiency *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { id: "CONVERSATIONAL", label: "Conversational", desc: "Basic technical chat" },
                        { id: "FLUENT", label: "Fluent (Recommended)", desc: "Clear architectural sync" },
                        { id: "NATIVE", label: "Native / Bilingual", desc: "Flawless written & spoken" },
                      ].map((eng) => (
                        <button
                          key={eng.id}
                          type="button"
                          onClick={() => setEnglishLevel(eng.id as "CONVERSATIONAL" | "FLUENT" | "NATIVE")}
                          className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                            englishLevel === eng.id
                              ? "bg-[#eef2ff] border-[#4f46e5] text-[#4f46e5] shadow-xs ring-2 ring-[#4f46e5]/10"
                              : "bg-slate-50/70 border-slate-200 hover:bg-slate-100 text-slate-700"
                          }`}
                        >
                          <div className="font-bold text-xs">{eng.label}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{eng.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Proposal Cap & Visibility */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Proposals Expected *
                      </label>
                      <select
                        value={proposalsLimit}
                        onChange={(e) => setProposalsLimit(e.target.value as any)}
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:outline-none focus:border-[#4f46e5] cursor-pointer"
                      >
                        <option value="">Select expected proposals...</option>
                        <option value="10_15">10 - 15 Proposals</option>
                        <option value="15_30">15 - 30 Proposals (Recommended)</option>
                        <option value="OPEN">Open (Unlimited)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Project Visibility *
                      </label>
                      <select
                        value={visibility}
                        onChange={(e) => setVisibility(e.target.value as any)}
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:outline-none focus:border-[#4f46e5] cursor-pointer"
                      >
                        <option value="">Select project visibility...</option>
                        <option value="PUBLIC">Public (All verified freelancers)</option>
                        <option value="INVITE_ONLY">Invite Only (Private brief)</option>
                      </select>
                    </div>
                  </div>

                  {/* Step 4 Footer Navigation */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Budget & Timeline</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-98"
                    >
                      <span>Next: Review & Publish</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* ----------------------------------------------------------
                  STEP 5: REVIEW & PUBLISH
                 ---------------------------------------------------------- */}
              {currentStep === 5 && (
                <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-6 animate-in fade-in duration-150">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                    <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs">
                      ✓
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 leading-tight">
                        Review Project & Agreement Seal
                      </h2>
                      <p className="text-xs text-slate-500">
                        Review all details before publishing to verified contractors.
                      </p>
                    </div>
                  </div>

                  {/* Section A: Title & Overview Summary */}
                  <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Project Overview
                      </span>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        className="text-xs font-bold text-[#4f46e5] hover:underline flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    </div>
                    <h3 className="text-sm font-extrabold text-slate-900">{title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                      {overview}
                    </p>
                    <div className="pt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-700">{category}</span>
                      <span>•</span>
                      <span>{subcategory}</span>
                    </div>
                  </div>

                  {/* Section B: Skills & Scope Summary */}
                  <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Skills & Scope
                      </span>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        className="text-xs font-bold text-[#4f46e5] hover:underline flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {requiredSkills.map((sk) => (
                        <span
                          key={sk}
                          className="px-2.5 py-0.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800"
                        >
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Section C: Budget & Milestones Schedule */}
                  <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Funding & Milestones ({milestones.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(3)}
                        className="text-xs font-bold text-[#4f46e5] hover:underline flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-1 text-xs text-slate-500 pb-1">
                      <span>Total: <strong className="text-slate-900">${allocatedBudget}.00 USD</strong> ({remainingBudget === 0 ? "100% Balanced" : `$${remainingBudget} unallocated`})</span>
                      <span>Schedule: <strong className="text-slate-900">{totalMilestoneDays} days</strong> ({timelineDuration})</span>
                    </div>

                    <div className="space-y-2">
                      {milestones.map((ms, i) => (
                        <div
                          key={i}
                          className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center">
                              {i + 1}
                            </span>
                            <span className="font-semibold text-slate-900">{ms.title}</span>
                          </div>
                          <div className="font-mono font-bold text-slate-900">
                            ${ms.amount}.00 USD ({ms.days}d)
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section D: Preferences Summary */}
                  <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Preferences & Privacy
                      </span>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(4)}
                        className="text-xs font-bold text-[#4f46e5] hover:underline flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                      <div className="p-2 rounded-lg bg-white border border-slate-200">
                        <span className="text-[10.5px] text-slate-400 block">Experience</span>
                        <span className="font-bold text-slate-800">{experienceLevel || "Not specified"}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-white border border-slate-200">
                        <span className="text-[10.5px] text-slate-400 block">English</span>
                        <span className="font-bold text-slate-800">{englishLevel || "Not specified"}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-white border border-slate-200">
                        <span className="text-[10.5px] text-slate-400 block">Proposals</span>
                        <span className="font-bold text-slate-800">{proposalsLimit ? proposalsLimit.replace("_", "-") : "Open"}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-white border border-slate-200">
                        <span className="text-[10.5px] text-slate-400 block">Visibility</span>
                        <span className="font-bold text-slate-800">{visibility || "Public"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Consensus Security Guarantee Banner */}
                  <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="font-bold text-slate-900">
                        Cryptographically Sealed Agreement
                      </div>
                      <p className="text-slate-600 leading-relaxed text-[11px]">
                        Publishing locks your project scope under a canonical SHA-256 state seal. No unilateral changes can be made without bilateral sign-off (Section 14).
                      </p>
                    </div>
                  </div>

                  {/* Step 5 Footer Actions */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(4)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Preferences</span>
                    </button>
                    <button
                      type="button"
                      onClick={handlePublish}
                      disabled={isPublishing}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-bold transition shadow-md cursor-pointer active:scale-98 disabled:opacity-50"
                    >
                      <span>{isPublishing ? "Publishing Project..." : "Publish Project & Find Freelancers"}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* ============================================================
                RIGHT COLUMN: 4 COLS (CONTEXT-AWARE PER-STEP INSIGHTS)
               ============================================================ */}
            <div className="lg:col-span-4 space-y-5">
              
              {/* Contextual Card 1: AI Assistant (Customized for Steps 1 & 2) */}
              {(currentStep === 1 || currentStep === 2) && (
                <div className="p-5 rounded-2xl bg-gradient-to-br from-[#f8f9ff] via-[#f1f4ff] to-[#eef2ff] border border-[#4f46e5]/20 shadow-xs space-y-3.5 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-[#4f46e5] text-white flex items-center justify-center shrink-0">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs font-bold text-slate-900">Nexum AI Assistant</h3>
                      <span className="font-mono text-[9px] uppercase px-1.5 py-0.2 bg-[#4f46e5] text-white rounded font-bold">
                        Beta
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {currentStep === 1
                      ? "I can analyze your project title and overview to enhance scope clarity and attract senior contractors."
                      : "I can refine your technical requirements and suggest matching high-demand frameworks for your scope."}
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {currentStep === 1 ? (
                      <button
                        type="button"
                        disabled={isAiImprovingOverview}
                        onClick={handleImproveOverview}
                        className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-[#4f46e5] text-[#4f46e5] font-bold text-[11px] shadow-2xs transition cursor-pointer text-center disabled:opacity-50 inline-flex items-center justify-center gap-1"
                      >
                        {isAiImprovingOverview ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Enriching...</span>
                          </>
                        ) : (
                          <span>✨ Improve Overview</span>
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isAiRefiningRequirements}
                        onClick={handleRefineRequirements}
                        className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-[#4f46e5] text-[#4f46e5] font-bold text-[11px] shadow-2xs transition cursor-pointer text-center disabled:opacity-50 inline-flex items-center justify-center gap-1"
                      >
                        {isAiRefiningRequirements ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Refining...</span>
                          </>
                        ) : (
                          <span>✨ Refine Specs</span>
                        )}
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isAiSuggestingSkills}
                      onClick={handleSuggestSkills}
                      className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-[#4f46e5] text-[#4f46e5] font-bold text-[11px] shadow-2xs transition cursor-pointer text-center disabled:opacity-50 inline-flex items-center justify-center gap-1"
                    >
                      {isAiSuggestingSkills ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Suggesting...</span>
                        </>
                      ) : (
                        <span>💡 Suggest Skills</span>
                      )}
                    </button>
                  </div>

                  {/* Recommended Skills Pills */}
                  <div className="pt-2 border-t border-[#4f46e5]/10">
                    <span className="text-[10.5px] font-bold text-slate-500 block mb-1.5">
                      Recommended Skills to Add {category ? `(${category})` : ""}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {recommendedSkillsList.map((s) => {
                        const isSelected = requiredSkills.includes(s);
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                removeSkill(s);
                              } else {
                                addSkill(s);
                              }
                            }}
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-md transition cursor-pointer flex items-center gap-1 ${
                              isSelected
                                ? "bg-[#4f46e5] text-white border border-[#4f46e5] shadow-2xs"
                                : "bg-white border border-slate-200 hover:border-[#4f46e5] text-slate-700 hover:text-[#4f46e5]"
                            }`}
                          >
                            <span>{isSelected ? "✓" : "+"}</span>
                            <span>{s}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Contextual Card 2: Matching Talent Preview (Shown on Step 2 & 4) */}
              {(currentStep === 2 || currentStep === 4) && (
                <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900">Matching Freelancers</h3>
                      <p className="text-[10.5px] text-slate-400">{MATCHING_FREELANCERS_PREVIEW.length} verified candidates available</p>
                    </div>
                    <Link
                      href="/client/freelancers"
                      className="text-[11px] font-bold text-[#4f46e5] hover:underline"
                    >
                      View All
                    </Link>
                  </div>

                  <div className="space-y-2.5">
                    {MATCHING_FREELANCERS_PREVIEW.map((freelancer) => (
                      <div
                        key={freelancer.name}
                        className="p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 flex items-center justify-between gap-2.5 transition"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 border border-slate-200">
                            <Image
                              src={freelancer.avatar}
                              alt={freelancer.name}
                              width={32}
                              height={32}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {freelancer.name}
                            </p>
                            <p className="text-[10.5px] text-slate-500 truncate">
                              ★ {freelancer.rating} · {freelancer.rate}
                            </p>
                          </div>
                        </div>

                        <Link
                          href="/client/freelancers"
                          className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-[#4f46e5] font-bold text-[10px] shrink-0 hover:bg-[#eef2ff]"
                        >
                          Profile
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contextual Card 3: Escrow & Budget Protection (Shown on Step 3) */}
              {currentStep === 3 && (
                <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3.5 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <h3 className="text-xs font-bold text-slate-900">PayPal Escrow Protection</h3>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    Milestone funding is pre-authorized in PayPal Sandbox Escrow. Your capital is never released until you verify and accept the deliverable test reports.
                  </p>

                  <div className="space-y-2 pt-1 border-t border-slate-100 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Market Avg. for {category}:</span>
                      <span className="font-bold text-slate-900 font-mono">$45 - $75 / hr</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Typical Fixed Scope:</span>
                      <span className="font-bold text-slate-900 font-mono">$3,000 - $6,500</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Contextual Card 4: Consensus Pre-Check (Shown on Step 5) */}
              {currentStep === 5 && (
                <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3 animate-in fade-in duration-200">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Consensus Ready Checklist
                  </h3>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-emerald-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Project Details Validated</span>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{requiredSkills.length} Skills & Scope Defined</span>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{milestones.length} Milestones Scheduled</span>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>SHA-256 Spec Hash Prepared</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Live Project Summary Card (Always Visible & Updating in Real-Time) */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-bold text-slate-900">Live Project Summary</h3>
                  <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-[#eef2ff] text-[#4f46e5]">
                    Step {currentStep} of 5
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-slate-400">Title:</span>
                    <span className="font-semibold text-slate-900 text-right truncate max-w-[180px]">
                      {title}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <span className="text-slate-400">Category:</span>
                    <span className="font-semibold text-slate-900 text-right">
                      {category}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <span className="text-slate-400">Skills:</span>
                    <span className="font-semibold text-slate-900 text-right truncate max-w-[180px]">
                      {requiredSkills.slice(0, 3).join(", ")}
                      {requiredSkills.length > 3 && ` (+${requiredSkills.length - 3})`}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <span className="text-slate-400">Budget:</span>
                    <div className="text-right font-mono">
                      <span className="font-bold text-slate-900">
                        ${budgetAmount || "0"}.00 USD
                      </span>
                      <div className="text-[10px]">
                        {remainingBudget === 0 ? (
                          <span className="text-emerald-600 font-semibold">✓ 100% Balanced</span>
                        ) : remainingBudget > 0 ? (
                          <span className="text-amber-600 font-semibold">${remainingBudget} unallocated</span>
                        ) : (
                          <span className="text-rose-600 font-semibold">Over budget (${Math.abs(remainingBudget)})</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <span className="text-slate-400">Timeline:</span>
                    <div className="text-right">
                      <span className="font-semibold text-slate-900">{timelineDuration || "Not set"}</span>
                      {totalMilestoneDays > 0 && (
                        <div className="text-[10px] font-mono">
                          {isTimelineExceeded ? (
                            <span className="text-amber-600 font-bold">
                              {totalMilestoneDays} days (+{overTimelineDays}d extended)
                            </span>
                          ) : unallocatedDays > 0 ? (
                            <span className="text-slate-500">
                              {totalMilestoneDays} of {targetTimelineDays} days
                            </span>
                          ) : (
                            <span className="text-emerald-600 font-semibold">
                              {totalMilestoneDays} days (Synced)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <span className="text-slate-400">Milestones:</span>
                    <div className="text-right">
                      <span className="font-semibold text-slate-900">
                        {milestones.length} Milestones
                      </span>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {totalMilestoneDays} days scheduled (${allocatedBudget})
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Tip Callout Box */}
                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/60 text-xs text-amber-900 flex items-start gap-2 pt-2.5">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    <strong>Tip from Nexum AI:</strong> Projects with detailed requirements and verified milestone acceptance criteria receive 3x more proposals from top 1% talent.
                  </p>
                </div>
              </div>

            </div>

          </div>
        </main>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-5 py-2.5 rounded-2xl text-xs font-semibold shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2 border border-slate-700 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export default function PostNewProjectPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-8">
          <div className="animate-spin w-8 h-8 border-3 border-[#4f46e5] border-t-transparent rounded-full" />
        </div>
      }
    >
      <PostNewProjectContent />
    </Suspense>
  );
}
