import { Router, Request, Response, NextFunction } from "express";
import path from "path";
import multer from "multer";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "../../prisma.js";
import { requireAuth, requireRole, requireOnboarded } from "../../middleware/auth.js";
import { Role, FilePurpose, ResumeVisibility } from "@prisma/client";
import {
  ValidationError,
  NotFoundError,
} from "../../lib/errors.js";
import { appendAuditEvent } from "../../lib/audit.js";
import {
  defaultStorage,
  sanitizeAndProcessImage,
  isPdfBuffer,
  RESUME_SIZE_LIMIT,
  UnsupportedMediaTypeError,
  PayloadTooLargeError,
} from "../../lib/files.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB memory limit before validation
});

// Router for freelancer endpoints: mounted at /api/freelancer
export const freelancerFilesRouter = Router();

// Router for file streaming endpoints: mounted at /api/files
export const publicFilesRouter = Router();

// Router for public freelancer access: mounted at /api/public/freelancers
export const publicFreelancersRouter = Router();

// ---------------------------------------------------------------------------
// 1. POST /api/freelancer/files - Upload photo, cover, or portfolio image
// ---------------------------------------------------------------------------
freelancerFilesRouter.post(
  "/files",
  requireAuth,
  requireRole(Role.FREELANCER),
  requireOnboarded,
  upload.single("file"),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    let savedStorageKey: string | null = null;
    try {
      if (!req.file || !req.file.buffer) {
        throw new ValidationError("An image file is required");
      }

      const purposeRaw = req.body.purpose;
      const validPurposes = ["PROFILE_PHOTO", "PROFILE_COVER", "PORTFOLIO_IMAGE", "CHAT_ATTACHMENT", "PROJECT_FILE", "DELIVERABLE", "PROPOSAL_ATTACHMENT"];
      if (!purposeRaw || !validPurposes.includes(purposeRaw)) {
        throw new ValidationError("Purpose must be a valid FilePurpose");
      }
      const purpose = purposeRaw as FilePurpose;

      const isProfileImage = ["PROFILE_PHOTO", "PROFILE_COVER", "PORTFOLIO_IMAGE"].includes(purpose);
      let processedBuffer: Buffer;
      let finalMime: string;
      let finalSizeBytes: number;
      let finalSha256: string;
      let storageKey: string;

      if (isProfileImage) {
        // 1. Validate magic bytes, auto-orient, re-encode and strip EXIF
        const processed = await sanitizeAndProcessImage(req.file.buffer, purpose);
        storageKey = processed.storageKey;
        savedStorageKey = storageKey;
        processedBuffer = processed.sanitizedBuffer;
        finalMime = processed.mime;
        finalSizeBytes = processed.sizeBytes;
        finalSha256 = processed.sha256;
      } else {
        // General attachment / project file security check
        const ext = path.extname(req.file.originalname).toLowerCase();
        const mime = req.file.mimetype.toLowerCase();

        const BLOCKED_EXTENSIONS = [".exe", ".bat", ".cmd", ".sh", ".com", ".msi", ".dll", ".bin", ".js"];
        const BLOCKED_MIMES = [
          "application/x-msdownload",
          "application/x-sh",
          "application/x-executable",
          "application/javascript",
          "text/javascript",
          "application/x-msdos-program",
          "application/x-bat",
        ];

        if (BLOCKED_EXTENSIONS.includes(ext) || BLOCKED_MIMES.includes(mime)) {
          throw new UnsupportedMediaTypeError(`File type '${mime}' or extension '${ext}' is not permitted`);
        }

        const ALLOWED_MIMES = [
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/gif",
          "application/pdf",
          "text/plain",
          "text/markdown",
          "text/csv",
          "application/json",
          "application/zip",
          "application/x-zip-compressed",
          "application/octet-stream",
        ];

        if (!ALLOWED_MIMES.includes(mime)) {
          throw new UnsupportedMediaTypeError(`Unsupported media type: ${mime}`);
        }

        processedBuffer = req.file.buffer;
        finalMime = mime;
        finalSizeBytes = processedBuffer.length;
        finalSha256 = crypto.createHash("sha256").update(processedBuffer).digest("hex");
        const safeExt = ext || ".bin";
        storageKey = `uploads/files/${crypto.randomUUID()}${safeExt}`;
        savedStorageKey = storageKey;
      }

      // 2. Persist to storage
      await defaultStorage.save(storageKey, processedBuffer);

      // 3. Persist file metadata to database
      const user = req.user!;
      const fileRecord = await prisma.$transaction(async (tx) => {
        const file = await tx.file.create({
          data: {
            ownerId: user.id,
            purpose,
            storageKey,
            originalName: req.file!.originalname,
            mime: finalMime,
            sizeBytes: finalSizeBytes,
            sha256: finalSha256,
          },
        });

        await appendAuditEvent(
          {
            actorId: user.id,
            action: "FILE_UPLOADED",
            objectType: "FILE",
            objectId: file.id,
            metadata: { purpose, sizeBytes: finalSizeBytes, mime: finalMime, sha256: finalSha256 },
          },
          tx
        );

        return file;
      });

      res.status(201).json({
        success: true,
        file: {
          id: fileRecord.id,
          originalName: fileRecord.originalName,
          sizeBytes: fileRecord.sizeBytes,
          mime: fileRecord.mime,
          sha256: fileRecord.sha256,
        },
      });
    } catch (err) {
      // Cleanup orphan file on storage if DB transaction failed
      if (savedStorageKey) {
        await defaultStorage.delete(savedStorageKey).catch(() => {});
      }
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// 2. GET /api/files/:id & /api/freelancer/files/:id - Authorized file streaming / download
// ---------------------------------------------------------------------------
export async function streamFileHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const file = await prisma.file.findUnique({
      where: { id },
      include: {
        photoProfiles: { select: { searchVisibility: true } },
        coverProfiles: { select: { searchVisibility: true } },
        portfolioProjects: { select: { id: true } },
      },
    });

    if (!file) {
      throw new NotFoundError("File", id);
    }

    // Check access permission:
    // A. Owner access
    const authenticatedUserId = req.user?.id;
    const isOwner = Boolean(authenticatedUserId && authenticatedUserId === file.ownerId);

    // B. Public access:
    // - PORTFOLIO_IMAGE is always publicly accessible
    // - PROFILE_PHOTO and PROFILE_COVER are publicly accessible if the profile has searchVisibility = VISIBLE
    let isPubliclyAccessible = false;
    if (file.purpose === "PORTFOLIO_IMAGE") {
      isPubliclyAccessible = true;
    } else if (file.purpose === "PROFILE_PHOTO") {
      const isVisible = file.photoProfiles.some((p) => p.searchVisibility === "VISIBLE");
      isPubliclyAccessible = isVisible;
    } else if (file.purpose === "PROFILE_COVER") {
      const isVisible = file.coverProfiles.some((p) => p.searchVisibility === "VISIBLE");
      isPubliclyAccessible = isVisible;
    } else if (file.purpose === "PROPOSAL_ATTACHMENT" || file.purpose === "PROJECT_FILE") {
      isPubliclyAccessible = true;
    }

    if (!isOwner && !isPubliclyAccessible) {
      // Return 404 to prevent resource enumeration
      throw new NotFoundError("File", id);
    }

    const fileStream = await defaultStorage.getStream(file.storageKey);
    const isDownload = req.query.download === "true" || req.query.download === "1";
    const disposition = isDownload ? "attachment" : "inline";
    const safeFilename = file.originalName.replace(/["\r\n]/g, "");

    res.setHeader("Content-Type", file.mime || "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `${disposition}; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(file.originalName)}`
    );
    res.setHeader("Content-Length", file.sizeBytes);
    res.setHeader("Cache-Control", "public, max-age=86400"); // 1 day
    (fileStream as any).pipe(res);
  } catch (err) {
    next(err);
  }
}

publicFilesRouter.get("/:id", streamFileHandler);
freelancerFilesRouter.get("/files/:id", streamFileHandler);

// ---------------------------------------------------------------------------
// 3. GET /api/freelancer/resume - Get active resume metadata
// ---------------------------------------------------------------------------
freelancerFilesRouter.get(
  "/resume",
  requireAuth,
  requireRole(Role.FREELANCER),
  requireOnboarded,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user!;
      const resume = await prisma.resumeFile.findFirst({
        where: { userId: user.id, status: "ACTIVE" },
        orderBy: { uploadedAt: "desc" },
      });

      if (!resume) {
        res.json({ success: true, resume: null });
        return;
      }

      res.json({
        success: true,
        resume: {
          id: resume.id,
          originalName: resume.originalName,
          mimeType: resume.mimeType,
          sizeBytes: resume.sizeBytes,
          visibility: resume.visibility,
          uploadedAt: resume.uploadedAt,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// 5. GET /api/freelancer/resume/download - Authenticated owner download
// ---------------------------------------------------------------------------
freelancerFilesRouter.get(
  "/resume/download",
  requireAuth,
  requireRole(Role.FREELANCER),
  requireOnboarded,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user!;
      const resume = await prisma.resumeFile.findFirst({
        where: { userId: user.id, status: "ACTIVE" },
        orderBy: { uploadedAt: "desc" },
      });

      if (!resume) {
        throw new NotFoundError("ResumeFile");
      }

      const fileStream = await defaultStorage.getStream(resume.storageKey);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Length", resume.sizeBytes);
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(resume.originalName)}"`);
      (fileStream as any).pipe(res);
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// 6. PATCH /api/freelancer/resume/visibility - Update visibility
// ---------------------------------------------------------------------------
const visibilitySchema = z.object({
  visibility: z.enum(["PRIVATE", "PROPOSAL_CLIENTS", "PUBLIC"]),
});

freelancerFilesRouter.patch(
  "/resume/visibility",
  requireAuth,
  requireRole(Role.FREELANCER),
  requireOnboarded,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = visibilitySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError("Visibility must be PRIVATE, PROPOSAL_CLIENTS, or PUBLIC");
      }

      const user = req.user!;
      const current = await prisma.resumeFile.findFirst({
        where: { userId: user.id, status: "ACTIVE" },
      });

      if (!current) {
        throw new NotFoundError("ResumeFile");
      }

      const updated = await prisma.$transaction(async (tx) => {
        const resFile = await tx.resumeFile.update({
          where: { id: current.id },
          data: { visibility: parsed.data.visibility as ResumeVisibility },
        });

        await appendAuditEvent(
          {
            actorId: user.id,
            action: "RESUME_VISIBILITY_CHANGED",
            objectType: "RESUME_FILE",
            objectId: resFile.id,
            metadata: {
              previousVisibility: current.visibility,
              newVisibility: parsed.data.visibility,
            },
          },
          tx
        );

        return resFile;
      });

      res.json({
        success: true,
        visibility: updated.visibility,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// 7. GET /api/public/freelancers/:userId/resume - Public resume download
// ---------------------------------------------------------------------------
publicFreelancersRouter.get(
  "/:userId/resume",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const resume = await prisma.resumeFile.findFirst({
        where: { userId, status: "ACTIVE" },
      });

      if (!resume) {
        throw new NotFoundError("ResumeFile", userId);
      }

      // Check authorization:
      // Allow if PUBLIC. If PROPOSAL_CLIENTS, check if authenticated client has received a proposal
      let authorized = resume.visibility === "PUBLIC";

      if (!authorized && resume.visibility === "PROPOSAL_CLIENTS") {
        const viewerId = req.user?.id;
        if (viewerId) {
          if (viewerId === userId) {
            authorized = true;
          } else {
            // Check if there is an active project or proposal between this client and freelancer
            const proposal = await prisma.proposalVersion.findFirst({
              where: {
                freelancerId: userId,
                project: { clientId: viewerId },
              },
            });
            if (proposal) authorized = true;
          }
        }
      }

      if (!authorized) {
        // Return 404 to avoid enumeration
        throw new NotFoundError("ResumeFile", userId);
      }

      const fileStream = await defaultStorage.getStream(resume.storageKey);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Length", resume.sizeBytes);
      res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(resume.originalName)}"`);
      (fileStream as any).pipe(res);
    } catch (err) {
      next(err);
    }
  }
);
