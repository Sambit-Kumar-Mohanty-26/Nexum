import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "../../prisma.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { ValidationError, NotFoundError, AppError } from "../../lib/errors.js";
import { appendAuditEvent } from "../../lib/audit.js";
import { validatePdfMagicBytes } from "../../jobs/resumeExtractor.js";
import { Role } from "@prisma/client";

const router = Router();

// Ensure upload directory exists
const UPLOAD_DIR = path.resolve(process.cwd(), "uploads", "resumes");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Configure Multer for disk storage with 5MB limit
const storage = multer.diskStorage({
  destination: (_req: any, _file: any, cb: any) => cb(null, UPLOAD_DIR),
  filename: (_req: any, file: any, cb: any) => {
    const ext = path.extname(file.originalname);
    const uniqueKey = `${Date.now()}_${crypto.randomBytes(8).toString("hex")}${ext}`;
    cb(null, uniqueKey);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
});

// Zod schema for completing onboarding
const completeOnboardingSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  freelancerType: z.enum([
    "STUDENT_BEGINNER",
    "FREELANCER",
    "EXPERIENCED_PROFESSIONAL",
    "AGENCY",
  ]),
  skills: z
    .array(z.string())
    .min(1, "At least one skill is required"),
  experiences: z
    .array(
      z.object({
        company: z.string().optional(),
        role: z.string().optional(),
        startMonth: z.string().optional(),
        endMonth: z.string().optional(),
        isCurrent: z.boolean().optional(),
        description: z.string().optional(),
      })
    )
    .optional()
    .default([]),
  resumeId: z.string().optional(),
});

// All routes here require authenticated FREELANCER
router.use(requireAuth);
router.use(requireRole(Role.FREELANCER));

// GET /api/freelancer/onboarding - Current onboarding draft state
router.get("/", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user!;
    const profile = await prisma.freelancerProfile.findUnique({
      where: { userId: user.id },
    });

    const activeResume = await prisma.resumeFile.findFirst({
      where: { userId: user.id, status: "ACTIVE" },
      include: { extractions: { orderBy: { createdAt: "desc" }, take: 1 } },
    });

    res.json({
      success: true,
      data: {
        userId: user.id,
        email: user.email,
        name: user.name,
        onboardingStatus: profile?.onboardingStatus || "NOT_STARTED",
        title: profile?.title,
        bio: profile?.bio,
        skills: profile?.skills || [],
        freelancerType: profile?.profileType || "FREELANCER",
        resume: activeResume
          ? {
              id: activeResume.id,
              originalName: activeResume.originalName,
              sizeBytes: activeResume.sizeBytes,
              extractionStatus: activeResume.extractions[0]?.status,
              extractedJson: activeResume.extractions[0]?.extractedJson,
            }
          : null,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/freelancer/resume - Upload PDF resume and trigger async extraction
router.post(
  "/resume",
  upload.single("file"),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const file = req.file;
      if (!file) {
        throw new ValidationError("No resume file uploaded. Field name must be 'file'");
      }

      // 1. Validate PDF magic bytes (%PDF-)
      const fileBuffer = fs.readFileSync(file.path);
      if (!validatePdfMagicBytes(fileBuffer)) {
        // Clean up invalid file
        fs.unlinkSync(file.path);
        res.status(415).json({
          error: {
            code: "UNSUPPORTED_MEDIA_TYPE",
            message: "File is not a valid PDF document (magic bytes check failed)",
            details: {},
          },
        });
        return;
      }

      const user = req.user!;

      // 2. Mark any previously uploaded resumes as REPLACED
      await prisma.resumeFile.updateMany({
        where: { userId: user.id, status: "ACTIVE" },
        data: { status: "REPLACED" },
      });

      // 3. Compute SHA-256 of uploaded file
      const sha256 = crypto.createHash("sha256").update(fileBuffer).digest("hex");

      // 4. Save ResumeFile record
      const resumeFile = await prisma.resumeFile.create({
        data: {
          userId: user.id,
          storageKey: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype || "application/pdf",
          sizeBytes: file.size,
          sha256,
          status: "ACTIVE",
        },
      });

      // 5. Create ResumeExtraction record
      const extraction = await prisma.resumeExtraction.create({
        data: {
          resumeId: resumeFile.id,
          status: "PENDING",
        },
      });

      // 6. Create background Job record for asynchronous processing by persistent worker
      const job = await prisma.job.create({
        data: {
          type: "EXTRACT_RESUME",
          payload: {
            resumeId: resumeFile.id,
            extractionId: extraction.id,
            filePath: file.path,
            originalName: file.originalname,
          },
          status: "PENDING",
        },
      });

      // 7. Append audit event
      await appendAuditEvent({
        actorId: user.id,
        action: "RESUME_UPLOADED",
        objectType: "RESUME_FILE",
        objectId: resumeFile.id,
        metadata: {
          originalName: file.originalname,
          sizeBytes: file.size,
          mimeType: file.mimetype,
        },
      });

      res.status(202).json({
        success: true,
        resumeId: resumeFile.id,
        extractionId: extraction.id,
        jobId: job.id,
        status: "PENDING",
        message: "Resume uploaded successfully. Extraction queued in background worker.",
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/freelancer/resume/extractions/:id - Poll extraction results
router.get(
  "/resume/extractions/:id",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const extraction = await prisma.resumeExtraction.findUnique({
        where: { id: req.params.id },
        include: { resume: true },
      });

      if (!extraction) {
        throw new NotFoundError("ResumeExtraction", req.params.id);
      }

      // Check ownership
      if (extraction.resume.userId !== req.user!.id) {
        throw new AppError("FORBIDDEN", "Access denied to extraction record", 403);
      }

      res.json({
        id: extraction.id,
        status: extraction.status,
        fields: extraction.extractedJson,
        failureReason: extraction.failureReason,
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/freelancer/onboarding/complete - Complete onboarding & save confirmed profile
router.post(
  "/onboarding/complete",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = completeOnboardingSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError("Invalid onboarding completion payload", {
          issues: parsed.error.issues,
        });
      }

      const { fullName, freelancerType, skills, experiences, resumeId } = parsed.data;
      const user = req.user!;

      // Update user full name
      await prisma.user.update({
        where: { id: user.id },
        data: { name: fullName },
      });

      // Upsert freelancer profile with confirmed details
      const profile = await prisma.freelancerProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          title: `${skills[0] || "Software"} Specialist`,
          bio: `Specializing in ${skills.slice(0, 3).join(", ")}.`,
          skills,
          profileType: freelancerType,
          workExperience: JSON.stringify(experiences),
          onboardingStatus: "COMPLETE",
          availability: "AVAILABLE",
        },
        update: {
          title: `${skills[0] || "Software"} Specialist`,
          skills,
          profileType: freelancerType,
          workExperience: JSON.stringify(experiences),
          onboardingStatus: "COMPLETE",
        },
      });

      // Record audit event
      await appendAuditEvent({
        actorId: user.id,
        action: "FREELANCER_ONBOARDING_COMPLETED",
        objectType: "FREELANCER_PROFILE",
        objectId: profile.id,
        metadata: {
          freelancerType,
          skillsCount: skills.length,
          hasResume: Boolean(resumeId),
        },
      });

      res.status(200).json({
        success: true,
        message: "Freelancer onboarding completed successfully",
        profile: {
          userId: user.id,
          fullName,
          freelancerType,
          skills,
          onboardingStatus: "COMPLETE",
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;

