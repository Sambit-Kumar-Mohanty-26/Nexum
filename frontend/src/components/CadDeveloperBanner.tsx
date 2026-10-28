"use client";

import React, { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

type CodeTab = "ts" | "curl" | "webhook";

const codeSnippets: Record<CodeTab, string> = {
  ts: `import { Nexum } from "@nexum/sdk";

const nexum = new Nexum({ apiKey: process.env.NEXUM_KEY });

// Lock agreement with dual SHA-256 consensus
const consensus = await nexum.agreements.lock({
  projectId: "prj_ecom_v1.1",
  enforceState: "IMMUTABLE",
});`,
  curl: `curl -X POST https://api.nexum.network/v1/settle \\
  -H "Authorization: Bearer nx_live_98ab" \\
  -H "Idempotency-Key: req_98bfa2" \\
  -d '{"milestoneId": "m2_storefront", "action": "CAPTURE"}'`,
  webhook: `// Verify incoming PayPal Orders v2 webhook
const isValid = nexum.webhooks.verifySignature({
  payload: req.body,
  signature: req.headers["paypal-transmission-sig"],
  certUrl: req.headers["paypal-cert-url"],
});`,
};

export default function CadDeveloperBanner() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLElement>(null);

  const [activeTab, setActiveTab] = useState<CodeTab>("ts");
  const [copied, setCopied] = useState(false);
  const [phaseProgress, setPhaseProgress] = useState({ p1: 100, p2: 100, p3: 100 });
  const [statusText, setStatusText] = useState("ASSEMBLED");

  const handleCopy = () => {
    navigator.clipboard.writeText(codeSnippets[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let animationFrameId: number;

    const ISO_DX = 196;
    const ISO_DY = -138;

    type Vec2 = { x: number; y: number };
    type Vertex = { id: number; x: number; y: number; key: boolean; layerIdx: number };
    type RibbonNode = Vertex & { homeX: number; homeY: number; startX: number; startY: number; vx: number; vy: number; scatterAngle: number; scatterSpeed: number };
    type GradientStop = [number, string];
    type Hatch = { x1: number; y1: number; x2: number; y2: number; delay: number; alpha: number; color: [number, number, number] };
    type Contour = { a: number; b: number; order: number; bright: boolean };
    type RibbonLayerCfg = { name: string; railA: Vec2[]; railB: Vec2[]; hatchCount: number; hatchAlpha: number; hatchColor: [number, number, number]; fillGradient: { x0: number; y0: number; x1: number; y1: number; stops: GradientStop[] }; drawOrderOffset: number; drawOrderSpan: number; keyIndicesA: number[]; keyIndicesB: number[] };
    type RibbonLayer = RibbonLayerCfg & { poly: Vec2[]; railAIds: number[]; railBIds: number[]; contours: Contour[]; hatches: Hatch[] };

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
    const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);

    const evalCubicBezier = (p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, t: number): Vec2 => {
      const mt = 1 - t;
      return {
        x: mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
        y: mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y,
      };
    };

    const evalQuadBezier = (p0: Vec2, p1: Vec2, p2: Vec2, t: number): Vec2 => {
      const mt = 1 - t;
      return {
        x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
        y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
      };
    };

    const shiftIso = (pt: Vec2, scale = 1.0): Vec2 => ({
      x: pt.x + ISO_DX * scale,
      y: pt.y + ISO_DY * scale,
    });

    let ribbonLayers: RibbonLayer[] = [];
    let allVertices: Vertex[] = [];
    let nodes: RibbonNode[] = [];
    const symbolBounds = { scale: 1, offsetX: 0, offsetY: 0, cx: 0, cy: 0 };

    const buildRibbonGeometry = () => {
      ribbonLayers = [];
      allVertices = [];

      const addVertex = (x: number, y: number, isKey = true, layerIdx = 0) => {
        for (let i = 0; i < allVertices.length; i++) {
          if (Math.hypot(allVertices[i].x - x, allVertices[i].y - y) < 8) {
            if (isKey) allVertices[i].key = true;
            return allVertices[i].id;
          }
        }
        const id = allVertices.length;
        allVertices.push({ id, x, y, key: isKey, layerIdx });
        return id;
      };

      const createRuledLayer = (cfg: RibbonLayerCfg) => {
        const numSamples = cfg.railA.length;
        const poly: Vec2[] = [];
        for (let i = 0; i < numSamples; i++) poly.push(cfg.railA[i]);
        for (let i = numSamples - 1; i >= 0; i--) poly.push(cfg.railB[i]);

        const railAIds = cfg.railA.map((pt: Vec2, idx: number) =>
          addVertex(pt.x, pt.y, cfg.keyIndicesA.includes(idx), ribbonLayers.length)
        );
        const railBIds = cfg.railB.map((pt: Vec2, idx: number) =>
          addVertex(pt.x, pt.y, cfg.keyIndicesB.includes(idx), ribbonLayers.length)
        );

        const contours: Contour[] = [];
        for (let i = 0; i < numSamples - 1; i++) {
          const t = i / (numSamples - 1);
          contours.push({ a: railAIds[i], b: railAIds[i + 1], order: cfg.drawOrderOffset + t * cfg.drawOrderSpan, bright: cfg.hatchAlpha > 0.42 });
          contours.push({ a: railBIds[i], b: railBIds[i + 1], order: cfg.drawOrderOffset + 0.04 + t * cfg.drawOrderSpan, bright: cfg.hatchAlpha > 0.42 });
        }
        contours.push({ a: railAIds[0], b: railBIds[0], order: cfg.drawOrderOffset, bright: false });
        contours.push({ a: railAIds[numSamples - 1], b: railBIds[numSamples - 1], order: cfg.drawOrderOffset + cfg.drawOrderSpan, bright: cfg.hatchAlpha > 0.42 });

        const hatches: Hatch[] = [];
        for (let i = 1; i < cfg.hatchCount; i++) {
          const u = i / cfg.hatchCount;
          const exactIdx = u * (numSamples - 1);
          const idx0 = Math.floor(exactIdx);
          const idx1 = Math.min(numSamples - 1, idx0 + 1);
          const frac = exactIdx - idx0;

          const pA = { x: lerp(cfg.railA[idx0].x, cfg.railA[idx1].x, frac), y: lerp(cfg.railA[idx0].y, cfg.railA[idx1].y, frac) };
          const pB = { x: lerp(cfg.railB[idx0].x, cfg.railB[idx1].x, frac), y: lerp(cfg.railB[idx0].y, cfg.railB[idx1].y, frac) };

          hatches.push({ x1: pA.x, y1: pA.y, x2: pB.x, y2: pB.y, delay: clamp(cfg.drawOrderOffset * 0.8 + u * 0.45, 0, 0.78), alpha: cfg.hatchAlpha, color: cfg.hatchColor });
        }

        ribbonLayers.push({ ...cfg, poly, railAIds, railBIds, contours, hatches });
      };

      // Layer 0: Left Inner Wall
      const leftRailA: Vec2[] = [];
      const leftRailB: Vec2[] = [];
      for (let i = 0; i <= 14; i++) {
        const t = i / 14;
        const ptA = t < 0.82 ? { x: 145, y: lerp(330, 625, t / 0.82) } : evalQuadBezier({ x: 145, y: 625 }, { x: 145, y: 678 }, { x: 188, y: 648 }, (t - 0.82) / 0.18);
        leftRailA.push(ptA);
        leftRailB.push(shiftIso(ptA, 0.82));
      }
      createRuledLayer({ name: "LEFT_INNER", railA: leftRailA, railB: leftRailB, hatchCount: 22, hatchAlpha: 0.28, hatchColor: [165, 175, 190], fillGradient: { x0: 145, y0: 330, x1: 310, y1: 650, stops: [[0, "rgba(14, 15, 19, 0.96)"], [1, "rgba(24, 26, 32, 0.94)"]] }, drawOrderOffset: 0.02, drawOrderSpan: 0.25, keyIndicesA: [0, 6, 11, 14], keyIndicesB: [0, 6, 11, 14] });

      // Layer 1: Center Metallic Drop Wall (Silver highlight)
      const centerRailA: Vec2[] = [];
      const centerRailB: Vec2[] = [];
      for (let i = 0; i <= 18; i++) {
        const t = i / 18;
        const ptA = t < 0.62 ? { x: 452, y: lerp(420, 725, t / 0.62) } : evalCubicBezier({ x: 452, y: 725 }, { x: 452, y: 805 }, { x: 525, y: 868 }, { x: 625, y: 920 }, (t - 0.62) / 0.38);
        centerRailA.push(ptA);
        centerRailB.push(shiftIso(ptA, 1.0));
      }
      createRuledLayer({ name: "CENTER_WALL", railA: centerRailA, railB: centerRailB, hatchCount: 32, hatchAlpha: 0.58, hatchColor: [242, 246, 255], fillGradient: { x0: 452, y0: 460, x1: 660, y1: 880, stops: [[0, "rgba(215, 222, 232, 0.28)"], [0.45, "rgba(160, 170, 184, 0.20)"], [1, "rgba(28, 31, 38, 0.92)"]] }, drawOrderOffset: 0.35, drawOrderSpan: 0.32, keyIndicesA: [4, 11, 15, 18], keyIndicesB: [4, 11, 15, 18] });

      // Layer 2: Right Upward Wing
      const rightRailA: Vec2[] = [];
      const rightRailB: Vec2[] = [];
      for (let i = 0; i <= 16; i++) {
        const t = i / 16;
        const ptA = t < 0.8 ? { x: 706, y: lerp(795, 515, t / 0.8) } : evalQuadBezier({ x: 706, y: 515 }, { x: 706, y: 472 }, { x: 738, y: 450 }, (t - 0.8) / 0.2);
        rightRailA.push(ptA);
        rightRailB.push(shiftIso(ptA, 0.95));
      }
      createRuledLayer({ name: "RIGHT_WING", railA: rightRailA, railB: rightRailB, hatchCount: 24, hatchAlpha: 0.32, hatchColor: [185, 195, 210], fillGradient: { x0: 706, y0: 450, x1: 900, y1: 790, stops: [[0, "rgba(18, 20, 25, 0.96)"], [1, "rgba(12, 14, 18, 0.98)"]] }, drawOrderOffset: 0.62, drawOrderSpan: 0.3, keyIndicesA: [0, 6, 12, 16], keyIndicesB: [0, 6, 12, 16] });

      // Layer 3: Main Foreground Ribbon
      const mainRailA: Vec2[] = [];
      const mainRailB: Vec2[] = [];
      for (let i = 0; i <= 32; i++) {
        const t = i / 32;
        let ptA;
        if (t <= 0.34) ptA = evalCubicBezier({ x: 145, y: 345 }, { x: 145, y: 205 }, { x: 235, y: 175 }, { x: 318, y: 268 }, t / 0.34);
        else if (t <= 0.78) ptA = { x: lerp(318, 635, (t - 0.34) / 0.44), y: lerp(268, 632, (t - 0.34) / 0.44) };
        else ptA = evalCubicBezier({ x: 635, y: 632 }, { x: 695, y: 702 }, { x: 722, y: 815 }, { x: 655, y: 908 }, (t - 0.78) / 0.22);

        mainRailA.push(ptA);
        mainRailB.push(shiftIso(ptA, 1.0));
      }
      createRuledLayer({ name: "MAIN_RIBBON", railA: mainRailA, railB: mainRailB, hatchCount: 38, hatchAlpha: 0.36, hatchColor: [215, 222, 235], fillGradient: { x0: 180, y0: 140, x1: 820, y1: 860, stops: [[0, "rgba(26, 29, 36, 0.96)"], [0.35, "rgba(46, 50, 60, 0.95)"], [0.75, "rgba(28, 31, 38, 0.96)"], [1, "rgba(16, 18, 23, 0.97)"]] }, drawOrderOffset: 0.12, drawOrderSpan: 0.68, keyIndicesA: [0, 5, 11, 18, 25, 29, 32], keyIndicesB: [0, 5, 11, 18, 25, 29, 32] });
    };

    const normToScreen = (nx: number, ny: number) => ({
      x: symbolBounds.offsetX + nx * symbolBounds.scale,
      y: symbolBounds.offsetY + ny * symbolBounds.scale,
    });

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const targetSize = Math.min(width * (width < 900 ? 0.75 : 0.48), height * 0.85, 560);
      symbolBounds.scale = targetSize / 1000;
      const stageCenterX = width < 900 ? width * 0.55 : width * 0.70;
      const stageCenterY = height * 0.50;

      symbolBounds.offsetX = stageCenterX - 525 * symbolBounds.scale;
      symbolBounds.offsetY = stageCenterY - 495 * symbolBounds.scale;
      symbolBounds.cx = stageCenterX;
      symbolBounds.cy = stageCenterY;

      nodes = allVertices.map((v) => {
        const pos = normToScreen(v.x, v.y);
        return {
          ...v,
          homeX: pos.x,
          homeY: pos.y,
          x: pos.x,
          y: pos.y,
          startX: pos.x,
          startY: pos.y,
          vx: 0,
          vy: 0,
          // Random dispersion angles for explosive scatter
          scatterAngle: Math.random() * Math.PI * 2,
          scatterSpeed: 3 + Math.random() * 5,
        };
      });
    };

    buildRibbonGeometry();
    resize();
    window.addEventListener("resize", resize);

    // Mouse Scatter & Rebuild Engine
    const mouse = { x: -9999, y: -9999 };
    let animState: "ASSEMBLED" | "DISPERSED" | "REBUILDING" = "ASSEMBLED";
    let rebuildStart = 0;
    const REBUILD_DURATION = 2400;

    const onPointerMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;

      const dist = Math.hypot(mouse.x - symbolBounds.cx, mouse.y - symbolBounds.cy);
      if (dist < 260) {
        if (animState !== "DISPERSED") {
          animState = "DISPERSED";
          setStatusText("SCATTERING");
        }
      } else if (animState === "DISPERSED") {
        animState = "REBUILDING";
        rebuildStart = performance.now();
        setStatusText("REBUILDING");
        nodes.forEach((n) => { n.startX = n.x; n.startY = n.y; });
      }
    };

    const onPointerLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
      if (animState === "DISPERSED") {
        animState = "REBUILDING";
        rebuildStart = performance.now();
        setStatusText("REBUILDING");
        nodes.forEach((n) => { n.startX = n.x; n.startY = n.y; });
      }
    };

    canvas.addEventListener("mousemove", onPointerMove);
    canvas.addEventListener("mouseleave", onPointerLeave);

    // Main Draw Loop
    const render = (now: number) => {
      ctx.clearRect(0, 0, width, height);

      let p1 = 1, p2 = 1, p3 = 1;

      if (animState === "DISPERSED") {
        p1 = 0; p2 = 0; p3 = 0;
        setPhaseProgress({ p1: 0, p2: 0, p3: 0 });

        // RANDOM SCATTER PHYSICS (Zero connecting lines!)
        nodes.forEach((n) => {
          const dx = n.x - mouse.x;
          const dy = n.y - mouse.y;
          const dist = Math.hypot(dx, dy);

          if (dist < 180 && dist > 0.001) {
            // Push away radially with random scatter jitter
            const force = Math.pow(1 - dist / 180, 1.5) * 7.0;
            const randJitterX = (Math.random() - 0.5) * 2.5;
            const randJitterY = (Math.random() - 0.5) * 2.5;
            n.vx += ((dx / dist) * force) + randJitterX;
            n.vy += ((dy / dist) * force) + randJitterY;
          }

          // Gentle spring return force towards home
          n.vx += (n.homeX - n.x) * 0.02;
          n.vy += (n.homeY - n.y) * 0.02;
          n.vx *= 0.86;
          n.vy *= 0.86;
          n.x += n.vx;
          n.y += n.vy;
        });
      } else if (animState === "REBUILDING") {
        const elapsed = now - rebuildStart;
        const total = clamp(elapsed / REBUILD_DURATION, 0, 1);
        p1 = easeInOutCubic(clamp(elapsed / 700, 0, 1));
        p2 = clamp((elapsed - 500) / 1100, 0, 1);
        p3 = clamp((elapsed - 1200) / 1200, 0, 1);

        setPhaseProgress({ p1: Math.round(p1 * 100), p2: Math.round(p2 * 100), p3: Math.round(p3 * 100) });

        nodes.forEach((n) => {
          n.x = lerp(n.startX, n.homeX, p1);
          n.y = lerp(n.startY, n.homeY, p1);
        });

        if (total >= 1) {
          animState = "ASSEMBLED";
          setStatusText("ASSEMBLED");
        }
      } else {
        nodes.forEach((n) => { n.x = n.homeX; n.y = n.homeY; });
        p1 = 1; p2 = 1; p3 = 1;
      }

      // Render 3D Ribbon Layers (Painter's Algorithm)
      if (p2 > 0.01 || p3 > 0.01) {
        ribbonLayers.forEach((layer) => {
          if (p2 > 0.15) {
            ctx.save();
            ctx.beginPath();
            layer.railAIds.forEach((id: number, idx: number) => {
              const n = nodes[id];
              if (idx === 0) ctx.moveTo(n.x, n.y);
              else ctx.lineTo(n.x, n.y);
            });
            for (let i = layer.railBIds.length - 1; i >= 0; i--) {
              const n = nodes[layer.railBIds[i]];
              ctx.lineTo(n.x, n.y);
            }
            ctx.closePath();
            ctx.fillStyle = "#07090E";
            ctx.fill();

            if (layer.fillGradient && p3 > 0.01) {
              const g0 = normToScreen(layer.fillGradient.x0, layer.fillGradient.y0);
              const g1 = normToScreen(layer.fillGradient.x1, layer.fillGradient.y1);
              const grad = ctx.createLinearGradient(g0.x, g0.y, g1.x, g1.y);
              layer.fillGradient.stops.forEach(([stop, col]: GradientStop) => grad.addColorStop(stop, col));
              ctx.globalAlpha = easeOutQuart(p3);
              ctx.fillStyle = grad;
              ctx.fill();
            }
            ctx.restore();
          }

          // Hatches
          if (p3 > 0.001) {
            ctx.save();
            ctx.lineWidth = 1;
            layer.hatches.forEach((h: Hatch) => {
              const lp = easeOutQuart(clamp((p3 - h.delay * 0.6) / 0.4, 0, 1));
              if (lp <= 0.001) return;
              const pA = normToScreen(h.x1, h.y1);
              const pB = normToScreen(h.x2, h.y2);
              const [r, g, b] = h.color;
              ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${(h.alpha * lp).toFixed(3)})`;
              ctx.beginPath();
              ctx.moveTo(pA.x, pA.y);
              ctx.lineTo(lerp(pA.x, pB.x, lp), lerp(pA.y, pB.y, lp));
              ctx.stroke();
            });
            ctx.restore();
          }

          // Contours
          if (p2 > 0.001) {
            ctx.save();
            ctx.lineCap = "round";
            layer.contours.forEach((c: Contour) => {
              const lp = easeInOutCubic(clamp((p2 - c.order * 0.55) / 0.45, 0, 1));
              if (lp <= 0.001) return;
              const nA = nodes[c.a];
              const nB = nodes[c.b];
              ctx.lineWidth = c.bright ? 1.5 : 1.2;
              ctx.strokeStyle = `rgba(235, 240, 250, ${( (c.bright ? 0.78 : 0.5) * lp).toFixed(3)})`;
              ctx.beginPath();
              ctx.moveTo(nA.x, nA.y);
              ctx.lineTo(lerp(nA.x, nB.x, lp), lerp(nA.y, nB.y, lp));
              ctx.stroke();
            });
            ctx.restore();
          }
        });
      }

      // Vertex Nodes (Floating square CAD points)
      ctx.save();
      nodes.forEach((n) => {
        const size = n.key ? 4.2 : 2.4;
        const alpha = n.key ? 0.85 : 0.24;
        ctx.fillStyle = `rgba(220, 230, 245, ${alpha})`;
        ctx.fillRect(n.x - size / 2, n.y - size / 2, size, size);
      });
      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", onPointerMove);
      canvas.removeEventListener("mouseleave", onPointerLeave);
    };
  }, []);

  return (
    // Reuses the exact same background from the above section
    <section
      ref={containerRef}
      data-navbar-theme="dark"
      className="relative w-full bg-dark-cosmic-stripes text-white overflow-hidden pt-0 pb-16 lg:pb-24"
    >
      <div className="relative mx-auto max-w-[1440px] px-6 lg:px-12 flex flex-col lg:flex-row items-center justify-between gap-12 min-h-[580px]">
        
        {/* =========================================================
            LEFT DEVELOPER CONSOLE (High-End Interactive Terminal)
           ========================================================= */}
        <div className="relative z-10 w-full max-w-[580px] rounded-2xl border border-white/10 bg-[#0A0C10]/85 p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
          
          {/* Subtle architectural corner ticks */}
          <span className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-white/40" />
          <span className="absolute top-0 right-0 w-2.5 h-2.5 border-t border-r border-white/40" />
          <span className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b border-l border-white/40" />
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r border-white/40" />

          {/* Top Status & Language Switcher Tabs */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-1.5 p-0.5 rounded-lg bg-white/5 border border-white/10 text-xs font-mono">
              {(["ts", "curl", "webhook"] as CodeTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1 rounded-md uppercase transition ${
                    activeTab === tab
                      ? "bg-white text-slate-900 font-semibold shadow-xs"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {tab === "ts" ? "TypeScript" : tab === "curl" ? "cURL" : "Webhook"}
                </button>
              ))}
            </div>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-white transition px-2 py-1 rounded hover:bg-white/5"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>

          {/* Shimmering Headline */}
          <div className="mt-6">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
              SDK. API. PROTOCOL.
              <span className="block font-normal text-transparent bg-clip-text bg-gradient-to-r from-slate-200 via-slate-400 to-slate-500 text-2xl sm:text-3xl mt-1">
                Build anything on Nexum.
              </span>
            </h2>
          </div>

          {/* Live Code Box */}
          <div className="mt-6 rounded-xl border border-white/10 bg-black/60 p-4 font-mono text-xs text-slate-300 overflow-x-auto">
            <pre className="leading-relaxed">
              <code>{codeSnippets[activeTab]}</code>
            </pre>
          </div>

          {/* Bottom Telemetry Bar */}
          <div className="mt-8 pt-5 border-t border-white/[0.08] flex items-center justify-between font-mono text-[11px] text-slate-400">
            <div className="flex items-center gap-4">
              <div>
                <span className="block text-[9px] uppercase tracking-wider text-slate-500">Nodes</span>
                <span className="text-white font-medium">{phaseProgress.p1}%</span>
              </div>
              <div className="h-4 w-[1px] bg-white/10" />
              <div>
                <span className="block text-[9px] uppercase tracking-wider text-slate-500">Contours</span>
                <span className="text-white font-medium">{phaseProgress.p2}%</span>
              </div>
              <div className="h-4 w-[1px] bg-white/10" />
              <div>
                <span className="block text-[9px] uppercase tracking-wider text-slate-500">Hatching</span>
                <span className="text-white font-medium">{phaseProgress.p3}%</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`h-1.5 w-1.5 rounded-full ${statusText === "ASSEMBLED" ? "bg-emerald-400" : "bg-amber-400 animate-ping"}`} />
              <span className="text-[10px] text-slate-300 uppercase">{statusText}</span>
            </div>
          </div>

        </div>

        {/* =========================================================
            RIGHT INTERACTIVE CAD CANVAS (Scatter & Rebuild)
           ========================================================= */}
        <div className="w-full lg:w-[58%] h-[480px] sm:h-[580px] relative flex items-center justify-center">
          <canvas ref={canvasRef} className="w-full h-full block cursor-crosshair z-0" />
        </div>

      </div>
    </section>
  );
}