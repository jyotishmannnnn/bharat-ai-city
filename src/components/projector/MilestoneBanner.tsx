"use client";

// Room-wide celebration beats. Fires once per threshold, ever — driven
// purely off founders.length from the same city feed, no extra state.

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const THRESHOLDS = [10, 50, 100, 250, 500, 1000];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  spin: number;
}

const CONFETTI_COLORS = ["#2DD4BF", "#FDE047", "#F472B6", "#A78BFA", "#60A5FA", "#4ADE80"];

function ConfettiBurst({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Particle[] = Array.from({ length: 160 }, () => ({
      x: canvas.width / 2 + (Math.random() - 0.5) * 200,
      y: canvas.height * 0.35,
      vx: (Math.random() - 0.5) * 12,
      vy: -Math.random() * 10 - 4,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: 5 + Math.random() * 6,
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.3,
    }));

    let raf = 0;
    let frame = 0;
    function tick() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.vy += 0.35;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.spin;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
      frame++;
      if (frame < 150) raf = requestAnimationFrame(tick);
      else onDone();
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onDone]);

  return <canvas ref={canvasRef} className="fixed inset-0 z-40 pointer-events-none" />;
}

export default function MilestoneBanner({ founders }: { founders: number }) {
  const fired = useRef<Set<number>>(new Set());
  const [active, setActive] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    // Celebrate the highest threshold just crossed. If a burst of inserts
    // jumps past several thresholds between renders, mark them all fired
    // (already surpassed — no need to relitigate) but only show the
    // biggest one, since that's the milestone that matters to the room.
    const crossed = THRESHOLDS.filter((t) => founders >= t && !fired.current.has(t));
    if (crossed.length === 0) return;
    crossed.forEach((t) => fired.current.add(t));
    const biggest = crossed[crossed.length - 1];
    setActive(biggest);
    setShowConfetti(true);
    setFlash(true);
    const flashTimer = setTimeout(() => setFlash(false), 400);
    const activeTimer = setTimeout(() => setActive(null), 4500);
    return () => {
      clearTimeout(flashTimer);
      clearTimeout(activeTimer);
    };
  }, [founders]);

  return (
    <>
      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white z-30 pointer-events-none"
          />
        )}
      </AnimatePresence>
      {showConfetti && <ConfettiBurst onDone={() => setShowConfetti(false)} />}
      <AnimatePresence>
        {active !== null && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.95 }}
            transition={{ type: "spring", damping: 14 }}
            className="fixed top-10 left-1/2 -translate-x-1/2 z-50 text-center"
          >
            <div className="rounded-3xl px-10 py-6 bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-amber-400 shadow-2xl">
              <div className="text-sm font-bold uppercase tracking-[0.3em] text-slate-950/70">
                Milestone Reached
              </div>
              <div className="text-5xl font-black text-slate-950 mt-1">
                {active.toLocaleString("en-IN")} FOUNDERS 🎉
              </div>
              <div className="text-slate-950/80 font-semibold mt-1">
                Bharat AI City just grew, together.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
