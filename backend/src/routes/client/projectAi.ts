import { Router, Request, Response } from "express";
import multer from "multer";
import { z } from "zod";
import { openSourceAiService, stripMarkdownStars } from "../../services/openSourceAiService.js";
import { extractTextFromDocx } from "../../lib/docxParser.js";
import { geminiService } from "../../services/geminiService.js";
import { uploadProjectDocumentArtifact, generatePresignedUploadUrl } from "../../lib/storage.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

const assistSchema = z.object({
  action: z.enum([
    "IMPROVE_OVERVIEW",
    "SUGGEST_SKILLS",
    "GENERATE_REQUIREMENTS",
    "REFINE_REQUIREMENTS",
    "EVALUATE_ADDON_OR_SCOPE",
    "AUTO_SYNC_SCHEDULE",
  ]),
  title: z.string().optional(),
  overview: z.string().optional(),
  category: z.string().optional(),
  existingSkills: z.array(z.string()).optional(),
  existingRequirements: z.string().optional(),
  budgetAmount: z.string().optional(),
  timelineDuration: z.string().optional(),
  milestones: z.array(z.any()).optional(),
  addonDescription: z.string().optional(),
});

/**
 * POST /api/client/projects/ai/extract-doc
 * Extracts structured project details from an uploaded file (PDF, TXT, MD) or raw pasted text
 */
router.post(
  "/projects/ai/extract-doc",
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      let documentText = "";
      let fileName: string | undefined = undefined;

      if (req.file) {
        fileName = req.file.originalname;
        const mime = req.file.mimetype || "";
        const originalLower = req.file.originalname.toLowerCase();
        const isPdf = mime.includes("pdf") || originalLower.endsWith(".pdf");
        const isDocx =
          mime.includes("wordprocessingml") ||
          mime.includes("officedocument") ||
          originalLower.endsWith(".docx") ||
          (req.file.buffer.length > 4 && req.file.buffer[0] === 0x50 && req.file.buffer[1] === 0x4b);

        if (isPdf) {
          try {
            const pdfModule = await import("pdf-parse");
            const pdfParseFn: any = (pdfModule as any).default || pdfModule;
            const parsed = typeof pdfParseFn === "function"
              ? await pdfParseFn(req.file.buffer)
              : typeof pdfParseFn?.default === "function"
                ? await pdfParseFn.default(req.file.buffer)
                : null;

            documentText = parsed?.text || "";
          } catch (pdfErr) {
            console.warn("[ProjectAI] PDF parse error:", pdfErr);
            documentText = "";
          }
        } else if (isDocx) {
          documentText = extractTextFromDocx(req.file.buffer);
        } else {
          // Standard text / Markdown / JSON
          documentText = req.file.buffer.toString("utf-8");
        }

        // Strip raw PK zip binary if document parsing yielded nothing or unhandled zip payload
        if (documentText.startsWith("PK") && documentText.includes("[Content_Types].xml")) {
          documentText = "";
        }

        // Clean binary control codes if any leaked through
        documentText = documentText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "").trim();
      } else if (req.body?.text && typeof req.body.text === "string") {
        documentText = req.body.text;
        fileName = req.body.fileName || "Pasted Brief";
      }

      if (!documentText || documentText.trim().length === 0) {
        return res.status(400).json({
          error: {
            code: "EMPTY_DOCUMENT",
            message: "No readable document text provided. Upload a valid PDF, Word, Markdown, or text file.",
            details: null,
          },
        });
      }

      let uploadedDocMeta: {
        name: string;
        size: string;
        type: string;
        uploadedAt: string;
        url?: string;
        storageKey?: string;
        storage?: string;
      } | null = null;

      if (req.file) {
        try {
          const storageResult = await uploadProjectDocumentArtifact({
            buffer: req.file.buffer,
            fileName: req.file.originalname,
            contentType: req.file.mimetype || "application/pdf",
          });

          uploadedDocMeta = {
            name: req.file.originalname,
            size: `${(req.file.size / (1024 * 1024)).toFixed(1)} MB`,
            type: req.file.mimetype || "application/pdf",
            uploadedAt: new Date().toISOString(),
            url: storageResult.url,
            storageKey: storageResult.key,
            storage: storageResult.storage,
          };
        } catch (storageErr) {
          console.warn("[ProjectAI] Object storage upload error:", storageErr);
        }
      }

      const extracted = await openSourceAiService.extractProjectFromDocument(documentText, fileName);
      return res.json({
        success: true,
        data: extracted,
        uploadedDocument: uploadedDocMeta,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Document extraction failed";
      return res.status(500).json({
        error: {
          code: "AI_EXTRACTION_FAILED",
          message: msg,
          details: null,
        },
      });
    }
  }
);

/**
 * POST /api/client/projects/presigned-url
 * Generates an S3 presigned upload URL or storage path for direct document upload.
 */
router.post("/projects/presigned-url", async (req: Request, res: Response) => {
  try {
    const { fileName, contentType = "application/pdf" } = req.body || {};
    if (!fileName || typeof fileName !== "string") {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "fileName is required",
          details: null,
        },
      });
    }

    const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `project-documents/${Date.now()}-${sanitized}`;
    const presigned = await generatePresignedUploadUrl({
      key,
      contentType,
      expiresInSeconds: 900, // 15 mins
    });

    return res.json({
      success: true,
      data: {
        uploadUrl: presigned.uploadUrl,
        key: presigned.key,
        storage: presigned.storage,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to generate presigned URL";
    return res.status(500).json({
      error: {
        code: "PRESIGNED_URL_ERROR",
        message: msg,
        details: null,
      },
    });
  }
});

/**
 * POST /api/client/projects/ai/assist
 * Real-time Nexum AI Assistant actions (Improve Overview, Suggest Skills)
 */
