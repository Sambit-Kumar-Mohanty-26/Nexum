import { Router, Request, Response } from "express";
import multer from "multer";
import { z } from "zod";
import { openSourceAiService } from "../../services/openSourceAiService.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

const assistSchema = z.object({
  action: z.enum(["IMPROVE_OVERVIEW", "SUGGEST_SKILLS", "GENERATE_REQUIREMENTS", "REFINE_REQUIREMENTS"]),
  title: z.string().optional(),
  overview: z.string().optional(),
  category: z.string().optional(),
  existingSkills: z.array(z.string()).optional(),
  existingRequirements: z.string().optional(),
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
        const isPdf = mime.includes("pdf") || req.file.originalname.toLowerCase().endsWith(".pdf");

        if (isPdf) {
          try {
            const pdfModule = await import("pdf-parse");
            const pdfParseFn: any = (pdfModule as any).default || pdfModule;
            const parsed = typeof pdfParseFn === "function"
              ? await pdfParseFn(req.file.buffer)
              : typeof pdfParseFn?.default === "function"
                ? await pdfParseFn.default(req.file.buffer)
                : null;

            documentText = parsed?.text || req.file.buffer.toString("utf-8");
          } catch (pdfErr) {
            console.warn("[ProjectAI] PDF parse error, falling back to raw buffer string:", pdfErr);
            documentText = req.file.buffer.toString("utf-8");
          }
        } else {
          documentText = req.file.buffer.toString("utf-8");
        }
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

      const extracted = await openSourceAiService.extractProjectFromDocument(documentText, fileName);
      return res.json({ success: true, data: extracted });
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
      return res.json({ success: true, data: { improvedOverview: enriched } });
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

