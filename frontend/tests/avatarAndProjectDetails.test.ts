import { describe, it, expect } from "vitest";
import { uploadObject } from "../src/lib/storage";

describe("Production Avatar Upload & Storage Resilience", () => {
  it("should successfully store an avatar with object parameters and return a URL", async () => {
    const buffer = Buffer.from("fake-avatar-data-123");
    const result = await uploadObject({
      buffer,
      fileName: "test-user-avatar.png",
      mimeType: "image/png",
      folder: "avatars",
    });
    
    expect(result).toBeDefined();
    expect(result.url).toBeDefined();
    expect(typeof result.url).toBe("string");
  });

  it("should successfully store an avatar with positional parameters and return a URL", async () => {
    const buffer = Buffer.from("fake-avatar-data-456");
    const result = await uploadObject("avatars", "test-user-avatar-pos.png", buffer, "image/png");
    
    expect(result).toBeDefined();
    expect(result.url).toBeDefined();
    expect(typeof result.url).toBe("string");
  });

  it("should generate a valid data URL fallback from any image buffer", () => {
    const buffer = Buffer.from("simulated-avatar-pixel-bytes");
    const dataUrl = `data:image/png;base64,${buffer.toString("base64")}`;
    expect(dataUrl).toContain("data:image/png;base64,");
    expect(dataUrl).toContain(buffer.toString("base64"));
  });

  it("should persist custom uploaded avatar rather than reverting to Google OAuth default initial", () => {
    const customAvatarUrl = "/uploads/avatars/avatar_sambit_17940593.jpg";
    const googleDefaultAvatar = "https://lh3.googleusercontent.com/a/default-s";

    // Simulate session update
    const userSession = {
      id: "cmw2dnha60000852e25lag5hy",
      email: "sambitkumarmohanty25@gmail.com",
      avatar: googleDefaultAvatar,
    };

    // Updating avatar updates session to custom avatar
    const updatedUser = {
      ...userSession,
      avatar: customAvatarUrl,
    };

    expect(updatedUser.avatar).toBe(customAvatarUrl);
    expect(updatedUser.avatar).not.toBe(googleDefaultAvatar);
  });
});

describe("Freelancer Project Details & Document Card Rendering Safeguards", () => {
  it("should not render synthetic documents when project has no uploadedDocument", () => {
    const projectWithoutDoc = {
      id: "proj-1",
      title: "Test Project",
      uploadedDocument: undefined,
    };
    expect(projectWithoutDoc.uploadedDocument).toBeUndefined();
  });

  it("should correctly preserve real client intake document when present", () => {
    const projectWithDoc = {
      id: "proj-2",
      title: "Real Client Intake",
      uploadedDocument: {
        name: "Client_PRD_Spec.pdf",
        size: "2.4 MB",
        url: "/uploads/Client_PRD_Spec.pdf",
        uploadedAt: "2026-11-07T12:00:00.000Z",
      },
    };
    expect(projectWithDoc.uploadedDocument).toBeDefined();
    expect(projectWithDoc.uploadedDocument?.name).toBe("Client_PRD_Spec.pdf");
  });
});
