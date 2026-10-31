import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, updateSessionAvatar } from "@/lib/auth";
import { uploadObject } from "@/lib/storage";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB limit

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const contentType = req.headers.get("content-type") || "";
    let fileBuffer: Buffer | null = null;
    let mimeType = "image/jpeg";
    let ext = "jpg";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json({ success: false, error: "No image file provided" }, { status: 400 });
      }

      if (file.size > MAX_FILE_SIZE) {
        const actualMb = (file.size / (1024 * 1024)).toFixed(2);
        return NextResponse.json(
          { success: false, error: `File size exceeds 2MB limit (selected: ${actualMb}MB)` },
          { status: 400 }
        );
      }

      mimeType = file.type || "image/jpeg";
      if (!mimeType.startsWith("image/")) {
        return NextResponse.json(
          { success: false, error: "Invalid file type. Only images are allowed." },
          { status: 400 }
        );
      }

      if (mimeType.includes("png")) ext = "png";
      else if (mimeType.includes("webp")) ext = "webp";
      else if (mimeType.includes("gif")) ext = "gif";
      else ext = "jpg";

      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    } else {
      // Handle JSON base64 payload
      const body = await req.json();
      const { avatar } = body;

      if (!avatar || typeof avatar !== "string") {
        return NextResponse.json({ success: false, error: "Missing avatar data" }, { status: 400 });
      }

      if (avatar.startsWith("data:image/")) {
        const matches = avatar.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
          return NextResponse.json({ success: false, error: "Malformed base64 image data" }, { status: 400 });
        }
        const mimeSub = matches[1].toLowerCase();
        mimeType = `image/${mimeSub}`;
        ext = mimeSub === "jpeg" ? "jpg" : mimeSub;
        fileBuffer = Buffer.from(matches[2], "base64");

        if (fileBuffer.length > MAX_FILE_SIZE) {
          const actualMb = (fileBuffer.length / (1024 * 1024)).toFixed(2);
          return NextResponse.json(
            { success: false, error: `File size exceeds 2MB limit (selected: ${actualMb}MB)` },
            { status: 400 }
          );
        }
      } else if (
        avatar.startsWith("http://") ||
        avatar.startsWith("https://") ||
        avatar.startsWith("/api/storage/") ||
        avatar.startsWith("/uploads/")
      ) {
        // Direct hosted URL
        const updatedUser = await updateSessionAvatar(avatar);
        return NextResponse.json({ success: true, avatarUrl: avatar, user: updatedUser });
      } else {
        return NextResponse.json({ success: false, error: "Unsupported avatar format" }, { status: 400 });
      }
    }

    if (!fileBuffer) {
      return NextResponse.json({ success: false, error: "Failed to process image buffer" }, { status: 400 });
    }

    // Upload to Neon S3 Object Storage (or local disk in dev)
    const sanitizedUserId = (user.id || "user").replace(/[^a-zA-Z0-9_-]/g, "");
    const fileName = `avatar_${sanitizedUserId}_${Date.now()}.${ext}`;

    const uploadResult = await uploadObject({
      buffer: fileBuffer,
      fileName,
      mimeType,
      folder: "avatars",
    });

    // 1. Update HMAC session cookie
    const updatedUser = await updateSessionAvatar(uploadResult.url);

    // 2. Persist avatar to persistent database via backend
    const backendUrl = process.env.BACKEND_URL || "http://localhost:4000";
    try {
      await fetch(`${backendUrl}/api/users/${user.id}/avatar`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: uploadResult.url }),
      });
    } catch (e) {
      console.warn("Backend user avatar sync non-blocking error:", e);
    }

    return NextResponse.json({
      success: true,
      avatarUrl: uploadResult.url,
      user: updatedUser,
      storage: uploadResult.storage,
      size: uploadResult.size,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to store avatar";
    console.error("Avatar storage error:", err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
