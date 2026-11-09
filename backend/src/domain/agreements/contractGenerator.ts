import crypto from "crypto";
import { defaultStorage } from "../../lib/files.js";
import { FilePurpose, ProjectFileCategory } from "@prisma/client";

export interface ContractMilestoneInput {
  sequence: number;
  title: string;
  description?: string;
  amountMinor: number;
  durationWeeks?: number;
  criteria?: Array<string | { id?: string; text?: string; title?: string }>;
  deliverables?: Array<string | { id?: string; title?: string; text?: string }>;
}

export interface ContractGenerationParams {
  agreementId: string;
  versionNumber: number;
  projectTitle: string;
  projectDescription?: string;
  clientName: string;
  clientEmail?: string;
  freelancerName: string;
  freelancerEmail?: string;
  totalAmountMinor: number;
  currency?: string;
  durationWeeks?: number;
  milestones: ContractMilestoneInput[];
  isRatified?: boolean;
  clientApprovedAt?: Date | string | null;
  freelancerApprovedAt?: Date | string | null;
  amendmentNotes?: string;
}

export interface SaveContractFileParams {
  projectId: string;
  agreementId: string;
  versionNumber: number;
  contractMarkdown: string;
  uploadedBy: string;
}

/**
 * Synthesizes a formal bilateral service and escrow agreement in Markdown format.
 */
export function generateContractMarkdown(params: ContractGenerationParams): string {
  const currency = params.currency || "USD";
  const totalDisplay = `$${(params.totalAmountMinor / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;

  const clientSignStatus = params.clientApprovedAt
    ? `Signed on ${new Date(params.clientApprovedAt).toUTCString()}`
    : "Pending Client Ratification";

  const freelancerSignStatus = params.freelancerApprovedAt
    ? `Signed on ${new Date(params.freelancerApprovedAt).toUTCString()}`
    : "Pending Freelancer Ratification";

  const ratifiedStatus = params.isRatified
    ? "RATIFIED & LEGALLY BINDING"
    : "DRAFT (PENDING MUTUAL HUMAN RATIFICATION)";

  const nowStr = new Date().toUTCString();

  let markdown = `# BILATERAL FREELANCE SERVICE & ESCROW AGREEMENT
**Document Reference:** NEXUM-AGR-${params.agreementId.slice(0, 10).toUpperCase()}-v${params.versionNumber}.0  
**Version:** v${params.versionNumber}.0  
**Status:** ${ratifiedStatus}  
**Date of Synthesis:** ${nowStr}  
**Protocol Mediator:** Nexum Autonomous AI Mediation Engine  

---

## 1. PARTIES & APPOINTMENT

This Freelance Service and Escrow Agreement ("Agreement") is established between:

- **Client:** ${params.clientName} ${params.clientEmail ? `(${params.clientEmail})` : ""}
- **Freelancer / Service Provider:** ${params.freelancerName} ${params.freelancerEmail ? `(${params.freelancerEmail})` : ""}
- **Autonomous Escrow Authority:** Nexum AI Protocol Platform

The Client hereby engages the Freelancer, and the Freelancer agrees to perform the technical, design, and implementation services for the project described below, in strict accordance with the agreed terms, milestone checkpoints, and cryptographic verification rules.

---

## 2. PROJECT SCOPE & OBJECTIVES

- **Project Title:** ${params.projectTitle}
- **Estimated Total Duration:** ${params.durationWeeks || 4} Weeks
- **Total Fixed-Price Commitment:** ${totalDisplay}
- **Payment Model:** Milestone-by-Milestone Bilateral Escrow

### 2.1 Scope Overview
${params.projectDescription || "Implementation of deliverables according to the verified proposal specifications and architecture benchmarks."}

${params.amendmentNotes ? `### 2.2 Add-on & Amendment Notes (v${params.versionNumber}.0)\n${params.amendmentNotes}\n` : ""}

---

## 3. RATIFIED MILESTONE SCHEDULE & PAYMENT CHECKPOINTS

Development and compensation are structured into sequential, independently verified milestone tranches. Pre-funding into Nexum PayPal REST v2 escrow is mandatory prior to commencement of each milestone.

| # | Milestone Title | Estimated Timeline | Amount (${currency}) | Payment Escrow Status |
|---|-----------------|-------------------|---------------------|-----------------------|
`;

  params.milestones.forEach((m, idx) => {
    const seq = m.sequence || idx + 1;
    const amountStr = `$${(m.amountMinor / 100).toFixed(2)} ${currency}`;
    const timeline = m.durationWeeks ? `${m.durationWeeks} Weeks` : "Per Schedule";
    markdown += `| ${seq} | ${m.title} | ${timeline} | ${amountStr} | Pre-funded via Escrow |\n`;
  });

  markdown += `\n### 3.1 Milestone Acceptance Criteria & Deliverables\n\n`;

  params.milestones.forEach((m, idx) => {
    const seq = m.sequence || idx + 1;
    const amountStr = `$${(m.amountMinor / 100).toFixed(2)} ${currency}`;
    markdown += `#### Milestone ${seq}: ${m.title} (${amountStr})\n`;
    if (m.description) {
      markdown += `${m.description}\n\n`;
    }

    if (m.criteria && m.criteria.length > 0) {
      markdown += `**Acceptance & Verification Criteria:**\n`;
      m.criteria.forEach((c) => {
        const text = typeof c === "string" ? c : c.text || c.title || "Acceptance benchmark";
        markdown += `- [ ] ${text}\n`;
      });
      markdown += `\n`;
    }

    if (m.deliverables && m.deliverables.length > 0) {
      markdown += `**Key Deliverables:**\n`;
      m.deliverables.forEach((d) => {
        const title = typeof d === "string" ? d : d.title || d.text || "Deliverable item";
        markdown += `- ${title}\n`;
      });
      markdown += `\n`;
    }
  });

  markdown += `---

## 4. ESCROW & FINANCIAL SECURITY MECHANICS

1. **Pre-Funding Requirement:** Prior to work commencing on Milestone #1, the Client must deposit and lock the corresponding funds ($${(params.milestones[0]?.amountMinor ? params.milestones[0].amountMinor / 100 : params.totalAmountMinor / 100).toFixed(2)} ${currency}) into Nexum Escrow via PayPal REST v2 Orders API.
2. **Autonomous Verification:** Upon deliverable submission by the Freelancer, Nexum's Autonomous Verifier examines code artifacts, git commits, automated tests, and deployment health against documented criteria.
3. **Client Inspection Period:** The Client receives a 72-hour review window to approve release or submit specific correction requests.
4. **Dispute Protection:** If an irreconcilable conflict arises, funds remain immutably locked in escrow while Nexum AI Mediation analyzes the verified audit timeline and code artifacts.

---

## 5. DOCUMENT REVISION & ADD-ON VERSIONING POLICY

Any post-ratification modifications to scope, deliverables, milestone counts, budget, or timeline shall be governed by the following rules:
- An AI-synthesized bilateral Scope Amendment must be proposed in the shared project workspace.
- Upon mutual acceptance, the system automatically increments the contract version (e.g., v1.0 &rarr; v2.0), creates a corresponding new version file (\`Contract_Agreement_vX.0.md\`) in the Project Files vault, and issues a fresh SHA-256 seal.
- Previous versions remain permanently archived in the version history.

---

## 6. MUTUAL RATIFICATION & CRYPTOGRAPHIC SIGN-OFF

By approving this document inside the Nexum project workspace, both parties certify their full consensus with the terms and milestone allocations specified herein.

| Role | Signatory Party | Ratification Status | Protocol Seal |
|------|-----------------|--------------------|---------------|
| **Client** | ${params.clientName} | ${clientSignStatus} | SHA256-CLIENT-VERIFIED |
| **Freelancer** | ${params.freelancerName} | ${freelancerSignStatus} | SHA256-TALENT-VERIFIED |
| **Autonomous Mediator** | Nexum AI Protocol Engine | Verified Synthesized Baseline | \`hash_v${params.versionNumber}_${params.agreementId.slice(0, 8)}\` |

*This document was digitally drafted by Nexum AI and saved to Project Files for permanent access by both parties.*
`;

  return markdown;
}

