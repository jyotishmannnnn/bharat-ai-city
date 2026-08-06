"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import eventsData from "@/data/events.json";
import {
  ArcadeEngine,
  MISSION_DURATION_MS,
  EVENT_TIMES_MS,
  EngineSnapshot,
} from "@/game/engine";
import {
  SectorTheme,
  MissionSeed,
  MissionResult,
  RandomEventDef,
  RandomEventChoice,
} from "@/game/types";
import { RetroRenderer } from "@/game/retro/renderer";
import { chiptune, haptics } from "@/lib/chiptune";

const EVENTS = eventsData as RandomEventDef[];

interface Props {
  theme: SectorTheme;
  seed: MissionSeed;
  onComplete: (result: MissionResult, valuationMultiplier: number, livesTotal: number) => void;
}

export default function GameCanvas({ theme, seed, onComplete }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<RetroRenderer | null>(null);
  const engineRef = useRef<ArcadeEngine | null>(null);
  const rafRef = useRef<number>(0);
  const lastTsRef = useRef<number>(0);
  const firedEventsRef = useRef<Set<number>>(new Set());
  const valuationMultiplierRef = useRef(1);
  const livesRef = useRef(3);
  const pausedRef = useRef(false);

  // Latest snapshot lives in a ref, not state: the HUD is now drawn on the
  // pixel canvas, so we no longer re-render React 60x/second.
  const snapRef = useRef<EngineSnapshot | null>(null);
  const seenTextIds = useRef<Set<number>>(new Set());
  const lastComboRef = useRef(0);

  const [activeEvent, setActiveEvent] = useState<RandomEventDef | null>(null);
  const [countIn, setCountIn] = useState(4); // 4,3,2,1 -> shows "3,2,1,GO!" then hides
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    engineRef.current = new ArcadeEngine(theme);
  }, [theme]);

  // --- retro canvas setup -------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new RetroRenderer(canvas);
    rendererRef.current = renderer;

    const applySize = () => {
      const rect = canvas.getBoundingClientRect();
      renderer.resize(rect.width, rect.height);
    };
    applySize();

    const ro = new ResizeObserver(applySize);
    ro.observe(canvas);
    return () => {
      ro.disconnect();
      rendererRef.current = null;
    };
  }, []);

  // --- audio lifecycle ----------------------------------------------------
  useEffect(() => {
    chiptune.init();
    return () => chiptune.stopBgm();
  }, []);

  useEffect(() => {
    if (countIn > 0) return;
    chiptune.startBgm();
    return () => chiptune.stopBgm();
  }, [countIn]);

  // countdown before play starts (timing unchanged: 700ms per beat)
  useEffect(() => {
    if (countIn <= 0) return;
    const t = setTimeout(() => setCountIn((c) => c - 1), 700);
    return () => clearTimeout(t);
  }, [countIn]);

  useEffect(() => {
    if (countIn <= 0) return;
    if (countIn === 1) {
      chiptune.go();
      haptics.medium();
    } else {
      chiptune.countdownTick();
      haptics.light();
    }
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
    chiptune.stopBgm();
    chiptune.fanfare();
    haptics.pattern([20, 40, 20, 40, 60]);
    onComplete(result, valuationMultiplierRef.current, livesRef.current);
  }, [onComplete, seed, theme.id]);

  /** Turn engine-emitted floating texts into SFX, haptics and pixel particles.
   *  Read-only: the engine is never told the renderer or audio exist. */
  const reactToEvents = useCallback((snap: EngineSnapshot) => {
    const renderer = rendererRef.current;
    for (const f of snap.floatingTexts) {
      if (seenTextIds.current.has(f.id)) continue;
      seenTextIds.current.add(f.id);

      if (f.text === "BLOCKED") {
        chiptune.blocked();
        haptics.medium();
        renderer?.burst("powerup", f.x, f.color);
      } else if (f.text.startsWith("+")) {
        chiptune.collect(snap.combo);
        haptics.light();
        renderer?.burst("collect", f.x, f.color);
      } else if (f.text.startsWith("-")) {
        chiptune.hit();
        haptics.heavy();
        renderer?.burst("hit", f.x, f.color);
      } else {
        chiptune.powerup();
        haptics.pattern([15, 30, 15]);
        renderer?.burst("powerup", f.x, f.color);
      }
    }
    if (seenTextIds.current.size > 600) seenTextIds.current.clear();

    // Combo milestones get their own stronger buzz.
    if (snap.combo !== lastComboRef.current) {
      if (snap.combo > 0 && snap.combo % 5 === 0 && snap.combo > lastComboRef.current) {
        haptics.pattern([12, 25, 12]);
      }
      lastComboRef.current = snap.combo;
    }
  }, []);

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
        snapRef.current = snap;
        reactToEvents(snap);

        EVENT_TIMES_MS.forEach((t, idx) => {
          if (snap.elapsedMs >= t && !firedEventsRef.current.has(idx)) {
            firedEventsRef.current.add(idx);
            pausedRef.current = true;
            const ev = EVENTS[Math.floor(Math.random() * EVENTS.length)];
            setActiveEvent(ev);
            chiptune.uiTap();
            haptics.medium();
          }
        });

        if (snap.elapsedMs >= MISSION_DURATION_MS) {
          stopped = true;
          finish();
          return;
        }
      }

      // Render every frame -- while paused, dt=0 freezes particles but keeps
      // the modal sitting over a live-looking scene.
      const renderer = rendererRef.current;
      if (renderer && snapRef.current) {
        renderer.render(snapRef.current, theme, ts, pausedRef.current ? 0 : dt);
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      stopped = true;
      cancelAnimationFrame(rafRef.current);
    };
  }, [countIn, finish, reactToEvents, theme]);

  // Drag-anywhere controls. The player tracks the pointer's X from ANY point on
  // the screen, so a thumb held low and central never covers the actor or the
  // collision row -- which it would if you had to drag the sprite itself.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let dragging = false;

    const moveTo = (clientX: number) => {
      const engine = engineRef.current;
      if (!engine) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0) return;
      engine.setPlayerX((clientX - rect.left) / rect.width);
    };

    const onPointerDown = (ev: PointerEvent) => {
      chiptune.init(); // iOS unlocks audio only inside a gesture
      dragging = true;
      // Capture so the drag survives the finger leaving the canvas bounds.
      try {
        canvas.setPointerCapture(ev.pointerId);
      } catch {
        /* capture unsupported -- plain listeners still work */
      }
      moveTo(ev.clientX);
      ev.preventDefault();
    };

    const onPointerMove = (ev: PointerEvent) => {
      if (!dragging) return;
      moveTo(ev.clientX);
      ev.preventDefault();
    };

    const stop = (ev: PointerEvent) => {
      dragging = false;
      try {
        canvas.releasePointerCapture(ev.pointerId);
      } catch {
        /* nothing captured */
      }
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", stop);
    canvas.addEventListener("pointercancel", stop);
    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", stop);
      canvas.removeEventListener("pointercancel", stop);
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
    chiptune.uiTap();
    haptics.light();
    setActiveEvent(null);
    pausedRef.current = false;
    lastTsRef.current = 0;
  };

  const toggleMute = () => {
    chiptune.init();
    setMuted(chiptune.toggleMute());
  };

  return (
    <div
      className="relative w-full h-full overflow-hidden touch-none select-none bg-[#0f0f17]"
    >
      <canvas ref={canvasRef} className="pixel-canvas w-full h-full block" />

      {/* mute toggle -- bottom corner so it never overlaps the canvas HUD */}
      <button
        onClick={toggleMute}
        aria-label={muted ? "Unmute" : "Mute"}
        style={{ bottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
        className="pixel-btn font-pixel absolute right-3 z-30 bg-[#2c2c46] text-[#d4d4e4] text-[8px] px-2 py-1.5"
      >
        {muted ? "SND OFF" : "SND ON"}
      </button>

      {/* countdown overlay */}
      {countIn > 0 && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#0f0f17]/80">
          <span
            key={countIn}
            className="font-pixel text-[#f7e04c] text-5xl pixel-blink"
            style={{ textShadow: "4px 4px 0 #0f0f17" }}
          >
            {countIn === 1 ? "GO!" : countIn - 1}
          </span>
        </div>
      )}

      {/* random event modal */}
      {activeEvent && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#0f0f17]/85 px-4">
          <div className="pixel-panel font-pixel w-full max-w-sm bg-[#1b1b2e] p-4">
            <div className="text-3xl mb-2">{activeEvent.icon}</div>
            <h3 className="text-[11px] leading-relaxed text-[#f7e04c] mb-2">
              {activeEvent.title.toUpperCase()}
            </h3>
            <p className="text-[8px] leading-relaxed text-[#9a9ab5] mb-4">
              {activeEvent.flavor.replace("{sector}", theme.name)}
            </p>
            <div className="flex flex-col gap-2.5">
              {activeEvent.choices.map((c) => (
                <button
                  key={c.label}
                  onClick={() => handleChoice(c)}
                  className="pixel-btn text-left bg-[#2c2c46] px-3 py-2.5"
                >
                  <div className="text-[9px] leading-relaxed text-[#d4d4e4]">
                    {c.label.toUpperCase()}
                  </div>
                  <div className="text-[7px] leading-relaxed text-[#6b6b8c] mt-1">
                    {c.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
