"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Layers,
  Zap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { DEMO_USERS } from "@/lib/auth-types";

export default function LoginPage() {
  const router = useRouter();
  const { user, loginAs, loginWithCredentials, logout } = useAuth();

  // Selected persona state ("client" | "freelancer")
  const [persona, setPersona] = useState<"client" | "freelancer">("client");

  const [email, setEmail] = useState("alex.rivera@nexum.demo");
  const [password, setPassword] = useState("demo1234");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Submission state & toast
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 3D Card tilt state
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const tiltX = ((y - centerY) / centerY) * -4; // subtle max 4deg
    const tiltY = ((x - centerX) / centerX) * 4;
    setTilt({ x: tiltX, y: tiltY });
  };

  const handleCardMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  const client = DEMO_USERS.CLIENT;
  const freelancerA = DEMO_USERS.FREELANCER_A;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Handle persona selection
  const handleSelectPersona = (key: "client" | "freelancer") => {
    setPersona(key);
    if (key === "client") {
      setEmail(client.email);
      setPassword("demo1234");
      showToast("Selected Alex Rivera (Client / Buyer)");
    } else {
      setEmail(freelancerA.email);
      setPassword("demo1234");
      showToast("Selected Rohan Verma (Freelancer)");
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      showToast("Please enter an email address.");
      return;
    }

    if (password.length < 4) {
      showToast("Password must be at least 4 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (persona === "client" && email.trim() === client.email) {
        const ok = await loginAs("CLIENT");
        if (ok) return router.push("/client/dashboard");
      } else if (persona === "freelancer" && email.trim() === freelancerA.email) {
        const ok = await loginAs("FREELANCER_A");
        if (ok) return router.push("/freelancer/dashboard");
      }

      const result = await loginWithCredentials(email.trim(), password);
      if (result.success) {
        if (result.user?.role === "FREELANCER") {
          router.push("/freelancer/dashboard");
        } else {
          router.push("/client/dashboard");
        }
      } else {
        showToast(result.error || "Authentication failed. Check credentials.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      showToast(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* ==============================================================
          CSS STYLES & 3D HARDWARE-ACCELERATED PRECISE ANIMATIONS
         ============================================================== */}
      <style jsx global>{`
        @keyframes pulseGlow {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.45; transform: scale(0.85); }
        }
        @keyframes spinSlow {
          0% { transform: translate(-50%, -50%) rotateX(68deg) rotateZ(0deg); }
          100% { transform: translate(-50%, -50%) rotateX(68deg) rotateZ(360deg); }
        }
        @keyframes spinReverse {
          0% { transform: translate(-50%, -50%) rotateX(68deg) rotateY(15deg) rotateZ(360deg); }
          100% { transform: translate(-50%, -50%) rotateX(68deg) rotateY(15deg) rotateZ(0deg); }
        }
        @keyframes spinTilted {
          0% { transform: translate(-50%, -50%) rotateX(64deg) rotateY(-20deg) rotateZ(0deg); }
          100% { transform: translate(-50%, -50%) rotateX(64deg) rotateY(-20deg) rotateZ(360deg); }
        }
        @keyframes coreLevitate {
          0%, 100% {
            transform: translate(-50%, -50%) translateY(0) scale(1);
            filter: drop-shadow(0 0 25px rgba(56, 189, 248, 0.55)) drop-shadow(0 0 50px rgba(168, 85, 247, 0.25));
          }
          50% {
            transform: translate(-50%, -50%) translateY(-10px) scale(1.03);
            filter: drop-shadow(0 0 35px rgba(56, 189, 248, 0.75)) drop-shadow(0 0 65px rgba(168, 85, 247, 0.45));
          }
        }
        @keyframes floatLabel1 {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes floatLabel2 {
          0%, 100% { transform: translateY(0) rotate(-4deg); }
          50% { transform: translateY(-10px) rotate(-4deg); }
        }
        @keyframes floatLabel3 {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-7px); }
        }
        @keyframes shineSweep {
          0%, 35% { left: -60%; }
          75%, 100% { left: 140%; }
        }
        @keyframes cardFadeIn {
          from { opacity: 0; transform: translateY(18px) scale(0.99); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes twinkleBeacon {
          0%, 100% { opacity: 0.9; transform: scale(1); box-shadow: 0 0 14px currentColor; }
          50% { opacity: 0.3; transform: scale(0.7); box-shadow: 0 0 4px currentColor; }
        }

        .anim-pulse-green {
          animation: pulseGlow 2s infinite ease-in-out;
        }
        .anim-pulse-amber {
          animation: pulseGlow 2s infinite ease-in-out 0.5s;
        }
        .anim-ring-cyan {
          animation: spinSlow 22s linear infinite;
        }
        .anim-ring-violet {
          animation: spinReverse 26s linear infinite;
        }
        .anim-ring-gold {
          animation: spinTilted 18s linear infinite;
        }
        .anim-core {
          animation: coreLevitate 4.5s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
        }
        .anim-card {
          animation: cardFadeIn 0.75s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .btn-shine-effect::after {
          content: "";
          position: absolute;
          top: -50%;
          left: -60%;
          width: 40%;
          height: 200%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
          transform: rotate(25deg);
          animation: shineSweep 4.5s infinite ease-in-out;
        }
        .core-hex-clip {
          clip-path: polygon(50% 0, 91% 23%, 91% 76%, 50% 100%, 9% 76%, 9% 23%);
        }
      `}</style>

      {/* ==============================================================
          MAIN OBSIDIAN VIEWPORT
         ============================================================== */}
      <div className="relative min-h-screen bg-[#050811] text-slate-100 flex flex-col justify-between px-4 sm:px-8 lg:px-14 overflow-hidden font-sans selection:bg-blue-600 selection:text-white isolate">
        
        {/* Ambient Radial Background Glows */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_42%,#0b1c3d_0%,#050811_55%),radial-gradient(circle_at_85%_85%,#0d1a33_0%,#050811_50%)] -z-20" />

        {/* Delicate background particle constellations */}
        <div className="pointer-events-none absolute inset-0 -z-20 opacity-30 bg-[radial-gradient(#93c5fd_1px,transparent_1px)] [background-size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />

        {/* ============================================================
            PRECISE 3D PURE CSS EARTH CURVATURE HORIZON
           ============================================================ */}
        <div
          className="pointer-events-none absolute -left-[8%] -bottom-[32%] w-[48%] max-w-[680px] aspect-square rounded-full bg-[radial-gradient(ellipse_at_50%_0%,#1a498b_0%,#0b2247_28%,#050c1b_65%)] shadow-[0_-8px_30px_rgba(79,159,255,0.35),inset_0_10px_25px_rgba(79,159,255,0.18)] opacity-70 -z-10 before:content-[''] before:absolute before:inset-[1.5%] before:rounded-full before:border-t-2 before:border-[#72c7ff]/70 before:shadow-[0_-6px_18px_rgba(66,168,255,0.35)] after:content-[''] after:absolute after:inset-0 after:rounded-full after:opacity-25 after:bg-[linear-gradient(rgba(75,155,255,0.25)_1px,transparent_1px),linear-gradient(90deg,rgba(75,155,255,0.25)_1px,transparent_1px)] after:[background-size:28px_28px] after:[mask-image:radial-gradient(ellipse,black_20%,transparent_75%)]"
          aria-hidden="true"
        />

        {/* ============================================================
            PRECISE 3D ROTATING GYROSCOPE RINGS & FLOATING HEXAGONAL CORE
            Cleanly centered with perfect margins between Hero and Card
           ============================================================ */}
        <div
          className="pointer-events-none absolute top-1/2 left-[46%] -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] -z-10 [perspective:1000px] hidden xl:block"
          aria-hidden="true"
        >
          {/* Subtle Ambient Core Nebula Glow */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[240px] h-[240px] rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.18)_0%,rgba(168,85,247,0.1)_45%,transparent_70%)] blur-xl" />

          {/* Ring 1 (Cyan Orbit - Outer Gyroscope) */}
          <div className="anim-ring-cyan absolute left-1/2 top-1/2 w-[310px] aspect-square border border-[#38bdf8]/50 rounded-full shadow-[0_0_20px_rgba(56,189,248,0.2)]">
            {/* Orbiting Satellite Node on Ring 1 */}
            <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#38bdf8] shadow-[0_0_10px_#38bdf8]" />
          </div>
          
          {/* Ring 2 (Violet Orbit - Middle Counter-Rotating Gyroscope) */}
          <div className="anim-ring-violet absolute left-1/2 top-1/2 w-[265px] aspect-square border border-[#a855f7]/45 rounded-full shadow-[0_0_18px_rgba(168,85,247,0.2)]">
            {/* Orbiting Satellite Node on Ring 2 */}
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 rounded-full bg-[#c084fc] shadow-[0_0_10px_#c084fc]" />
          </div>
          
          {/* Ring 3 (Gold Orbit - Inner Tilted Gyroscope) */}
          <div className="anim-ring-gold absolute left-1/2 top-1/2 w-[215px] aspect-square border border-dashed border-[#fbbf24]/40 rounded-full shadow-[0_0_15px_rgba(251,191,36,0.15)]" />

          {/* Floating Luminous Hexagonal Core */}
          <div className="anim-core absolute left-1/2 top-1/2 w-[116px] h-[116px] grid place-items-center">
            <div className="core-hex-clip w-[100px] h-[114px] grid place-items-center bg-gradient-to-br from-[#a2faff] via-[#316fff] to-[#8b5cf6] p-[2px]">
              <div className="core-hex-clip w-[96px] h-[110px] grid place-items-center bg-gradient-to-br from-[#122b68] to-[#071329] text-[#d8faff] text-[46px] font-black text-shadow-[0_0_18px_#57e5ff]">
                N
              </div>
            </div>
          </div>

          {/* Holographic Floating Badges - Positioned in Clear Unobstructed Negative Space */}
          <div className="absolute top-1 left-[54%] px-2.5 py-1.5 rounded-xl font-mono text-[10px] font-bold border border-[#25e7c1]/60 bg-[#064b4b]/85 text-[#a7fff0] backdrop-blur-md shadow-[0_0_20px_rgba(37,231,193,0.2)] [animation:floatLabel1_4.8s_ease-in-out_infinite]">
            ✦ Consensus
          </div>

          <div className="absolute top-[56%] -left-8 px-2.5 py-1.5 rounded-xl font-mono text-[10px] font-bold border border-[#55bcff]/60 bg-[#102d5d]/85 text-[#e6f8ff] backdrop-blur-md shadow-[0_0_20px_rgba(85,188,255,0.2)] [animation:floatLabel2_5.2s_ease-in-out_infinite] [animation-delay:-1.8s]">
            ⌑ Security
          </div>

          <div className="absolute bottom-2 left-[28%] px-2.5 py-1.5 rounded-xl font-mono text-[10px] font-bold border border-[#fbbf24]/60 bg-[#4c2d0f]/85 text-[#fde68a] backdrop-blur-md shadow-[0_0_20px_rgba(251,191,36,0.2)] [animation:floatLabel3_4.5s_ease-in-out_infinite] [animation-delay:-2.6s]">
            ϟ Escrow
          </div>

          {/* Precise Beacon Signals */}
          <span className="absolute left-[12%] top-[18%] w-2 h-2 rounded-full bg-[#38bdf8] text-[#38bdf8] [animation:twinkleBeacon_2.8s_infinite]" />
          <span className="absolute right-[14%] top-[56%] w-2 h-2 rounded-full bg-[#fbbf24] text-[#fbbf24] [animation:twinkleBeacon_3.2s_infinite_0.8s]" />
          <span className="absolute left-[24%] bottom-[12%] w-2 h-2 rounded-full bg-[#34d399] text-[#34d399] [animation:twinkleBeacon_2.4s_infinite_1.4s]" />
        </div>

        {/* ============================================================
            TOP NAVIGATION BAR (WITH BACK BUTTON & STATUS BADGES)
           ============================================================ */}
        <header className="h-[84px] flex items-center justify-between z-30 w-full relative">
          <div className="flex items-center gap-4 sm:gap-5">
            {/* Back to Landing Page Button */}
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.07] hover:bg-white/[0.14] border border-white/15 hover:border-white/30 text-slate-200 hover:text-white text-xs font-semibold backdrop-blur-md transition-all duration-200 group shadow-[0_4px_12px_rgba(0,0,0,0.2)]"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform duration-200" />
              <span>Back to Landing Page</span>
            </Link>

            {/* Nexum Logo */}
            <Link href="/" className="inline-flex items-center gap-2.5 text-white no-underline transition hover:opacity-90">
              <svg className="w-7 h-7" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 23L13 6H18L10 23H5Z" fill="#ffffff" />
                <path d="M14 26L22 9H27L19 26H14Z" fill="#ffffff" fillOpacity="0.85" />
              </svg>
              <span className="font-heading text-[22px] font-extrabold tracking-tight text-white">nexum</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {/* Consensus Node Pill */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full font-mono text-[11px] font-semibold text-[#a7f3d0] bg-[#042426]/90 border border-[#0d5c52] backdrop-blur-md shadow-[0_4px_14px_rgba(4,36,38,0.4)]">
              <span className="w-2 h-2 rounded-full bg-[#10b981] shadow-[0_0_10px_#10b981,0_0_4px_#34d399] anim-pulse-green" />
              <span>Consensus Node: <b className="text-white font-bold ml-0.5">Live</b></span>
            </div>

            {/* PayPal Sandbox Pill */}
            <div className="hidden sm:inline-flex items-center gap-2 px-4 py-1.5 rounded-full font-mono text-[11px] font-semibold text-[#fde68a] bg-[#2f1c04]/90 border border-[#85530b] backdrop-blur-md shadow-[0_4px_14px_rgba(47,28,4,0.4)]">
              <span className="w-2 h-2 rounded-full bg-[#f59e0b] shadow-[0_0_10px_#f59e0b,0_0_4px_#fbbf24] anim-pulse-amber" />
              <span>PayPal Sandbox v1.2</span>
            </div>
          </div>
        </header>

        {/* ============================================================
            MAIN STAGE (LEFT HERO | WHITE CARD | RIGHT TYPOGRAPHY RAIL)
           ============================================================ */}
        <main className="grid grid-cols-1 lg:grid-cols-[1fr_auto_auto] items-center gap-8 lg:gap-14 xl:gap-20 py-6 pb-12 flex-1 relative z-10">
          
          {/* ----------------- LEFT HERO COLUMN ----------------- */}
          <section className="max-w-[540px] z-10">
            <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-extrabold leading-[1.08] tracking-[-2px] text-white mb-4">
              Bilateral<br />
              Consensus Rails<br />
              for the{" "}
              <span className="bg-gradient-to-r from-[#38bdf8] via-[#818cf8] to-[#c084fc] text-transparent bg-clip-text">
                AI Economy
              </span>
            </h1>

            <p className="text-sm sm:text-[15px] text-[#94a3b8] leading-relaxed mb-8 tracking-tight max-w-[460px]">
              Secure agreements. Verified identities. Autonomous execution.
            </p>

            {/* 3 Features */}
            <div className="flex flex-col gap-4 sm:gap-5 mb-8">
              
              {/* Feature 1 */}
              <div className="flex items-center gap-4 group">
                <div className="w-11 h-11 rounded-xl bg-[#0c1938]/85 border border-blue-500/35 text-[#38bdf8] grid place-items-center shrink-0 shadow-[0_4px_14px_rgba(37,99,235,0.15)] group-hover:-translate-y-0.5 group-hover:border-blue-400/60 transition-all duration-200">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white tracking-tight">Verified Personas</div>
                  <div className="text-xs text-[#94a3b8] mt-0.5">Clients and freelancers, trusted and verified.</div>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="flex items-center gap-4 group">
                <div className="w-11 h-11 rounded-xl bg-[#0c1938]/85 border border-blue-500/35 text-[#38bdf8] grid place-items-center shrink-0 shadow-[0_4px_14px_rgba(37,99,235,0.15)] group-hover:-translate-y-0.5 group-hover:border-blue-400/60 transition-all duration-200">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white tracking-tight">Smart Escrow</div>
                  <div className="text-xs text-[#94a3b8] mt-0.5">Milestones, payments and releases.</div>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="flex items-center gap-4 group">
                <div className="w-11 h-11 rounded-xl bg-[#1e0e38]/85 border border-purple-500/35 text-[#c084fc] grid place-items-center shrink-0 shadow-[0_4px_14px_rgba(168,85,247,0.15)] group-hover:-translate-y-0.5 group-hover:border-purple-400/60 transition-all duration-200">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white tracking-tight">AI-Powered Matching</div>
                  <div className="text-xs text-[#94a3b8] mt-0.5">The right expertise, at the right time.</div>
                </div>
              </div>

            </div>

            {/* Quote with Gradient Bar */}
            <div className="pt-1">
              <div className="w-10 h-[3px] rounded-full bg-gradient-to-r from-[#22d3ee] to-[#a855f7] mb-3" />
              <div className="font-mono italic text-xs sm:text-[13px] text-[#94a3b8]">
                “AI drafts, humans approve, PayPal proves.”
              </div>
            </div>
          </section>

          {/* ----------------- CENTER-RIGHT WHITE CARD ----------------- */}
          <section
            ref={cardRef}
            onMouseMove={handleCardMouseMove}
            onMouseLeave={handleCardMouseLeave}
            style={{
              transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
              transition: "transform 0.15s ease-out, box-shadow 0.2s ease",
            }}
            className="anim-card w-full max-w-[465px] bg-white rounded-[28px] p-8 sm:p-9 text-[#0f172a] shadow-[0_25px_70px_-10px_rgba(0,0,0,0.6),0_0_40px_rgba(56,189,248,0.08)] relative z-10"
          >
            {/* Card Brand Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-lg tracking-tight">
                <svg className="w-6 h-6" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 23L13 6H18L10 23H5Z" fill="#0f172a" />
                  <path d="M14 26L22 9H27L19 26H14Z" fill="#0f172a" fillOpacity="0.8" />
                </svg>
                <span>nexum</span>
              </div>
              <span className="text-[11px] text-[#64748b] font-medium">Trusted. Transparent. Global.</span>
            </div>

            {/* Title & Subtitle */}
            <h2 className="text-2xl sm:text-[27px] font-extrabold tracking-tight text-[#0f172a] mb-1.5">
              Welcome back
            </h2>
            <p className="text-xs sm:text-[12.5px] text-[#64748b] leading-relaxed mb-5">
              Access your secure workspace and continue building the future of AI-powered collaboration.
            </p>

            {/* Active User Notification */}
            {user && (
              <div className="mb-4 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/80 p-2.5 text-xs text-emerald-950">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Logged in as <strong>{user.name}</strong></span>
                </div>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="text-emerald-700 underline font-semibold text-[11px] cursor-pointer"
                >
                  Log out
                </button>
              </div>
            )}

            {/* Persona Switcher (2 Cards) */}
            <div className="grid grid-cols-2 gap-2.5 mb-5" role="group" aria-label="Choose account type">
              
              {/* Persona 1: Client / Buyer */}
              <button
                type="button"
                onClick={() => handleSelectPersona("client")}
                className={`relative text-left flex items-center gap-2.5 p-3 rounded-2xl border transition-all duration-200 cursor-pointer active:scale-98 ${
                  persona === "client"
                    ? "border-[#2563eb] bg-[#f8faff] shadow-[0_4px_14px_rgba(37,99,235,0.1)] ring-2 ring-[#2563eb]/20"
                    : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300"
                }`}
              >
                <div className="w-9 h-9 rounded-full overflow-hidden shrink-0">
                  <Image
                    src={client.avatar}
                    alt={client.name}
                    width={36}
                    height={36}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-[#0f172a] leading-tight">Client / Buyer</div>
                  <div className="text-[10px] text-[#64748b] leading-tight mt-0.5">
                    Hire, manage and pay with confidence.
                  </div>
                </div>
                <div className={`absolute top-2.5 right-2.5 w-4 h-4 rounded-full flex items-center justify-center transition-all ${
                  persona === "client"
                    ? "bg-[#2563eb] border border-[#2563eb] text-white"
                    : "border border-slate-300 text-transparent"
                }`}>
                  {persona === "client" && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>
              </button>

              {/* Persona 2: Freelancer */}
              <button
                type="button"
                onClick={() => handleSelectPersona("freelancer")}
                className={`relative text-left flex items-center gap-2.5 p-3 rounded-2xl border transition-all duration-200 cursor-pointer active:scale-98 ${
                  persona === "freelancer"
                    ? "border-[#2563eb] bg-[#f8faff] shadow-[0_4px_14px_rgba(37,99,235,0.1)] ring-2 ring-[#2563eb]/20"
                    : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300"
                }`}
              >
                <div className="w-9 h-9 rounded-full overflow-hidden shrink-0">
                  <Image
                    src={freelancerA.avatar}
                    alt={freelancerA.name}
                    width={36}
                    height={36}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-[#0f172a] leading-tight">Freelancer</div>
                  <div className="text-[10px] text-[#64748b] leading-tight mt-0.5">
                    Find opportunities and get paid globally.
                  </div>
                </div>
                <div className={`absolute top-2.5 right-2.5 w-4 h-4 rounded-full flex items-center justify-center transition-all ${
                  persona === "freelancer"
                    ? "bg-[#2563eb] border border-[#2563eb] text-white"
                    : "border border-slate-300 text-transparent"
                }`}>
                  {persona === "freelancer" && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>
              </button>

            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              
              {/* Email Address */}
              <div>
                <label htmlFor="login-email" className="block text-xs font-bold text-[#0f172a] mb-1.5">
                  Email address
                </label>
                <div className="h-11 flex items-center gap-2.5 border border-slate-200 rounded-xl px-3 bg-white transition focus-within:border-[#2563eb] focus-within:ring-2 focus-within:ring-[#2563eb]/15">
                  <Mail className="w-4 h-4 text-[#94a3b8] shrink-0" />
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex.rivera@nexum.demo"
                    required
                    className="w-full border-0 outline-none bg-transparent text-xs sm:text-[12.5px] text-[#0f172a] placeholder:text-[#a4afc5]"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="login-password" className="block text-xs font-bold text-[#0f172a]">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setPassword("demo1234");
                      showToast("Demo credentials restored.");
                    }}
                    className="text-[11px] font-semibold text-[#2563eb] bg-transparent border-0 p-0 hover:underline cursor-pointer"
                  >
                    Use demo credentials &rarr;
                  </button>
                </div>
                <div className="h-11 flex items-center gap-2.5 border border-slate-200 rounded-xl px-3 bg-white transition focus-within:border-[#2563eb] focus-within:ring-2 focus-within:ring-[#2563eb]/15">
                  <Lock className="w-4 h-4 text-[#94a3b8] shrink-0" />
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full border-0 outline-none bg-transparent text-xs sm:text-[12.5px] text-[#0f172a] placeholder:text-[#a4afc5]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[#94a3b8] hover:text-[#475569] border-0 bg-transparent p-1 cursor-pointer shrink-0"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Options Row */}
              <div className="flex items-center justify-between text-xs pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer text-[#475569] font-medium text-[11px]">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-300 accent-[#2563eb]"
                  />
                  <span>Stay authenticated</span>
                </label>

                <div className="flex items-center gap-1 font-mono text-[10px] text-[#94a3b8]">
                  <ShieldCheck className="w-3 h-3 text-[#94a3b8]" />
                  <span>Secured with dual SHA-256</span>
                </div>
              </div>

              {/* Submit Button with Traveling Shine */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-shine-effect relative overflow-hidden h-12 w-full border-0 rounded-full bg-gradient-to-r from-[#0b1a3d] via-[#152b66] to-[#1e3a8a] text-white font-bold text-xs sm:text-[13px] shadow-[0_8px_24px_rgba(30,58,138,0.35)] hover:shadow-[0_12px_30px_rgba(30,58,138,0.5)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer disabled:opacity-50 mt-3 flex items-center justify-center gap-2 group"
              >
                <span>{isSubmitting ? "Entering Workspace..." : "Enter Workspace \u2192"}</span>
                <span className="w-6 h-6 rounded-full bg-[#2563eb] shadow-[0_0_10px_rgba(37,99,235,0.6)] grid place-items-center text-white text-xs group-hover:translate-x-0.5 transition">
                  <ArrowRight className="w-3 h-3" />
                </span>
              </button>

              {/* Divider */}
              <div className="flex items-center gap-2.5 text-[#94a3b8] text-[10px] font-semibold tracking-wider my-4 before:content-[''] before:h-px before:flex-1 before:bg-slate-200 after:content-[''] after:h-px after:flex-1 after:bg-slate-200">
                OR CONTINUE WITH
              </div>

              {/* Social Login Buttons */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* Google */}
                <button
                  type="button"
                  onClick={() => {
                    handleSelectPersona("client");
                    showToast("Simulating Google login for Alex Rivera...");
                  }}
                  className="h-10 border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 rounded-xl text-[#1e293b] flex items-center justify-center gap-2 text-xs font-semibold transition hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24Z"/>
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15Z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"/>
                  </svg>
                  <span>Google</span>
                </button>

                {/* Microsoft */}
                <button
                  type="button"
                  onClick={() => {
                    handleSelectPersona("freelancer");
                    showToast("Simulating Microsoft login for Rohan Verma...");
                  }}
                  className="h-10 border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 rounded-xl text-[#1e293b] flex items-center justify-center gap-2 text-xs font-semibold transition hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 23 23">
                    <path fill="#f35325" d="M1 1h10v10H1z"/>
                    <path fill="#81bc06" d="M12 1h10v10H12z"/>
                    <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                    <path fill="#ffba08" d="M12 12h10v10H12z"/>
                  </svg>
                  <span>Microsoft</span>
                </button>
              </div>

            </form>
          </section>

          {/* ----------------- RIGHT DECORATIVE RAIL ----------------- */}
          <aside className="hidden xl:flex flex-col justify-center pl-2 text-[#334155] font-sans text-[10px] font-extrabold tracking-[2.5px] leading-[2.2] select-none">
            <div>PEOPLE</div>
            <div>AGREEMENTS</div>
            <div>AI</div>
            <div>PAYMENTS</div>
            <div className="text-[#475569] font-black">ONE RAIL.</div>
            <div className="w-6 h-0.5 bg-[#2563eb] mt-1.5 rounded-full shadow-[0_0_10px_#2563eb]" />
          </aside>

        </main>

        {/* ============================================================
            BOTTOM CORNER BADGE & FOOTER
           ============================================================ */}
        <div className="h-12 flex items-center justify-between pb-4 text-xs text-slate-500 relative z-20">
          <Link
            href="/"
            title="Back to Landing Page"
            className="w-8 h-8 rounded-full border border-white/15 bg-[#0a101f]/85 grid place-items-center text-white text-xs font-extrabold backdrop-blur-md transition hover:scale-110 hover:border-white/35"
          >
            N
          </Link>
          <div className="hidden sm:flex items-center gap-6 text-[11px] text-[#64748b]">
            <span>Nexum Global Consensus Rails</span>
            <span>PayPal Sandbox v1.2</span>
          </div>
        </div>

      </div>

      {/* ==============================================================
          FLOATING TOAST NOTIFICATION
         ============================================================== */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#0f172a] text-white border border-white/10 px-4 py-2.5 rounded-full text-xs font-medium shadow-[0_10px_25px_rgba(0,0,0,0.4)] z-50 animate-in fade-in slide-in-from-bottom-2">
          {toastMessage}
        </div>
      )}
    </>
  );
}