router.post("/projects/ai/assist", async (req: Request, res: Response) => {
  try {
    const parseRes = assistSchema.safeParse(req.body);
    if (!parseRes.success) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid assistant payload",
          details: parseRes.error.format(),
        },
      });
    }

    const { action, title, overview, category, existingSkills, existingRequirements } = parseRes.data;

    if (action === "IMPROVE_OVERVIEW") {
      const enriched = await openSourceAiService.improveOverview({ title, overview, category });
      return res.json({ success: true, data: { improvedOverview: stripMarkdownStars(enriched) } });
    }

    if (action === "SUGGEST_SKILLS") {
      const suggested = await openSourceAiService.suggestSkills({ title, overview, category, existingSkills });
      return res.json({ success: true, data: { suggestedSkills: suggested } });
    }

    if (action === "REFINE_REQUIREMENTS" || action === "GENERATE_REQUIREMENTS") {
      const result = await openSourceAiService.refineRequirements({
        title,
        overview,
        category,
        existingRequirements,
      });
      return res.json({ success: true, data: result });
    }

    if (action === "EVALUATE_ADDON_OR_SCOPE") {
      const currentList = Array.isArray(req.body.milestones) ? req.body.milestones : [];
      const currentBudget = parseFloat(req.body.budgetAmount || "0") || 0;
      const currentTimeline = req.body.timelineDuration || "< 1 month";
      const addonText = req.body.addonDescription || "Additional Scope Feature";

      const formattedMilestones = currentList.map((m: any, idx: number) => ({
        id: `ms_${idx + 1}`,
        title: m.title || `Milestone ${idx + 1}`,
        amountCents: Math.round((parseFloat(m.amount) || 1000) * 100),
        workStatus: "UPCOMING",
        dueDate: null,
      }));

      const evaluation = await geminiService.evaluateScopeAddon({
        projectTitle: title || "Project Deliverable",
        projectDescription: overview || "Full-stack application deliverable",
        currentMilestones: formattedMilestones,
        addonDescription: addonText,
        requestedByRole: "CLIENT",
      });

      const addonPrice = Math.round(evaluation.suggestedPriceCents / 100);
      const addonDays = evaluation.suggestedTimelineDays;

      const newMilestone = {
        title: evaluation.targetMilestoneTitle,
        amount: String(addonPrice),
        days: String(addonDays),
      };

      const updatedMilestones = [...currentList, newMilestone];
      const newBudget = currentBudget + addonPrice;

      // Calculate total milestone days
      const totalDays = updatedMilestones.reduce((acc, m) => acc + (parseInt(m.days, 10) || 14), 0);
      let updatedTimeline = currentTimeline;
      if (totalDays > 180) updatedTimeline = "6+ months";
      else if (totalDays > 60) updatedTimeline = "3 - 6 months";
      else if (totalDays > 30) updatedTimeline = "1 - 2 months";
      else updatedTimeline = "< 1 month";

      const explanation = `Adjusted by Gemini AI: Added scope '${evaluation.targetMilestoneTitle}' (+${addonDays} days, +$${addonPrice}). Timeline auto-extended to ${totalDays} days (${updatedTimeline}) due to: ${evaluation.justification}`;

      return res.json({
        success: true,
        data: {
          addonEvaluation: evaluation,
          addedMilestone: newMilestone,
          updatedMilestones,
          adjustedBudget: String(newBudget),
          adjustedTimeline: updatedTimeline,
          totalMilestoneDays: totalDays,
          timelineDeltaDays: addonDays,
          budgetDeltaDollars: addonPrice,
          explanation,
        },
      });
    }

    if (action === "AUTO_SYNC_SCHEDULE") {
      const currentList = Array.isArray(req.body.milestones) ? req.body.milestones : [];
      const currentBudget = parseFloat(req.body.budgetAmount || "0") || 0;
      const currentTimeline = req.body.timelineDuration || "1 - 2 months";

      // Target days mapping
      let targetDays = 60;
      if (currentTimeline.includes("3 - 6")) targetDays = 90;
      else if (currentTimeline.includes("6+")) targetDays = 180;
      else if (currentTimeline.includes("< 1")) targetDays = 30;

      const count = Math.max(currentList.length, 1);
      const daysPerMilestone = Math.max(Math.round(targetDays / count), 7);
      const amountPerMilestone = Math.max(Math.round(currentBudget / count), 100);

      const balancedMilestones = currentList.map((m: any, idx: number) => {
        // distribute remainder into last milestone so sum matches exactly
        const isLast = idx === count - 1;
        const assignedAmount = isLast
          ? currentBudget - amountPerMilestone * (count - 1)
          : amountPerMilestone;
        const assignedDays = isLast
          ? targetDays - daysPerMilestone * (count - 1)
          : daysPerMilestone;

        return {
          ...m,
          amount: String(Math.max(assignedAmount, 50)),
          days: String(Math.max(assignedDays, 7)),
        };
      });

      const explanation = `Adjusted by Gemini AI: Synchronized ${count} milestones to equal total budget ($${currentBudget}) and evenly distributed schedule across ${targetDays} days (${currentTimeline}).`;

      return res.json({
        success: true,
        data: {
          updatedMilestones: balancedMilestones,
          adjustedBudget: String(currentBudget),
          adjustedTimeline: currentTimeline,
          totalMilestoneDays: targetDays,
          explanation,
        },
      });
    }

    return res.status(400).json({
      error: {
        code: "UNSUPPORTED_ACTION",
        message: `Action ${action} is not supported.`,
        details: null,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Assistant request failed";
    return res.status(500).json({
      error: {
        code: "AI_ASSIST_FAILED",
        message: msg,
        details: null,
      },
    });
  }
});

export default router;

