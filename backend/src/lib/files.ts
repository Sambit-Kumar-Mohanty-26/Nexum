import fs from "fs";
import path from "path";
import crypto from "crypto";
import { Readable } from "stream";
import sharp from "sharp";
import { FilePurpose } from "@prisma/client";
import { AppError } from "./errors.js";

export class UnsupportedMediaTypeError extends AppError {
  constructor(message = "Unsupported file format") {
    super("VALIDATION_ERROR", message, 415);
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(message = "File exceeds maximum permitted size") {
    super("VALIDATION_ERROR", message, 413);
  }
}

export interface FileStorageAdapter {
  save(storageKey: string, data: Buffer): Promise<void>;
  getStream(storageKey: string): Promise<NodeJS.ReadableStream>;
  delete(storageKey: string): Promise<void>;
  exists(storageKey: string): Promise<boolean>;
  getBuffer(storageKey: string): Promise<Buffer>;
}

export class LocalDiskStorageAdapter implements FileStorageAdapter {
  private baseDir: string;
  private memoryCache = new Map<string, Buffer>();

  constructor(baseDir = path.resolve(process.cwd(), "uploads")) {
    this.baseDir = baseDir;
    try {
      if (!fs.existsSync(this.baseDir)) {
        fs.mkdirSync(this.baseDir, { recursive: true });
      }
    } catch (e) {
      console.warn("Could not create local disk uploads directory (using memory fallback):", e);
    }
  }

  private resolvePath(storageKey: string): string {
    const safeKey = storageKey.replace(/^[/\\]+/, "").replace(/\.\.[/\\]/g, "");
    const directPath = path.join(this.baseDir, safeKey);
    if (fs.existsSync(directPath)) {
      return directPath;
    }
    const resumesPath = path.join(this.baseDir, "resumes", safeKey);
    if (fs.existsSync(resumesPath)) {
      return resumesPath;
    }
    return directPath;
  }

  async save(storageKey: string, data: Buffer): Promise<void> {
    try {
      const fullPath = this.resolvePath(storageKey);
      const parentDir = path.dirname(fullPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      await fs.promises.writeFile(fullPath, data);
    } catch (err) {
      console.warn(`Local disk write failed for ${storageKey}, using in-memory store:`, err);
      this.memoryCache.set(storageKey, data);
    }
  }

  async getStream(storageKey: string): Promise<NodeJS.ReadableStream> {
    if (this.memoryCache.has(storageKey)) {
      const { Readable } = await import("stream");
      return Readable.from(this.memoryCache.get(storageKey)!);
    }
    const fullPath = this.resolvePath(storageKey);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found at storage path: ${storageKey}`);
    }
    return fs.createReadStream(fullPath);
  }

  async getBuffer(storageKey: string): Promise<Buffer> {
    if (this.memoryCache.has(storageKey)) {
      return this.memoryCache.get(storageKey)!;
    }
    const fullPath = this.resolvePath(storageKey);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found at storage path: ${storageKey}`);
    }
    return await fs.promises.readFile(fullPath);
  }

  async delete(storageKey: string): Promise<void> {
    this.memoryCache.delete(storageKey);
    try {
      const fullPath = this.resolvePath(storageKey);
      if (fs.existsSync(fullPath)) {
        await fs.promises.unlink(fullPath).catch(() => {});
      }
    } catch {
      // Ignored
    }
  }

  async exists(storageKey: string): Promise<boolean> {
    if (this.memoryCache.has(storageKey)) return true;
    const fullPath = this.resolvePath(storageKey);
    return fs.existsSync(fullPath);
  }
}

export const defaultStorage = new LocalDiskStorageAdapter();

/**
 * Validates image magic bytes.
 * Returns normalized MIME type or null if invalid.
 */
