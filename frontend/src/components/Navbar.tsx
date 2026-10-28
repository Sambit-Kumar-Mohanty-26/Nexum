"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown, RefreshCw, LogOut } from "lucide-react";
import Logo from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";

export default function Navbar() {
  const { user, loginAs, logout } = useAuth();
  const [isDark, setIsDark] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [platformOpen, setPlatformOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  // Automatically detects when the navbar floats over dark sections
  useEffect(() => {
    const handleScroll = () => {
      const darkSections = document.querySelectorAll('[data-navbar-theme="dark"]');
      const navbarMidpoint = 32; // 64px navbar height / 2

      let overDark = false;
      darkSections.forEach((sec) => {
        const rect = sec.getBoundingClientRect();
        if (rect.top <= navbarMidpoint && rect.bottom >= navbarMidpoint) {
          overDark = true;
        }
      });

      setIsDark(overDark);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-colors duration-300 ease-out backdrop-blur-md ${
        isDark
          ? "border-b border-white/10 bg-[#07090E]/85 text-white"
          : "border-b border-slate-200/70 bg-white/90 text-slate-900"
      }`}
    >
      <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between px-6 lg:px-10">
        
        {/* =========================================================
            LEFT GROUP: Logo + Navigation Links
           ========================================================= */}
        <div className="flex items-center gap-10">
          
          {/* Logo (Inverts to white in dark mode, normal with mix-blend in light mode) */}
          <Link href="/" className="flex items-center gap-3 shrink-0 ml-2 transition-transform hover:opacity-90">
            <Logo surface={isDark ? "dark" : "light"} />
            <span
              className={`font-heading text-[21px] font-bold tracking-[-0.03em] transition-colors duration-300 ${
                isDark ? "text-white" : "text-ink"
              }`}
            >
              nexum
            </span>
          </Link>

          {/* Navigation Links */}
          <nav
            className={`hidden lg:flex items-center gap-2 text-[14px] font-medium transition-colors duration-300 ${
              isDark ? "text-slate-300" : "text-slate-700"
            }`}
          >
            
            {/* 1. PLATFORM DROPDOWN */}
            <div
              className="relative"
              onMouseEnter={() => setPlatformOpen(true)}
              onMouseLeave={() => setPlatformOpen(false)}
            >
              <button
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  platformOpen
                    ? isDark ? "bg-white/10 text-white" : "bg-slate-100 text-slate-900"
                    : isDark ? "hover:text-white" : "hover:text-slate-900"
                }`}
              >
                <span>Platform</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${
                    platformOpen ? "rotate-180" : ""
                  } ${isDark ? "text-slate-400" : "text-slate-400"}`}
                />
              </button>

              {platformOpen && (
                <div className="absolute left-0 top-full pt-1.5 z-50">
                  <div
                    className={`w-[560px] rounded-2xl border p-6 shadow-2xl grid grid-cols-12 gap-8 ${
                      isDark
                        ? "border-white/10 bg-[#0E1015] text-white"
                        : "border-slate-200/90 bg-white text-slate-900"
                    }`}
                  >
                    <div className="col-span-7 space-y-4">
                      <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                        Core Systems
                      </span>

                      <div className="space-y-4">
                        <Link href="#workspace" className="group block">
                          <div className={`font-heading text-sm font-semibold group-hover:text-cobalt transition-colors ${isDark ? "text-white" : "text-slate-900"}`}>
                            Dual AI Workspaces
                          </div>
                          <p className="text-xs text-slate-400 leading-snug mt-0.5">
                            Private workspaces for client and agency with shared consensus.
                          </p>
                        </Link>

                        <Link href="#change-control" className="group block">
                          <div className={`font-heading text-sm font-semibold group-hover:text-cobalt transition-colors ${isDark ? "text-white" : "text-slate-900"}`}>
                            Section 14 Change Engine
                          </div>
                          <p className="text-xs text-slate-400 leading-snug mt-0.5">
                            Scope changes never rewrite completed milestone history.
                          </p>
                        </Link>

                        <Link href="#recovery" className="group block">
                          <div className={`font-heading text-sm font-semibold group-hover:text-cobalt transition-colors ${isDark ? "text-white" : "text-slate-900"}`}>
                            Payment Recovery Engine
                          </div>
                          <p className="text-xs text-slate-400 leading-snug mt-0.5">
                            PayPal Orders v2 capture with zero blind duplicate retries.
                          </p>
                        </Link>
                      </div>
                    </div>

                    <div className="col-span-5 space-y-6">
                      <div>
                        <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-2.5">
                          Protocols
                        </span>
                        <ul className="space-y-2 text-xs font-medium text-slate-400">
                          <li><Link href="#consent" className="hover:text-white transition-colors">Consent-Aware Firewall</Link></li>
                          <li><Link href="#spec" className="hover:text-white transition-colors">PRD Testable Rules</Link></li>
                          <li><Link href="#protocol" className="hover:text-white transition-colors">SHA-256 Sign-off</Link></li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. RESOURCES DROPDOWN */}
            <div
              className="relative"
              onMouseEnter={() => setResourcesOpen(true)}
              onMouseLeave={() => setResourcesOpen(false)}
            >
              <button
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  resourcesOpen
                    ? isDark ? "bg-white/10 text-white" : "bg-slate-100 text-slate-900"
                    : isDark ? "hover:text-white" : "hover:text-slate-900"
                }`}
              >
                <span>Resources</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${
                    resourcesOpen ? "rotate-180" : ""
                  } ${isDark ? "text-slate-400" : "text-slate-400"}`}
                />
              </button>

              {resourcesOpen && (
                <div className="absolute left-0 top-full pt-1.5 z-50">
                  <div
                    className={`w-[580px] rounded-2xl border p-6 shadow-2xl grid grid-cols-12 gap-8 ${
                      isDark
                        ? "border-white/10 bg-[#0E1015] text-white"
                        : "border-slate-200/90 bg-white text-slate-900"
                    }`}
                  >
                    <div className="col-span-7 space-y-4">
                      <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                        Support
                      </span>

                      <div className="space-y-4">
                        <Link href="#spec" className="group block">
                          <div className={`font-heading text-sm font-semibold group-hover:text-cobalt transition-colors ${isDark ? "text-white" : "text-slate-900"}`}>
                            Help Center
                          </div>
                          <p className="text-xs text-slate-400 leading-snug mt-0.5">Learn about Nexum&apos;s features</p>
                        </Link>

                        <Link href="#spec" className="group block">
                          <div className={`font-heading text-sm font-semibold group-hover:text-cobalt transition-colors ${isDark ? "text-white" : "text-slate-900"}`}>
                            Academy
                          </div>
                          <p className="text-xs text-slate-400 leading-snug mt-0.5">Essential Nexum, explained</p>
                        </Link>

                        <Link href="#protocol" className="group block">
                          <div className={`font-heading text-sm font-semibold group-hover:text-cobalt transition-colors ${isDark ? "text-white" : "text-slate-900"}`}>
                            Developer Docs
                          </div>
                          <p className="text-xs text-slate-400 leading-snug mt-0.5">Start building on Nexum</p>
                        </Link>
                      </div>
                    </div>

                    <div className="col-span-5 space-y-6">
                      <div>
                        <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-2.5">
                          Company
                        </span>
                        <ul className="space-y-2 text-xs font-medium text-slate-400">
                          <li><Link href="#changelog" className="hover:text-white transition-colors">Changelog</Link></li>
                          <li><Link href="#announcements" className="hover:text-white transition-colors">Announcements</Link></li>
                          <li><Link href="#blog" className="hover:text-white transition-colors">Engineering blog</Link></li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Direct Links */}
            <Link
              href="#developers"
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                isDark ? "hover:text-white" : "hover:text-slate-900"
              }`}
            >
              Developers
            </Link>
            <Link
              href="#customers"
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                isDark ? "hover:text-white" : "hover:text-slate-900"
              }`}
            >
              Customers
            </Link>
            <Link
              href="#pricing"
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                isDark ? "hover:text-white" : "hover:text-slate-900"
              }`}
            >
              Pricing
            </Link>
          </nav>
        </div>

        {/* =========================================================
            RIGHT GROUP: Action Buttons & Role Switcher
           ========================================================= */}
        <div className="flex items-center gap-2.5">
          {user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen((prev) => !prev)}
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                  isDark
                    ? "border-white/15 bg-white/5 hover:bg-white/10 text-white"
                    : "border-slate-200 bg-white hover:border-slate-300 text-slate-800 shadow-xs"
                }`}
              >
                <Image
                  src={user.avatar}
                  alt={user.name}
                  width={24}
                  height={24}
                  className="h-6 w-6 rounded-lg object-cover ring-1 ring-slate-200"
                />
                <div className="flex flex-col text-left">
                  <span className="text-xs font-semibold leading-tight">{user.name}</span>
                  <span
                    className={`font-mono text-[9px] uppercase tracking-wider font-bold ${
                      user.role === "CLIENT" ? "text-cobalt" : "text-emerald-600"
                    }`}
                  >
                    {user.role}
                  </span>
                </div>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-slate-400 transition-transform ${
                    userMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl z-50 text-slate-900 animate-cinematic">
                  {/* Active User Header */}
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                    <Image
                      src={user.avatar}
                      alt={user.name}
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-xl object-cover ring-1 ring-slate-100"
                    />
                    <div className="min-w-0">
                      <p className="font-heading text-sm font-bold truncate">{user.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{user.companyOrHandle}</p>
                      <span
                        className={`inline-block mt-1 font-mono text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          user.role === "CLIENT"
                            ? "bg-cobalt/10 text-cobalt"
                            : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        }`}
                      >
                        {user.statusBadge}
                      </span>
                    </div>
                  </div>

                  {/* Switch Persona Action (FR-19 Role Switcher) */}
                  <div className="pt-3">
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                      Switch Demo Identity
                    </span>

                    {user.role === "CLIENT" ? (
                      <button
                        type="button"
                        disabled={switching}
                        onClick={async () => {
                          setSwitching(true);
                          await loginAs("FREELANCER_A");
                          setSwitching(false);
                          setUserMenuOpen(false);
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-colors text-left cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                            RV
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-800 group-hover:text-emerald-950">
                              Rohan Verma
                            </p>
                            <p className="text-[10px] text-slate-400">Freelancer A (Bengaluru)</p>
                          </div>
                        </div>
                        <RefreshCw className="h-3.5 w-3.5 text-slate-400 group-hover:text-emerald-600 transition" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={switching}
                        onClick={async () => {
                          setSwitching(true);
                          await loginAs("CLIENT");
                          setSwitching(false);
                          setUserMenuOpen(false);
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:border-cobalt hover:bg-cobalt/5 transition-colors text-left cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-lg bg-cobalt/10 text-cobalt flex items-center justify-center font-bold text-xs">
                            AR
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-800 group-hover:text-cobalt">
                              Alex Rivera
                            </p>
                            <p className="text-[10px] text-slate-400">Client / Buyer (USA)</p>
                          </div>
                        </div>
                        <RefreshCw className="h-3.5 w-3.5 text-slate-400 group-hover:text-cobalt transition" />
                      </button>
                    )}
                  </div>

                  {/* Actions & Logout */}
                  <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <Link
                      href="/login"
                      onClick={() => setUserMenuOpen(false)}
                      className="text-slate-500 hover:text-slate-900 transition-colors"
                    >
                      Persona details
                    </Link>
                    <button
                      type="button"
                      onClick={async () => {
                        await logout();
                        setUserMenuOpen(false);
                      }}
                      className="inline-flex items-center gap-1 font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Log out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className={`inline-flex h-9 items-center justify-center rounded-lg border px-3.5 text-xs font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-300 ${
                  isDark
                    ? "border-white/15 bg-white/5 text-white hover:bg-white/10 hover:border-white/25"
                    : "border-slate-200/90 bg-white text-slate-800 hover:bg-slate-50 hover:border-slate-300"
                }`}
              >
                Sign in
              </Link>

              <Link
                href="/login"
                className={`inline-flex h-9 items-center justify-center rounded-lg px-4 text-xs font-semibold shadow-xs transition-all duration-300 ${
                  isDark
                    ? "bg-white text-slate-900 hover:bg-slate-100"
                    : "bg-ink text-white hover:bg-ink-light"
                }`}
              >
                Start for free
              </Link>
            </>
          )}
        </div>

      </div>
    </header>
  );
}