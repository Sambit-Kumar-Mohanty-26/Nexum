import { AssistantMessage } from "./conversation-types";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.AI_API_KEY || "";
const PRIMARY_MODEL = process.env.AI_MODEL || process.env.GEMINI_MODEL || "gemini-3.8-flash";

// Modern Google Gemini model fallback cascade:
// 1. gemini-3.8-flash (Latest modern generation flagship model)
// 2. gemini-3.7-flash (Cutting-edge Gemini 3.7 series)
// 3. gemini-3.5-flash (High-efficiency Gemini 3.5 series)
// 4. gemini-flash-latest (Google's rolling latest flash alias)
// 5. gemini-3.1-pro-preview (Advanced multi-modal reasoning fallback)
// 6. gemini-pro-latest (Google's rolling latest pro alias)
// 7. gemini-flash-lite-latest (Ultra-fast lightweight fallback)
export const MODEL_FALLBACK_CASCADE = Array.from(
  new Set([
    PRIMARY_MODEL,
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-3.5-flash",
    "gemini-flash-latest",
    "gemini-3.1-pro-preview",
    "gemini-pro-latest",
    "gemini-flash-lite-latest",
  ])
);

export interface ProjectContext {
  projectName: string;
  clientName: string;
  organization: string;
  agreementHash: string;
  budgetCeiling: string;
  capturedAmount: string;
  preFundedAmount: string;
  reserveAmount: string;
  contractor: {
    name: string;
    role: string;
    location: string;
    rate: string;
  };
  milestones: Array<{
    id: string;
    title: string;
    amount: string;
    status: string;
    fundingStatus: string;
    notes: string;
  }>;
  recentAuditEvents: string[];
}

export function getClientProjectContext(): ProjectContext {
  return {
    projectName: "Bilateral E-Commerce Payment Rails",
    clientName: "Alex Rivera",
    organization: "Horizon Commerce LLC",
    agreementHash: "canonical_v1.2_#9f8c2b7e",
    budgetCeiling: "$4,500.00 USD",
    capturedAmount: "$1,200.00 USD",
    preFundedAmount: "$1,500.00 USD",
    reserveAmount: "$1,800.00 USD",
    contractor: {
      name: "Rohan Verma",
      role: "Senior Full-Stack & Payment Rails Engineer",
      location: "Bengaluru, India",
      rate: "$65.00/hr",
    },
    milestones: [
      {
        id: "m1",
        title: "Milestone 1: Project Intake & Architecture PRD",
        amount: "$1,200.00 USD",
        status: "APPROVED_AND_RELEASED",
        fundingStatus: "CAPTURED",
        notes: "Scope signed off; PayPal Order #4AB912048C881923K captured.",
      },
      {
        id: "m2",
        title: "Milestone 2: PayPal REST v2 Webhook Ingestion Engine",
        amount: "$1,500.00 USD",
        status: "IN_REVIEW",
        fundingStatus: "PRE_FUNDED (Sandbox Order #6DE714998H998261C)",
        notes:
          "Submitted PR #42 & Loom walkthrough. 3 acceptance criteria verified. Awaiting client release approval.",
      },
      {
        id: "m3",
        title: "Milestone 3: Dual SHA-256 State Machine & Ledger Replay",
        amount: "$1,000.00 USD",
        status: "NOT_STARTED",
        fundingStatus: "UNALLOCATED_RESERVE",
        notes: "Unlocks after M2 release under Fund-Before-Work rule.",
      },
      {
        id: "m4",
        title: "Milestone 4: Failover Simulator & Deduplication Verification",
        amount: "$800.00 USD",
        status: "NOT_STARTED",
        fundingStatus: "UNALLOCATED_RESERVE",
        notes: "Final consensus verification and bilateral contract conclusion.",
      },
    ],
    recentAuditEvents: [
      "DELIVERABLE_SUBMITTED: Rohan Verma submitted PR #42 for Milestone 2",
      "PAYPAL_ORDER_CREATED: Sandbox Order #6DE714998H998261C pre-funded for $1,500.00 USD",
      "AGREEMENT_LOCKED: Bilateral dual-approval signed under hash canonical_v1.2_#9f8c2b7e",
    ],
  };
}

