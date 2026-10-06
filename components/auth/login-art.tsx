"use client";

import { useEffect, useRef } from "react";

/**
 * Animated wires over the login artwork (design: "SE Enablement - Login.html", image mode).
 * Wires converge on the back of the head, pulses travel along them and light a small network,
 * and skill labels float up from it. Static frame under prefers-reduced-motion.
 */

type Node = { x: number; y: number; glow: number; r: number; nb: number[]; amberGlow?: boolean };
type Port = { x: number; y: number; ti: number };
type Wire = {
  sx: number; sy: number; c1x: number; c1y: number; c2x: number; c2y: number;
  ex: number; ey: number; ti: number; w: number; col: [number, number, number]; a: number;
};
type Pulse = { w: Wire; t: number; v: number; amber: boolean; done?: boolean };
type Spark = { a: number; b: number; t: number; dur: number; hops: number; amber: boolean; done?: boolean };
type Word = { txt: string; x: number; y: number; t: number };

const TARGET_X = 58; // % of width
const TARGET_Y = 26; // % of height
const SPREAD = 16; // % of the shorter side
const DENSITY = 1; // "medium"

const WORDS = [
  "Discovery",
  "Objection handling",
  "Value story",
  "Joiner, mover, leaver",
  "Demo flow",
  "Competitive",
  "Access reviews",
  "Executive pitch",
  "Agent identity",
  "Agentic Fabric",
  "Certifications",
  "Audit Ready",
];

function bz(w: Wire, t: number): [number, number] {
  const u = 1 - t;
  return [
    u * u * u * w.sx + 3 * u * u * t * w.c1x + 3 * u * t * t * w.c2x + t * t * t * w.ex,
    u * u * u * w.sy + 3 * u * u * t * w.c1y + 3 * u * t * t * w.c2y + t * t * t * w.ey,
  ];
}