export function detectImageMime(buffer: Buffer): "image/jpeg" | "image/png" | "image/webp" | null {
  if (buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  // WebP: RIFF .... WEBP
  const riff = buffer.toString("ascii", 0, 4);
  const webp = buffer.toString("ascii", 8, 12);
  if (riff === "RIFF" && webp === "WEBP") {
    return "image/webp";
  }

  return null;
}

/**
 * Validates PDF magic bytes: %PDF- (25 50 44 46 2D)
 */
export function isPdfBuffer(buffer: Buffer): boolean {
  if (buffer.length < 5) return false;
  return (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46 &&
    buffer[4] === 0x2d
  );
}

export const FILE_SIZE_LIMITS: Record<FilePurpose, number> = {
  PROFILE_PHOTO: 2 * 1024 * 1024, // 2 MB
  PROFILE_COVER: 4 * 1024 * 1024, // 4 MB
  PORTFOLIO_IMAGE: 4 * 1024 * 1024, // 4 MB
  PROPOSAL_ATTACHMENT: 10 * 1024 * 1024, // 10 MB
  DELIVERABLE: 25 * 1024 * 1024, // 25 MB
  CHAT_ATTACHMENT: 25 * 1024 * 1024, // 25 MB
  PROJECT_FILE: 25 * 1024 * 1024, // 25 MB
};

export const RESUME_SIZE_LIMIT = 5 * 1024 * 1024; // 5 MB

/**
 * Sanitizes an image buffer using Sharp:
 * 1. Validates magic bytes.
 * 2. Enforces purpose-specific file size limits.
 * 3. Auto-orients (.rotate()).
 * 4. Re-encodes to output format without calling .withMetadata(), completely stripping EXIF and GPS.
 * 5. Returns the sanitized buffer, mime, byte size, sha256 checksum, and an unpredictable storage key.
 */
export async function sanitizeAndProcessImage(
  inputBuffer: Buffer,
  purpose: FilePurpose
): Promise<{
  sanitizedBuffer: Buffer;
  mime: string;
  sizeBytes: number;
  sha256: string;
  storageKey: string;
}> {
  const maxBytes = FILE_SIZE_LIMITS[purpose] || 4 * 1024 * 1024;
  if (inputBuffer.length > maxBytes) {
    const maxMb = maxBytes / (1024 * 1024);
    throw new PayloadTooLargeError(`File size exceeds maximum permitted ${maxMb} MB for ${purpose}`);
  }

  const detectedMime = detectImageMime(inputBuffer);
  if (!detectedMime) {
    throw new UnsupportedMediaTypeError(
      "Invalid image format: only valid JPEG, PNG, or WebP files are accepted"
    );
  }

  // Sharp re-encoding pipeline
  // Auto-orients based on original orientation, then discards ALL EXIF, GPS, and IPTC headers by default
  let pipeline = sharp(inputBuffer).rotate();
  let ext = "jpg";

  if (detectedMime === "image/jpeg") {
    pipeline = pipeline.jpeg({ quality: 85 });
    ext = "jpg";
  } else if (detectedMime === "image/png") {
    pipeline = pipeline.png({ compressionLevel: 8 });
    ext = "png";
  } else if (detectedMime === "image/webp") {
    pipeline = pipeline.webp({ quality: 85 });
    ext = "webp";
  }

  const sanitizedBuffer = await pipeline.toBuffer();

  // Verify that metadata is absent
  const metadata = await sharp(sanitizedBuffer).metadata();
  if (metadata.exif || (metadata as any).gps) {
    // Failsafe strip if driver preserved headers
    const cleanBuffer = await sharp(sanitizedBuffer).toFormat("jpeg", { quality: 85 }).toBuffer();
    return {
      sanitizedBuffer: cleanBuffer,
      mime: "image/jpeg",
      sizeBytes: cleanBuffer.length,
      sha256: crypto.createHash("sha256").update(cleanBuffer).digest("hex"),
      storageKey: `files/${purpose.toLowerCase()}/${crypto.randomUUID()}.jpg`,
    };
  }

  const sha256 = crypto.createHash("sha256").update(sanitizedBuffer).digest("hex");
  const randomId = crypto.randomUUID();
  const storageKey = `files/${purpose.toLowerCase()}/${randomId}.${ext}`;

  return {
    sanitizedBuffer,
    mime: detectedMime,
    sizeBytes: sanitizedBuffer.length,
    sha256,
    storageKey,
  };
}