export function buildSystemPrompt(): string {
  const ctx = getClientProjectContext();

  return `You are the Nexum AI Project Copilot, an intelligent project and payment advisor powered by Google Gemini for client ${ctx.clientName} (${ctx.organization}).

CURRENT PROJECT DATA:
- Project: "${ctx.projectName}"
- Agreement Hash: ${ctx.agreementHash} (Dual SHA-256 consensus locked)
- Authorized Budget Ceiling: ${ctx.budgetCeiling}
- Payment Captured: ${ctx.capturedAmount} (Milestone 1 settled)
- Pre-Funded Milestone Balance: ${ctx.preFundedAmount} (Milestone 2 pre-funded in PayPal Sandbox Order #6DE714998H998261C)
- Unallocated Budget Reserve: ${ctx.reserveAmount} (Milestones 3 & 4)
- Contractor: ${ctx.contractor.name} (${ctx.contractor.role}, ${ctx.contractor.location}, ${ctx.contractor.rate})

CURRENT MILESTONE STATUS:
${ctx.milestones
  .map(
    (m) =>
      `• [${m.id.toUpperCase()}] ${m.title} - ${m.amount} | Work: ${m.status} | Funding: ${m.fundingStatus} | Details: ${m.notes}`
  )
  .join("\n")}

AUDIT EVENTS:
${ctx.recentAuditEvents.map((e) => `• ${e}`).join("\n")}

STRICT BEHAVIORAL & SAFETY RULES:
1. You provide objective, transparent analysis of milestones, code deliverables, payment rails, and contractor fit.
2. AI SAFETY BOUNDARY: You CANNOT independently approve agreements, approve deliverables, capture payments, or modify financial ledger states. Always clarify that consequential actions require Alex Rivera's explicit authorization.
3. ACCOUNTING ACCURACY: A PayPal Sandbox captured order confirms payment provider authorization execution, NOT proof of off-platform commercial bank payout. Pre-funded orders are held in provider escrow reserve.
4. Keep responses concise, well-structured, formatted in clean Markdown with bullet points or code snippets where appropriate.`;
}

/**
 * Executes a generation request with the Gemini model using an automatic
 * multi-model fallback cascade:
 * [Primary -> gemini-3.8-flash -> gemini-3.7-flash -> gemini-3.5-flash -> gemini-flash-latest -> gemini-3.1-pro-preview -> Deterministic Protocol]
 */
export async function generateGeminiResponse(
  messages: AssistantMessage[]
): Promise<{ text: string; model: string; isFallback?: boolean }> {
  const systemPrompt = buildSystemPrompt();

  // If no Gemini API key configured, return an informative fallback that still explains real project facts
  if (!GEMINI_API_KEY || GEMINI_API_KEY.includes("your_gemini")) {
    const lastUserMsg = messages.filter((m) => m.role === "user").pop()?.content || "";
    return {
      text: generateContextualDemoResponse(lastUserMsg),
      model: `${PRIMARY_MODEL} (Offline Protocol Mode)`,
      isFallback: true,
    };
  }

  // Format messages into Gemini REST API format
  const contents = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const payload = {
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    contents,
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 1200,
      topP: 0.9,
    },
  };

  const cascadeErrors: string[] = [];

  // Sequential model fallback loop
  for (const model of MODEL_FALLBACK_CASCADE) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 18000);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errText = await res.text();
        cascadeErrors.push(`${model} (HTTP ${res.status}): ${errText.substring(0, 100)}`);
        console.warn(`[Nexum AI] Model "${model}" failed (HTTP ${res.status}). Cascading to next model...`);
        continue;
      }

      const data = await res.json();
      const candidate = data.candidates?.[0];
      const text = candidate?.content?.parts?.[0]?.text;

      if (!text || !text.trim()) {
        cascadeErrors.push(`${model}: Empty candidate response`);
        console.warn(`[Nexum AI] Model "${model}" returned empty text. Trying next fallback...`);
        continue;
      }

      return {
        text,
        model,
        isFallback: model !== PRIMARY_MODEL,
      };
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const error = err as Error;
      cascadeErrors.push(`${model}: ${error.message}`);
      console.warn(`[Nexum AI] Model "${model}" error: ${error.message}. Trying next fallback...`);
    }
  }

  // If all models in the cloud API chain were exhausted, fall back to protocol mode
  const lastUserMsg = messages.filter((m) => m.role === "user").pop()?.content || "";
  return {
    text: `${generateContextualDemoResponse(lastUserMsg)}\n\n*(Note: Cloud model cascade exhausted [${MODEL_FALLBACK_CASCADE.join(" → ")}]. Response generated via Nexum Consensus Protocol engine).*`,
    model: `${PRIMARY_MODEL} (Protocol Mode)`,
    isFallback: true,
  };
}

