import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { env } from "./env.js";

const isS3Configured = Boolean(
  env.AWS_ENDPOINT_URL_S3 &&
  env.AWS_ACCESS_KEY_ID &&
  env.AWS_SECRET_ACCESS_KEY
);

export const s3Client = isS3Configured
  ? new S3Client({
      endpoint: env.AWS_ENDPOINT_URL_S3,
      region: env.AWS_REGION || "ap-southeast-1",
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY || "",
      },
      forcePathStyle: true,
    })
  : null;

export const S3_BUCKET = env.AWS_S3_BUCKET || "nexum";

export interface StorageUploadResult {
  url: string;
  key: string;
  storage: "s3_object_storage" | "local_disk";
  size: number;
}

/**
 * Uploads visual proof screenshot artifact:
 * - Production: S3 Object Storage (Cloudflare R2 / AWS S3 / Neon Object Storage)
 * - Development: Local file storage in public/uploads/visual-proofs
 */
export async function uploadVisualProofArtifact(params: {
  buffer: Buffer;
  fileName: string;
  contentType: string;
}): Promise<StorageUploadResult> {
  const { buffer, fileName, contentType } = params;
  const key = `visual-proofs/${fileName}`;

  // 1. Production Object Storage (S3 / R2 / Neon)
  if (s3Client) {
    try {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        })
      );

      return {
        url: `/api/storage/${key}`,
        key,
        storage: "s3_object_storage",
        size: buffer.length,
      };
    } catch (err) {
      console.warn("[Storage] S3 Object Storage upload failed, falling back to local file storage:", err);
    }
  }

  // 2. Local File Storage Fallback
  const localDir = getLocalUploadDir("visual-proofs");
  const filePath = path.join(localDir, fileName);
  fs.writeFileSync(filePath, buffer);

  return {
    url: `/uploads/visual-proofs/${fileName}`,
    key,
    storage: "local_disk",
    size: buffer.length,
  };
}

function getLocalUploadDir(folder: string): string {
  const cwd = process.cwd();
  let base = path.join(cwd, "frontend", "public", "uploads", folder);
  if (!fs.existsSync(base)) {
    if (fs.existsSync(path.join(cwd, "public", "uploads"))) {
      base = path.join(cwd, "public", "uploads", folder);
    }
  }
  if (!fs.existsSync(base)) {
    try {
      fs.mkdirSync(base, { recursive: true });
    } catch {}
  }
  return base;
}

/**
 * Generate a presigned S3 upload URL for direct client-to-storage uploads.
 * If S3 is not configured, provides a direct endpoint path.
 */
export async function generatePresignedUploadUrl(params: {
  key: string;
  contentType: string;
  expiresInSeconds?: number;
}): Promise<{ uploadUrl: string; key: string; storage: "s3_presigned" | "direct_endpoint" }> {
  const { key, contentType, expiresInSeconds = 900 } = params;

  if (s3Client) {
    try {
      const command = new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        ContentType: contentType,
      });
      const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
      return { uploadUrl, key, storage: "s3_presigned" };
    } catch (err) {
      console.warn("[Storage] Failed to generate presigned S3 URL:", err);
    }
  }

  return {
    uploadUrl: `/api/client/projects/ai/extract-doc`,
    key,
    storage: "direct_endpoint",
  };
}

/**
 * Uploads a client project specification/PRD document artifact:
 * - Production: S3 Object Storage (Cloudflare R2 / AWS S3 / Neon Object Storage)
 * - Development: Local file storage in public/uploads/project-documents
 */
export async function uploadProjectDocumentArtifact(params: {
  buffer: Buffer;
  fileName: string;
  contentType: string;
}): Promise<StorageUploadResult> {
  const { buffer, fileName, contentType } = params;
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const randomSuffix = crypto.randomUUID().slice(0, 8);
  const key = `project-documents/${Date.now()}-${randomSuffix}-${sanitized}`;

  // 1. Production Object Storage (S3 / R2 / Neon)
  if (s3Client) {
    try {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        })
      );

      return {
        url: `/api/storage/${key}`,
        key,
        storage: "s3_object_storage",
        size: buffer.length,
      };
    } catch (err) {
      console.warn("[Storage] S3 Object Storage upload failed for project document, falling back to local disk:", err);
    }
  }

  // 2. Local File Storage Fallback
  const localDir = getLocalUploadDir("project-documents");
  const filePath = path.join(localDir, `${Date.now()}-${randomSuffix}-${sanitized}`);
  fs.writeFileSync(filePath, buffer);

  return {
    url: `/uploads/project-documents/${path.basename(filePath)}`,
    key,
    storage: "local_disk",
    size: buffer.length,
  };
}

