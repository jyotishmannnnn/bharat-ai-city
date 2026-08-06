"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import eventsData from "@/data/events.json";
import { ArcadeEngine, LANES, MISSION_DURATION_MS, EVENT_TIMES_MS, EngineSnapshot } from "@/game/engine";
import { SectorTheme, MissionSeed, MissionResult, RandomEventDef, RandomEventChoice } from "@/game/types";

const EVENTS = eventsData as RandomEventDef[];

interface Props {
  theme: SectorTheme;
  seed: MissionSeed;
  onComplete: (result: MissionResult, valuationMultiplier: number, livesTotal: number) => void;
}

export default function GameCanvas({ theme, seed, onComplete }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ArcadeEngine | null>(null);
  const rafRef = useRef<number>(0);
  const lastTsRef = useRef<number>(0);
  const firedEventsRef = useRef<Set<number>>(new Set());
  const valuationMultiplierRef = useRef(1);
  const livesRef = useRef(3);
  const pausedRef = useRef(false);

  const [snapshot, setSnapshot] = useState<EngineSnapshot | null>(null);
  const [activeEvent, setActiveEvent] = useState<RandomEventDef | null>(null);
  const [countIn, setCountIn] = useState(4); // 4,3,2,1 -> shows "3,2,1,GO!" then hides

  useEffect(() => {
    engineRef.current = new ArcadeEngine(theme);
  }, [theme]);

  // countdown before play starts
  useEffect(() => {
    if (countIn <= 0) return;
    const t = setTimeout(() => setCountIn((c) => c - 1), 700);
    return () => clearTimeout(t);
  }, [countIn]);

  const finish = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const result: MissionResult = {
      sector: theme.id,
      seed,
      score: engine.score,
      collected: engine.collected,
      avoided: engine.avoided,
      hits: engine.hits,
      eventChoices: [],
      durationMs: MISSION_DURATION_MS,
      valuation: 0,
    };
    onComplete(result, valuationMultiplierRef.current, livesRef.current);
  }, [onComplete, seed, theme.id]);

  useEffect(() => {
    if (countIn > 0) return;
    let stopped = false;

    const loop = (ts: number) => {
      if (stopped) return;
      if (!lastTsRef.current) lastTsRef.current = ts;
      const dt = Math.min(48, ts - lastTsRef.current);
      lastTsRef.current = ts;
      const engine = engineRef.current;
      if (engine && !pausedRef.current) {
        const snap = engine.tick(dt, ts);
        setSnapshot(snap);

        EVENT_TIMES_MS.forEach((t, idx) => {
          if (snap.elapsedMs >= t && !firedEventsRef.current.has(idx)) {
            firedEventsRef.current.add(idx);
            pausedRef.current = true;
            const ev = EVENTS[Math.floor(Math.random() * EVENTS.length)];
            setActiveEvent(ev);
          }
        });

        if (snap.elapsedMs >= MISSION_DURATION_MS) {
          stopped = true;
          finish();
          return;
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      stopped = true;
      cancelAnimationFrame(rafRef.current);
    };
  }, [countIn, finish]);

  // canvas draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !snapshot) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const shakeX = snapshot.screenShake ? (Math.random() - 0.5) * 10 * snapshot.screenShake : 0;
    ctx.save();
    ctx.translate(shakeX, 0);

    const laneW = w / LANES;

    // lane guides
    for (let i = 0; i <= LANES; i++) {
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(i * laneW, 0);
      ctx.lineTo(i * laneW, h);
      ctx.stroke();
    }

    // player row indicator
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fillRect(0, h * 0.86, w, h * 0.12);

    // entities
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const e of snapshot.entities) {
      const x = e.lane * laneW + laneW / 2;
      const y = e.y * h;
      ctx.font = `${Math.round(laneW * 0.55)}px sans-serif`;
      ctx.shadowColor = e.color;
      ctx.shadowBlur = 14;
      ctx.fillText(e.glyph, x, y);
      ctx.shadowBlur = 0;
    }

    // player
    const px = snapshot.playerLane * laneW + laneW / 2;
    const py = h * 0.92;
    ctx.font = `${Math.round(laneW * 0.7)}px sans-serif`;
    ctx.shadowColor = snapshot.shieldActive ? "#60A5FA" : theme.accent;
    ctx.shadowBlur = snapshot.shieldActive ? 28 : 16;
    ctx.fillText(theme.playerGlyph, px, py);
    ctx.shadowBlur = 0;

    // floating texts
    ctx.font = "bold 18px sans-serif";
    for (const f of snapshot.floatingTexts) {
      ctx.globalAlpha = Math.max(0, f.life);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.lane * laneW + laneW / 2, f.y * h);
    }
    ctx.globalAlpha = 1;

    ctx.restore();
  }, [snapshot, theme]);

  // touch / click controls: tap left half / right half, or swipe
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let touchStartX: number | null = null;

    const handleTap = (clientX: number) => {
      const rect = canvas.getBoundingClientRect();
      const relX = clientX - rect.left;
      const engine = engineRef.current;
      if (!engine) return;
      const lane = Math.floor((relX / rect.width) * LANES);
      engine.setLane(lane);
    };

    const onPointerDown = (ev: PointerEvent) => {
      touchStartX = ev.clientX;
      handleTap(ev.clientX);
    };
    canvas.addEventListener("pointerdown", onPointerDown);
    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  // keyboard for desktop testing
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine) return;
      if (e.key === "ArrowLeft") engine.moveLeft();
      if (e.key === "ArrowRight") engine.moveRight();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleChoice = (choice: RandomEventChoice) => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.applyEventEffect(choice);
    if (choice.valuationMultiplier) {
      valuationMultiplierRef.current *= choice.valuationMultiplier;
    }
    if (choice.livesDelta) {
      livesRef.current = Math.max(0, livesRef.current + choice.livesDelta);
    }
    setActiveEvent(null);
    pausedRef.current = false;
    lastTsRef.current = 0;
  };

  const remainingSec = snapshot ? Math.ceil(snapshot.remainingMs / 1000) : 45;

  return (
    <div
      className="relative w-full h-full overflow-hidden touch-none select-none"
      style={{
        background: `linear-gradient(160deg, ${theme.gradient[0]}, ${theme.gradient[1]})`,
      }}
    >
      {/* HUD */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3 text-white">
        <div className="flex items-center gap-2 bg-black/30 rounded-full px-3 py-1 backdrop-blur">
          <span className="text-lg">⏱</span>
          <span className="font-bold tabular-nums">{remainingSec}s</span>
        </div>
        <div className="flex items-center gap-2 bg-black/30 rounded-full px-4 py-1 backdrop-blur">
          <span className="text-lg">✨</span>
          <span className="font-extrabold text-xl tabular-nums">{snapshot?.score ?? 0}</span>
        </div>
      </div>

      <AnimatePresence>
        {snapshot?.activePowerupLabel && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute top-14 left-1/2 -translate-x-1/2 z-20 px-4 py-1 rounded-full text-sm font-bold text-black shadow-lg"
            style={{ background: theme.accent }}
          >
            {snapshot.activePowerupLabel}
          </motion.div>
        )}
      </AnimatePresence>

      {snapshot && snapshot.combo >= 3 && (
        <motion.div
          key={snapshot.combo}
          initial={{ scale: 1.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute top-24 left-1/2 -translate-x-1/2 z-20 text-yellow-300 font-black text-lg drop-shadow"
        >
          {snapshot.combo}x COMBO!
        </motion.div>
      )}

      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* countdown overlay */}
      <AnimatePresence>
        {countIn > 0 && (
          <motion.div
            key={countIn}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1.2, opacity: 1 }}
            exit={{ scale: 2, opacity: 0 }}
            className="absolute inset-0 z-30 flex items-center justify-center bg-black/60"
          >
            <span className="text-white text-8xl font-black">
              {countIn === 1 ? "GO!" : countIn - 1}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* random event modal */}
      <AnimatePresence>
        {activeEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 px-5"
          >
            <motion.div
              initial={{ y: 40, scale: 0.9, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 16 }}
              className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl"
            >
              <div className="text-4xl mb-2">{activeEvent.icon}</div>
              <h3 className="text-xl font-black text-slate-900">{activeEvent.title}</h3>
              <p className="text-sm text-slate-500 mb-4">
                {activeEvent.flavor.replace("{sector}", theme.name)}
              </p>
              <div className="flex flex-col gap-2">
                {activeEvent.choices.map((c) => (
                  <button
                    key={c.label}
                    onClick={() => handleChoice(c)}
                    className="text-left rounded-xl border-2 border-slate-100 hover:border-slate-300 active:scale-[0.98] transition px-4 py-2.5"
                    style={{ borderColor: theme.accent + "40" }}
                  >
                    <div className="font-bold text-slate-900">{c.label}</div>
                    <div className="text-xs text-slate-500">{c.description}</div>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