/**
 * High-fidelity contextual fallback response generator for environments
 * without an active GEMINI_API_KEY. Uses exact project state machine facts.
 */
function generateContextualDemoResponse(prompt: string): string {
  const p = prompt.toLowerCase();
  const ctx = getClientProjectContext();

  if (p.includes("milestone") || p.includes("progress")) {
    return `### Project Milestone Progress Summary
**Project:** ${ctx.projectName}  
**Agreement Hash:** \`${ctx.agreementHash}\`

1. **Milestone 1: Project Intake & Architecture PRD** — **$1,200.00 USD**  
   *Status:* Approved & Released ✓ (Captured via PayPal Order #4AB912048C881923K).
2. **Milestone 2: PayPal REST v2 Webhook Ingestion Engine** — **$1,500.00 USD**  
   *Status:* **Awaiting Client Review** (Pre-funded in PayPal Sandbox Order #6DE714998H998261C).  
   *Artifacts:* GitHub PR #42 & Loom Walkthrough submitted by ${ctx.contractor.name}.
3. **Milestone 3: Dual SHA-256 State Machine & Ledger Replay** — **$1,000.00 USD**  
   *Status:* Locked in reserve; unlocks after Milestone 2 completes.
4. **Milestone 4: Failover Simulator & Deduplication Verification** — **$800.00 USD**  
   *Status:* Final stage; concludes agreement.

> **Next Action:** You can review the Loom demo and code for Milestone 2 on your dashboard and click **Approve & Release Funds ($1,500)** when satisfied.`;
  }

  if (p.includes("payment") || p.includes("escrow") || p.includes("financial")) {
    return `### Financial & Payment Rails Breakdown
Here is the real-time breakdown of your authorized agreement funds:

- **Authorized Agreement Ceiling:** **${ctx.budgetCeiling}** (Total contract commitment across 4 phases).
- **Payment Captured & Confirmed:** **${ctx.capturedAmount}** (Milestone 1 settled on PayPal Sandbox).
- **Pre-Funded Milestone Balance:** **${ctx.preFundedAmount}** (Held in PayPal Sandbox Order #6DE714998H998261C for Milestone 2).
- **Unallocated Budget Reserve:** **${ctx.reserveAmount}** (Reserved for Milestones 3 and 4).

*Note: In compliance with ProofLoop Global payment standards, PayPal Sandbox orders represent provider authorizations and cannot be disbursed outside client approval.*`;
  }

  if (p.includes("freelancer") || p.includes("talent") || p.includes("hire")) {
    return `### Recommended Talent for ${ctx.projectName}
Based on your requirement for resilient payment rails, Next.js architecture, and consensus state machines:

1. **${ctx.contractor.name}** (*Active Contractor*) — **${ctx.contractor.rate}**  
   *Fit:* 98% · Lead engineer on your current PayPal REST v2 webhook engine.
2. **Priya Sharma** (*Available*) — **$55.00/hr**  
   *Fit:* 94% · UI/UX & Design Systems Architect specializing in accessible checkout flows and verifiable milestone prototypes.
3. **Marcus Chen** (*Available*) — **$75.00/hr**  
   *Fit:* 91% · Cloud Infrastructure & Reliability Engineer specializing in zero-downtime webhook pipelines and Docker container orchestration.

> You can view full profiles or share structured project briefs on the **Freelancers** directory.`;
  }

  if (p.includes("agreement") || p.includes("hash") || p.includes("sha")) {
    return `### Active Agreement Details
- **Contract Identifier:** \`${ctx.agreementHash}\`
- **Parties:** ${ctx.clientName} (Horizon Commerce LLC) & ${ctx.contractor.name}
- **Consensus Rule:** Dual SHA-256 Bilateral Approval
- **Funding Protocol:** Fund-Before-Work (Milestones must be pre-funded prior to phase commencement).
- **Dispute Policy:** OECD Paper 167 consumer protection compliant.

All state transitions are cryptographically signed and logged in your immutable audit trail.`;
  }

  return `### Nexum Project Copilot
I have reviewed your inquiry regarding **${ctx.projectName}**.

- **Active Contractor:** ${ctx.contractor.name} (${ctx.contractor.role})
- **Immediate Task:** Milestone 2 deliverable review (PR #42, $1,500.00 pre-funded in Sandbox Escrow).
- **Total Budget:** ${ctx.budgetCeiling} ($1,200 captured, $1,500 in review, $1,800 reserve).

How would you like to proceed? I can draft change requests, summarize code diffs, or explain PayPal REST v2 idempotency guarantees.`;
}
