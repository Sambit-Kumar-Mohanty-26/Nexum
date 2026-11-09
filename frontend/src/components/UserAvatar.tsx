"use client";

import React, { useState } from "react";

interface UserAvatarProps {
  name?: string;
  avatarUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  textSize?: string;
}

// Generate 1-2 letter initials from a person's name
export function getInitials(name?: string): string {
  if (!name || !name.trim()) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

// Deterministic vibrant background color derived from name
export function getAvatarBgColor(name?: string): string {
  if (!name) return "bg-indigo-600 text-white";
  const colors = [
    "bg-indigo-600 text-white",
    "bg-emerald-600 text-white",
    "bg-violet-600 text-white",
    "bg-blue-600 text-white",
    "bg-rose-600 text-white",
    "bg-amber-600 text-white",
    "bg-teal-600 text-white",
    "bg-purple-600 text-white",
    "bg-cyan-600 text-white",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

export default function UserAvatar({
  name = "User",
  avatarUrl,
  size = "md",
  className = "",
  textSize,
}: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);

  const sizeClasses = {
    xs: "w-6 h-6 text-[10px]",
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-xs",
    lg: "w-12 h-12 text-sm",
    xl: "w-14 h-14 text-base",
    "2xl": "w-20 h-20 text-xl",
  };

  // Reject empty or mock placeholder Unsplash URLs
  const isMockOrEmpty =
    !avatarUrl ||
    avatarUrl.trim() === "" ||
    avatarUrl.includes("images.unsplash.com") ||
    imgError;

  if (isMockOrEmpty) {
    const initials = getInitials(name);
    const bgClass = getAvatarBgColor(name);
    return (
      <div
        className={`${sizeClasses[size]} rounded-2xl flex items-center justify-center font-bold tracking-wider shrink-0 select-none shadow-2xs ${bgClass} ${className}`}
        title={name}
      >
        <span className={textSize || ""}>{initials}</span>
      </div>
    );
  }

  return (
    <img
      src={avatarUrl}
      alt={name}
      onError={() => setImgError(true)}
      className={`${sizeClasses[size]} rounded-2xl object-cover shrink-0 ring-1 ring-slate-200/80 shadow-2xs ${className}`}
    />
  );
}