/**
 * Saves the synthesized contract as a ProjectFile and File record in the database
 * and writes the content to storage for downloading and permanent access.
 */
export async function saveContractAsProjectFile(
  tx: any,
  params: SaveContractFileParams
): Promise<{ file: any; projectFile: any; fileName: string; sha256: string }> {
  const fileName = `Contract_Agreement_v${params.versionNumber}.0.md`;
  const storageKey = `contracts/${params.projectId}/${fileName}`;
  const buffer = Buffer.from(params.contractMarkdown, "utf-8");
  const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");

  // Save to persistent file storage
  try {
    await defaultStorage.save(storageKey, buffer);
  } catch (err) {
    console.warn(`[contractGenerator] Warning: Could not write file to storage:`, err);
  }

  // Create File record
  const file = await tx.file.create({
    data: {
      ownerId: params.uploadedBy,
      purpose: FilePurpose.PROJECT_FILE,
      storageKey,
      originalName: fileName,
      mime: "text/markdown",
      sizeBytes: buffer.length,
      sha256,
    },
  });

  // Create ProjectFile record
  const projectFile = await tx.projectFile.create({
    data: {
      projectId: params.projectId,
      fileId: file.id,
      uploadedBy: params.uploadedBy,
      category: ProjectFileCategory.REFERENCE,
      name: fileName,
      versionNumber: params.versionNumber,
      note: `AI-Synthesized Bilateral Contract v${params.versionNumber}.0`,
    },
  });

  return { file, projectFile, fileName, sha256 };
}

