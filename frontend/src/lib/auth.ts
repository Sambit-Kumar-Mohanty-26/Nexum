import { cookies } from "next/headers";
import { UserRole, DemoUser, DEMO_USERS, UserPresenceStatus } from "./auth-types";

export type { UserRole, DemoUser, UserPresenceStatus };
export { DEMO_USERS };

export const AUTH_COOKIE_NAME = "nexum_session";

const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  "nexum-platform-session-secret-default-key-32chars";

// Helper: base64url encoding
function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf-8");
}

// Generate HMAC-SHA256 signature using Web Crypto API
async function signPayload(data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(SESSION_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return Buffer.from(signature)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Verify HMAC-SHA256 signature
async function verifySignature(data: string, signatureBase64Url: string): Promise<boolean> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(SESSION_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const sigBuf = Buffer.from(
    signatureBase64Url.replace(/-/g, "+").replace(/_/g, "/") +
      "==".slice((2 - (signatureBase64Url.length % 4)) % 4),
    "base64"
  );
  return await crypto.subtle.verify("HMAC", key, sigBuf, enc.encode(data));
}

export interface SessionPayload {
  userId: string;
  role: UserRole;
  email: string;
  name: string;
  title: string;
  avatar: string;
  companyOrHandle: string;
  statusBadge: string;
  presenceStatus?: UserPresenceStatus;
  exp: number; // Expiry epoch seconds
}

// Create signed session token
export async function createSessionToken(user: DemoUser): Promise<string> {
  const payload: SessionPayload = {
    userId: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
    title: user.title,
    avatar: user.avatar,
    companyOrHandle: user.companyOrHandle,
    statusBadge: user.statusBadge,
    presenceStatus: user.presenceStatus || "available",
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
  };

  const payloadEncoded = base64UrlEncode(JSON.stringify(payload));
  const signature = await signPayload(payloadEncoded);
  return `${payloadEncoded}.${signature}`;
}

// Verify and decode token
export async function verifySessionToken(token: string): Promise<DemoUser | null> {
  if (!token || !token.includes(".")) return null;

  const [payloadEncoded, signature] = token.split(".");
  if (!payloadEncoded || !signature) return null;

  const isValid = await verifySignature(payloadEncoded, signature);
  if (!isValid) return null;

  try {
    const raw = base64UrlDecode(payloadEncoded);
    const data: SessionPayload = JSON.parse(raw);

    // Check expiry
    if (Date.now() / 1000 > data.exp) return null;

    // Find full user object if possible, else reconstruct
    const foundUser = Object.values(DEMO_USERS).find((u) => u.id === data.userId);
    if (foundUser) {
      return {
        ...foundUser,
        presenceStatus: data.presenceStatus || foundUser.presenceStatus || "available",
      };
    }

    return {
      id: data.userId,
      role: data.role,
      email: data.email,
      name: data.name,
      title: data.title,
      companyOrHandle: data.companyOrHandle,
      location: "San Francisco, USA",
      timezone: "UTC",
      avatar: data.avatar,
      statusBadge: data.statusBadge,
      summary: "",
      canLogin: true,
      isDemoData: false,
      presenceStatus: data.presenceStatus || "available",
    };
  } catch {
    return null;
  }
}

// Get current logged-in user from request cookies
export async function getCurrentUser(): Promise<DemoUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return null;

    // 1. Try local HMAC session verification
    const localUser = await verifySessionToken(token);
    if (localUser) return localUser;

    // 2. Validate against Express database session if local HMAC fails
    const backendUrl =
      process.env.BACKEND_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      "http://localhost:4000";
    try {
      const res = await fetch(`${backendUrl}/api/auth/me`, {
        headers: {
          Cookie: `${AUTH_COOKIE_NAME}=${token}`,
        },
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.id) {
          return {
            id: data.id,
            name: data.name,
            email: data.email,
            role: data.role as UserRole,
            avatar:
              data.role === "CLIENT"
                ? "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&h=128&fit=crop&crop=faces"
                : "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&h=128&fit=crop&crop=faces",
            title:
              data.role === "CLIENT"
                ? "Verified Client"
                : "Senior Full-Stack & Payment Rails Engineer",
            companyOrHandle:
              data.role === "CLIENT"
                ? "Nexum Client"
                : `@${data.name.toLowerCase().replace(/\s+/g, "_")}`,
            location: "Remote",
            timezone: "UTC",
            statusBadge:
              data.role === "CLIENT" ? "Verified Buyer" : "Verified Freelancer",
            summary: "Active platform user",
            canLogin: true,
            isDemoData: false,
          };
        }
      }
    } catch {
      // Fall through
    }

    return null;
  } catch {
    return null;
  }
}

// Set session cookie
export async function setSession(user: DemoUser) {
  const token = await createSessionToken(user);
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

// Update current session presence status
export async function updateSessionPresence(presence: UserPresenceStatus): Promise<DemoUser | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const updatedUser: DemoUser = {
    ...user,
    presenceStatus: presence,
  };
  await setSession(updatedUser);
  return updatedUser;
}

// Update current session avatar
export async function updateSessionAvatar(avatar: string): Promise<DemoUser | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  // If avatar is a large data URL, avoid overflowing the browser's 4096-byte cookie limit
  const cookieAvatar =
    avatar.startsWith("data:") && avatar.length > 1500
      ? user.avatar && !user.avatar.startsWith("data:") && !user.avatar.includes("googleusercontent")
        ? user.avatar
        : ""
      : avatar;

  const updatedUser: DemoUser = {
    ...user,
    avatar: cookieAvatar,
  };
  await setSession(updatedUser);
  return { ...updatedUser, avatar: cookieAvatar || avatar };
}

// Update current session hiring status
export async function updateSessionHiringStatus(hiringStatus: string): Promise<DemoUser | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const updatedUser: DemoUser = {
    ...user,
    statusBadge: hiringStatus,
  };
  await setSession(updatedUser);
  return updatedUser;
}

// Clear session cookie
export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

// Guard: Enforce Role (returns user or throws/returns null)
export async function requireRole(allowedRoles: UserRole[]): Promise<DemoUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED: Sign in required.");
  }
  if (!allowedRoles.includes(user.role)) {
    throw new Error(`FORBIDDEN: Requires one of [${allowedRoles.join(", ")}]. You are ${user.role}.`);
  }
  return user;
}

// Guard: Enforce Ownership
export async function requireOwnership(ownerId: string): Promise<DemoUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED: Sign in required.");
  }
  if (user.id !== ownerId) {
    throw new Error(`FORBIDDEN: You do not own this resource.`);
  }
  return user;
}
