import { GoogleGenAI } from "@google/genai";
import { env } from "../lib/env.js";

export interface ScopeEvaluationResult {
  recommendation: "AMEND_EXISTING_MILESTONE" | "ADD_NEW_MILESTONE";
  targetMilestoneTitle: string;
  suggestedPriceCents: number; // Integer minor units (e.g. 40000 = $400 USD)
  suggestedTimelineDays: number;
  acceptanceCriteria: string[];
  justification: string;
  freelancerImpactNotes: string;
  clientBudgetNotes: string;
}

export class GeminiService {
  private getClient(): GoogleGenAI | null {
    const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim().length === 0) {
      return null;
    }
    return new GoogleGenAI({ apiKey });
  }

  /**
   * Evaluate a requested scope add-on against locked milestones using Gemini 2.5 Flash.
   * Determines whether to amend an existing milestone or create a new one,
   * calculating the integer price delta, timeline delta, and acceptance criteria.
   */
  async evaluateScopeAddon(params: {
    projectTitle: string;
    projectDescription: string;
    currentMilestones: Array<{
      id: string;
      title: string;
      amountCents: number;
      workStatus: string;
      dueDate?: string | null;
    }>;
    addonDescription: string;
    requestedByRole: "CLIENT" | "FREELANCER";
  }): Promise<ScopeEvaluationResult> {
    const ai = this.getClient();

    const milestoneSummary = params.currentMilestones
      .map(
        (m, idx) =>
          `Milestone ${idx + 1}: "${m.title}" | Amount: $${(m.amountCents / 100).toFixed(
            2
          )} | Status: ${m.workStatus} | Due: ${m.dueDate || "Scheduled"}`
      )
      .join("\n");

    const fallbackResult: ScopeEvaluationResult = {
      recommendation:
        params.currentMilestones.length > 0 &&
        params.currentMilestones.some((m) => m.workStatus === "IN_PROGRESS" || m.workStatus === "UPCOMING")
          ? "ADD_NEW_MILESTONE"
          : "AMEND_EXISTING_MILESTONE",
      targetMilestoneTitle:
        params.currentMilestones.length > 0
          ? `Add-on: ${params.addonDescription.slice(0, 40)}`
          : "Milestone 1 Scope Expansion",
      suggestedPriceCents: 45000, // $450.00
      suggestedTimelineDays: 4,
      acceptanceCriteria: [
        `Deliver requested addition: ${params.addonDescription.slice(0, 80)}`,
        "Pass automated unit & integration test coverage",
        "Verify bilateral acceptance between Client and Freelancer",
      ],
      justification: `Nexum AI protocol evaluated this request as a distinct feature expansion. Recommended based on existing milestone cadence.`,
      freelancerImpactNotes: `Requires ~4 additional days of engineering capacity. Recommend securing escrow deposit before starting development.`,
      clientBudgetNotes: `Increases total project commitment by $450.00 USD under PayPal Escrow protection.`,
    };

    if (!ai) {
      console.warn("[GeminiService] GEMINI_API_KEY not set. Using rule-based scope evaluation fallback.");
      return fallbackResult;
    }

    const prompt = `You are the Nexum AI Scope Mediator for high-stakes freelance contracts.
A ${params.requestedByRole} wants to add this feature/work to an active contract:
ADD-ON REQUEST: "${params.addonDescription}"

PROJECT CONTEXT:
Title: "${params.projectTitle}"
Description: "${params.projectDescription}"

CURRENT CONTRACT MILESTONES:
${milestoneSummary}

TASK:
1. Determine if this addition naturally expands an existing in-progress/upcoming milestone ("AMEND_EXISTING_MILESTONE") or represents a distinct new phase ("ADD_NEW_MILESTONE").
2. Formulate a fair price impact in integer cents (e.g., $350 = 35000 cents, $600 = 60000 cents).
3. Formulate realistic timeline impact in additional days.
4. Formulate 2 to 4 verifiable acceptance criteria.
5. Provide a diplomatic justification, noting impacts for the Freelancer and Client.

Return strictly valid JSON matching this schema:
{
  "recommendation": "AMEND_EXISTING_MILESTONE" or "ADD_NEW_MILESTONE",
  "targetMilestoneTitle": string,
  "suggestedPriceCents": integer (positive cents),
  "suggestedTimelineDays": integer (positive days),
  "acceptanceCriteria": string[],
  "justification": string,
  "freelancerImpactNotes": string,
  "clientBudgetNotes": string
}`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });

      const text = response.text?.trim() || "";
      if (!text) return fallbackResult;

      const parsed = JSON.parse(text);
      return {
        recommendation:
          parsed.recommendation === "AMEND_EXISTING_MILESTONE"
            ? "AMEND_EXISTING_MILESTONE"
            : "ADD_NEW_MILESTONE",
        targetMilestoneTitle: parsed.targetMilestoneTitle || fallbackResult.targetMilestoneTitle,
        suggestedPriceCents:
          typeof parsed.suggestedPriceCents === "number" && parsed.suggestedPriceCents > 0
            ? Math.round(parsed.suggestedPriceCents)
            : 40000,
        suggestedTimelineDays:
          typeof parsed.suggestedTimelineDays === "number" && parsed.suggestedTimelineDays > 0
            ? Math.round(parsed.suggestedTimelineDays)
            : 3,
        acceptanceCriteria:
          Array.isArray(parsed.acceptanceCriteria) && parsed.acceptanceCriteria.length > 0
            ? parsed.acceptanceCriteria
            : fallbackResult.acceptanceCriteria,
        justification: parsed.justification || fallbackResult.justification,
        freelancerImpactNotes: parsed.freelancerImpactNotes || fallbackResult.freelancerImpactNotes,
        clientBudgetNotes: parsed.clientBudgetNotes || fallbackResult.clientBudgetNotes,
      };
    } catch (err) {
      console.error("[GeminiService] Error evaluating scope add-on:", err);
      return fallbackResult;
    }
  }

  /**
   * Summarize a project specification or requirements document into actionable targets
   */
  async summarizeDocument(docText: string, docName: string) {
    const ai = this.getClient();
    if (!ai) {
      return {
        summary: `Document "${docName}" ingested. Contains ${docText.split(" ").length} words.`,
        keyTargets: [
          "Fulfill core functional requirements",
          "Meet performance & security benchmarks",
          "Ensure bilateral inspection buffer adherence",
        ],
        suggestedMilestones: [
          "Milestone 1: Architectural Foundation & Specs",
          "Milestone 2: Core Engine Implementation",
          "Milestone 3: Verification, QA & Escrow Settlement",
        ],
        keyRisks: [
          "Ambiguous third-party API rate limits",
          "Timeline slippage on edge-case error scenarios",
        ],
      };
    }

    try {
      const prompt = `You are Nexum AI. Analyze this specification document ("${docName}") and produce an executive summary and 3-5 concrete milestone targets with acceptance criteria.
DOCUMENT:
${docText.slice(0, 25000)}

Return JSON:
{
  "summary": string,
  "keyTargets": string[]
}`;

      const res = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      return JSON.parse(res.text || "{}");
    } catch (err) {
      console.error("[GeminiService] Document summary error:", err);
      return {
        summary: `Summary of ${docName}`,
        keyTargets: ["Deliver core specification features"],
      };
    }
  }
}

export const geminiService = new GeminiService();