export function LoginArt({ onTallChange }: { onTallChange?: (tall: boolean) => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const tallRef = useRef(onTallChange);
  tallRef.current = onTallChange;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const cv = document.createElement("canvas");
    cv.setAttribute("aria-hidden", "true");
    cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
    host.appendChild(cv);
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const fontFamily = getComputedStyle(host).fontFamily || "sans-serif";
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    let W = 0;
    let H = 0;
    let nodes: Node[] = [];
    let ports: Port[] = [];
    let wires: Wire[] = [];
    let pulses: Pulse[] = [];
    let sparks: Spark[] = [];
    let words: Word[] = [];
    let spawnT = 0;
    let wordT = 0;
    let wi = -1;

    function fire(i: number, hops: number, amber: boolean) {
      const n = nodes[i];
      if (!n) return;
      n.glow = 1;
      n.amberGlow = amber;
      const nb = n.nb
        .slice()
        .sort(() => Math.random() - 0.5)
        .slice(0, 2 + Math.floor(Math.random() * 2));
      for (const j of nb) sparks.push({ a: i, b: j, t: 0, dur: 260 + Math.random() * 260, hops, amber });
    }

    function build() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = host!.clientWidth;
      H = host!.clientHeight;
      if (!W || !H) return;
      cv.width = W * dpr;
      cv.height = H * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      const tx = W * (TARGET_X / 100);
      const ty = H * (TARGET_Y / 100);
      const r = Math.min(W, H) * (SPREAD / 100);
      nodes = [];
      for (let k = 0; k < Math.round(40 * DENSITY); k++) {
        const a = Math.random() * 6.28;
        const d = Math.sqrt(Math.random()) * r * 0.8;
        nodes.push({ x: tx + Math.cos(a) * d, y: ty + Math.sin(a) * d, glow: 0, r: 1 + Math.random() * 1.4, nb: [] });
      }
      nodes.forEach((n, i) => {
        nodes.forEach((m, j) => {
          if (i !== j && (n.x - m.x) ** 2 + (n.y - m.y) ** 2 < (r * 0.45) ** 2) n.nb.push(j);
        });
      });

      ports = [];
      const a0 = -1.9;
      const a1 = 0.9;
      for (let k = 0; k < 7; k++) {
        const a = a0 + (a1 - a0) * (k / 6);
        const pt = { x: tx + Math.cos(a) * r, y: ty + Math.sin(a) * r, ti: 0 };
        let bd = 1e9;
        nodes.forEach((n, i) => {
          const d = (n.x - pt.x) ** 2 + (n.y - pt.y) ** 2;
          if (d < bd) {
            bd = d;
            pt.ti = i;
          }
        });
        ports.push(pt);
      }

      wires = [];
      for (let k = 0; k < Math.round(18 * DENSITY); k++) {
        const pt = ports[k % ports.length]!;
        const fromTop = Math.random() < 0.5;
        const sx = fromTop ? W * 0.2 + Math.random() * W * 0.8 : W + 10;
        const sy = fromTop ? -10 : H * (0.02 + Math.random() * 0.8);
        const c1x = fromTop ? sx + (Math.random() - 0.5) * W * 0.25 : W * (0.75 + Math.random() * 0.2);
        const c1y = fromTop ? H * (0.05 + Math.random() * 0.3) : sy + (Math.random() - 0.5) * H * 0.3;
        const c2x = pt.x + (pt.x - tx) * 1.6 + (Math.random() - 0.5) * r;
        const c2y = pt.y + (pt.y - ty) * 1.6 - Math.random() * r * 0.5;
        const amber = Math.random() < 0.2;
        wires.push({
          sx, sy, c1x, c1y, c2x, c2y, ex: pt.x, ey: pt.y, ti: pt.ti,
          w: 1 + Math.random() * 1.6,
          col: amber ? [255, 196, 70] : Math.random() < 0.5 ? [170, 200, 255] : [120, 160, 240],
          a: 0.45 + Math.random() * 0.4,
        });
      }
      pulses = [];
      sparks = [];
      words = [];
      spawnT = 0;
      wordT = 0;
    }

    function tick(dt: number) {
      const c = ctx!;
      c.clearRect(0, 0, W, H);
      for (const w of wires) {
        c.strokeStyle = "rgba(6,14,36,0.55)";
        c.lineWidth = w.w + 2.5;
        c.beginPath();
        c.moveTo(w.sx, w.sy);
        c.bezierCurveTo(w.c1x, w.c1y, w.c2x, w.c2y, w.ex, w.ey);
        c.stroke();
        c.strokeStyle = `rgba(${w.col.join(",")},${w.a})`;
        c.lineWidth = w.w;
        c.stroke();
      }

      spawnT -= dt;
      if (spawnT <= 0 && wires.length) {
        spawnT = 70 + Math.random() * 120;
        const w = wires[Math.floor(Math.random() * wires.length)]!;
        pulses.push({ w, t: 0, v: 0.00035 + Math.random() * 0.0004, amber: Math.random() < 0.3 });
      }

      c.globalCompositeOperation = "lighter";
      for (const p of pulses) {
        p.t += p.v * dt;
        for (let k = 0; k < 7; k++) {
          const tt = p.t - k * 0.012;
          if (tt < 0) break;
          const [x, y] = bz(p.w, Math.min(1, tt));
          const a = (1 - k / 7) * 0.9;
          c.fillStyle = p.amber ? `rgba(255,184,28,${a})` : `rgba(190,210,255,${a})`;
          c.beginPath();
          c.arc(x, y, k ? 1.6 : 2.6, 0, 6.28);
          c.fill();
        }
        if (p.t >= 1 && !p.done) {
          p.done = true;
          fire(p.w.ti, 3, p.amber);
        }
      }
      pulses = pulses.filter((p) => !p.done);

      for (const sp of sparks) {
        sp.t += dt / sp.dur;
        const a = nodes[sp.a]!;
        const b = nodes[sp.b]!;
        c.fillStyle = sp.amber ? "rgba(255,200,80,0.95)" : "rgba(200,220,255,0.9)";
        c.beginPath();
        c.arc(a.x + (b.x - a.x) * sp.t, a.y + (b.y - a.y) * sp.t, 1.8, 0, 6.28);
        c.fill();
        if (sp.t >= 1 && !sp.done) {
          sp.done = true;
          if (sp.hops > 0) fire(sp.b, sp.hops - 1, sp.amber);
          else nodes[sp.b]!.glow = 1;
        }
      }
      sparks = sparks.filter((sp) => !sp.done);

      c.lineWidth = 0.6;
      nodes.forEach((n, i) => {
        for (const j of n.nb) {
          if (j <= i) continue;
          const m = nodes[j]!;
          const gl = Math.max(n.glow, m.glow);
          if (gl < 0.05) continue;
          c.strokeStyle = `rgba(255,200,130,${gl * 0.5})`;
          c.beginPath();
          c.moveTo(n.x, n.y);
          c.lineTo(m.x, m.y);
          c.stroke();
        }
      });
      for (const n of nodes) {
        n.glow = Math.max(0, n.glow - dt / 1400);
        if (n.glow <= 0.02) continue;
        const rad = 14 * n.glow + 3;
        const rg = c.createRadialGradient(n.x, n.y, 0, n.x, n.y, rad);
        rg.addColorStop(0, `rgba(255,200,110,${0.7 * n.glow})`);
        rg.addColorStop(1, "rgba(0,0,0,0)");
        c.fillStyle = rg;
        c.beginPath();
        c.arc(n.x, n.y, rad, 0, 6.28);
        c.fill();
        c.fillStyle = `rgba(255,230,180,${n.glow})`;
        c.beginPath();
        c.arc(n.x, n.y, n.r + n.glow, 0, 6.28);
        c.fill();
      }
      c.globalCompositeOperation = "source-over";

      for (const pt of ports) {
        const lit = nodes[pt.ti]?.glow ?? 0;
        c.fillStyle = "rgba(6,14,36,0.85)";
        c.beginPath();
        c.arc(pt.x, pt.y, 5.5, 0, 6.28);
        c.fill();
        c.lineWidth = 1.5;
        c.strokeStyle = `rgba(190,215,255,${0.6 + lit * 0.4})`;
        c.beginPath();
        c.arc(pt.x, pt.y, 5.5, 0, 6.28);
        c.stroke();
        c.fillStyle = lit > 0.3 ? "#FFB81C" : "rgba(190,215,255,0.9)";
        c.beginPath();
        c.arc(pt.x, pt.y, 2, 0, 6.28);
        c.fill();
      }

      wordT -= dt;
      if (wordT <= 0 && words.length < 2 && nodes.length) {
        wordT = 1800 + Math.random() * 1200;
        wi = (wi + 1) % WORDS.length;
        const n = nodes[Math.floor(Math.random() * nodes.length)]!;
        const last = words[words.length - 1];
        if (!last || Math.abs(last.y - n.y) > 40) words.push({ txt: WORDS[wi]!, x: n.x, y: n.y, t: 0 });
      }
      c.font = `700 14px ${fontFamily}`;
      for (const w of words) {
        w.t += dt / 2800;
        const a = w.t < 0.15 ? w.t / 0.15 : w.t > 0.7 ? Math.max(0, (1 - w.t) / 0.3) : 1;
        const ease = 1 - Math.pow(1 - w.t, 2);
        const lx = w.x + 12 + ease * 34;
        const ly = w.y - 6 - ease * 70;
        const tw = c.measureText(w.txt).width;
        c.fillStyle = `rgba(6,14,36,${a * 0.75})`;
        c.beginPath();
        c.roundRect(lx - 8, ly - 15, tw + 16, 22, 11);
        c.fill();
        c.fillStyle = `rgba(255,184,28,${a})`;
        c.fillText(w.txt, lx, ly);
        c.beginPath();
        c.arc(w.x, w.y, 2.5, 0, 6.28);
        c.fill();
        c.strokeStyle = `rgba(255,184,28,${a * 0.6})`;
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(w.x, w.y);
        c.lineTo(lx - 8, ly - 4);
        c.stroke();
      }
      words = words.filter((w) => w.t < 1);
    }

    let raf = 0;
    let last = performance.now();
    const ro = new ResizeObserver(() => {
      build();
      tallRef.current?.(host.clientHeight >= 640);
      if (reduce) tick(16);
    });
    ro.observe(host);
    build();
    if (reduce) {
      tick(16);
    } else {
      const loop = (t: number) => {
        raf = requestAnimationFrame(loop);
        const dt = Math.min(50, t - last);
        last = t;
        tick(dt);
      };
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      cv.remove();
    };
  }, []);

  return <div className="pointer-events-none absolute inset-0" ref={hostRef} />;
}
