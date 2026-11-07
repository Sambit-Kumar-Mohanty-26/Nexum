import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import os from "os";

interface MemoryStoredFile {
  buffer: Buffer;
  contentType: string;
  size: number;
  updatedAt: number;
}

// In-memory global store preserved within the server runtime
const globalMemoryStore = new Map<string, MemoryStoredFile>();

// Initialize S3 client for Neon Object Storage if environment variables are set
const isS3Configured = Boolean(
  process.env.AWS_ENDPOINT_URL_S3 &&
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY
);

export const s3Client = isS3Configured
  ? new S3Client({
      endpoint: process.env.AWS_ENDPOINT_URL_S3,
      region: process.env.AWS_REGION || "ap-southeast-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
      },
      forcePathStyle: true,
    })
  : null;

export const S3_BUCKET = process.env.AWS_S3_BUCKET || "nexum";

function getLocalUploadDir(folder: string): string {
  const cwd = process.cwd();
  let base = path.join(cwd, "public");
  if (!fs.existsSync(base) && fs.existsSync(path.join(cwd, "frontend", "public"))) {
    base = path.join(cwd, "frontend", "public");
  }
  const targetDir = path.join(base, "uploads", folder);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  return targetDir;
}

export interface UploadResult {
  url: string;
  key: string;
  storage: "neon_s3" | "local_disk";
  size: number;
}

/**
 * Upload an image or file buffer to Neon Object Storage (or local disk in dev)
 */
export async function uploadObject(
  paramsOrFolder:
    | {
        buffer: Buffer;
        fileName: string;
        mimeType: string;
        folder?: string;
      }
    | string,
  fileNameArg?: string,
  bufferArg?: Buffer,
  mimeTypeArg?: string
): Promise<UploadResult> {
  let buffer: Buffer;
  let fileName: string;
  let mimeType: string;
  let folder: string;

  if (typeof paramsOrFolder === "string") {
    folder = paramsOrFolder || "avatars";
    fileName = fileNameArg || `file-${Date.now()}`;
    buffer = bufferArg || Buffer.from("");
    mimeType = mimeTypeArg || "application/octet-stream";
  } else {
    buffer = paramsOrFolder.buffer || Buffer.from("");
    fileName = paramsOrFolder.fileName || `file-${Date.now()}`;
    mimeType = paramsOrFolder.mimeType || "application/octet-stream";
    folder = paramsOrFolder.folder || "avatars";
  }

  const key = `${folder}/${fileName}`;

  // 1. Retain in server memory cache
  globalMemoryStore.set(key, {
    buffer,
    contentType: mimeType,
    size: buffer.length,
    updatedAt: Date.now(),
  });

  // 2. Try uploading to Neon S3 Object Storage if configured
  if (s3Client) {
    try {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
        })
      );

      // Return proxy streaming URL so it works seamlessly with Private buckets & browser caching
      return {
        url: `/api/storage/${key}`,
        key,
        storage: "neon_s3",
        size: buffer.length,
      };
    } catch (err) {
      console.warn("Neon S3 upload failed, falling back to local storage:", err);
    }
  }

  // 3. Fallback to local disk storage
  let savedToPublic = false;
  try {
    const localDir = getLocalUploadDir(folder);
    const filePath = path.join(localDir, fileName);
    fs.writeFileSync(filePath, buffer);
    savedToPublic = true;
  } catch {
    // If public directory is read-only (serverless/container), try os.tmpdir()
    try {
      const tmpDir = path.join(os.tmpdir(), "nexum_uploads", folder);
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      fs.writeFileSync(path.join(tmpDir, fileName), buffer);
    } catch {
      // In-memory fallback is active
    }
  }

  // A stable, short URL that fits in cookies and database fields without truncating or overflowing
  const publicUrl = savedToPublic ? `/uploads/${folder}/${fileName}` : `/api/storage/${key}`;

  return {
    url: publicUrl,
    key,
    storage: "local_disk",
    size: buffer.length,
  };
}

/**
 * Download / stream an object from memory, Neon S3, local disk, or os.tmpdir
 */
export async function getObjectStream(key: string): Promise<{
  stream: ReadableStream | NodeJS.ReadableStream | Buffer;
  contentType: string;
  contentLength?: number;
} | null> {
  // 1. Check in-memory store
  const inMemory = globalMemoryStore.get(key);
  if (inMemory) {
    return {
      stream: inMemory.buffer,
      contentType: inMemory.contentType,
      contentLength: inMemory.size,
    };
  }

  // 2. Try Neon S3
  if (s3Client) {
    try {
      const res = await s3Client.send(
        new GetObjectCommand({
          Bucket: S3_BUCKET,
          Key: key,
        })
      );
      if (res.Body) {
        return {
          stream: res.Body as any,
          contentType: res.ContentType || "application/octet-stream",
          contentLength: res.ContentLength,
        };
      }
    } catch (err: unknown) {
      // Key might not exist in S3, check local disk fallback
    }
  }

  // 3. Check local public disk
  const cwd = process.cwd();
  let localPath = path.join(cwd, "public", "uploads", key);
  if (!fs.existsSync(localPath) && fs.existsSync(path.join(cwd, "frontend", "public", "uploads", key))) {
    localPath = path.join(cwd, "frontend", "public", "uploads", key);
  }

  if (fs.existsSync(localPath)) {
    const buffer = fs.readFileSync(localPath);
    const ext = path.extname(localPath).toLowerCase();
    const contentType =
      ext === ".png"
        ? "image/png"
        : ext === ".webp"
        ? "image/webp"
        : ext === ".gif"
        ? "image/gif"
        : "image/jpeg";

    return {
      stream: buffer,
      contentType,
      contentLength: buffer.length,
    };
  }

  // 4. Check os.tmpdir() fallback
  try {
    const tmpPath = path.join(os.tmpdir(), "nexum_uploads", key);
    if (fs.existsSync(tmpPath)) {
      const buffer = fs.readFileSync(tmpPath);
      const ext = path.extname(tmpPath).toLowerCase();
      const contentType =
        ext === ".png"
          ? "image/png"
          : ext === ".webp"
          ? "image/webp"
          : ext === ".gif"
          ? "image/gif"
          : "image/jpeg";

      return {
        stream: buffer,
        contentType,
        contentLength: buffer.length,
      };
    }
  } catch {
    // Ignore tmp read errors
  }

  return null;

  return null;
}

