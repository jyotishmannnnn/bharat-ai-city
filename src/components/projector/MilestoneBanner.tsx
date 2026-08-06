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

// Straight from the 32-colour game palette, so the celebration matches the city.
const CONFETTI_COLORS = ["#3fc9d4", "#f7e04c", "#f4526a", "#b06fe0", "#5fa8f5", "#63d16b"];

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
      // Whole multiples of the projector's 4px pixel grid, so confetti reads as
      // chunky sprites rather than smooth rectangles.
      size: 8 + Math.floor(Math.random() * 3) * 4,
      rotation: 0,
      spin: 0,
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
        // Snap to the pixel grid: unrotated whole-pixel squares, no sub-pixel
        // positions, so nothing anti-aliases against the retro city behind it.
        ctx.fillStyle = p.color;
        ctx.fillRect(
          Math.round(p.x / 4) * 4,
          Math.round(p.y / 4) * 4,
          p.size,
          p.size
        );
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
            className="fixed top-10 left-1/2 -translate-x-1/2 z-50 text-center font-pixel"
          >
            <div
              className="pixel-panel px-12 py-7"
              style={{ background: "var(--p-yellow)", borderWidth: 5 }}
            >
              <div className="text-[var(--p-blood)]" style={{ fontSize: 13 }}>
                MILESTONE REACHED
              </div>
              <div className="text-[var(--p-black)]" style={{ fontSize: 46, marginTop: 16 }}>
                {active.toLocaleString("en-IN")} FOUNDERS
              </div>
              <div className="text-[var(--p-blood)]" style={{ fontSize: 12, marginTop: 16 }}>
                BHARAT AI CITY JUST GREW, TOGETHER
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
