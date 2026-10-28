"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function DashboardRouterPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace("/login");
      } else if (user.role === "FREELANCER") {
        router.replace("/freelancer/dashboard");
      } else {
        router.replace("/client/dashboard");
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="min-h-screen bg-[#050811] flex items-center justify-center text-white font-mono text-xs">
      <div className="flex items-center gap-3 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md">
        <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
        <span>Routing to your verified workspace...</span>
      </div>
    </div>
  );
}
