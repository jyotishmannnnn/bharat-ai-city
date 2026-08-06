"use client";

import { useEffect, useRef, useState } from "react";

/** Counts from 0 to `target`, stepping in discrete jumps rather than a smooth
 *  tween -- an 8-bit scoreboard ticks, it doesn't glide. Honours
 *  prefers-reduced-motion by jumping straight to the final value. */
export function useCountUp(target: number, durationMs = 900, delayMs = 0): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef(0);

  useEffect(() => {
    let start = 0;
    let stopped = false;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    // Snap straight to the final value, but do it inside a frame callback
    // rather than synchronously in the effect body, which would cascade renders.
    if (reduced || target <= 0 || durationMs <= 0) {
      rafRef.current = requestAnimationFrame(() => {
        if (!stopped) setValue(target);
      });
      return () => {
        stopped = true;
        cancelAnimationFrame(rafRef.current);
      };
    }
    const STEPS = 24; // quantise so digits visibly tick

    const tick = (ts: number) => {
      if (stopped) return;
      if (!start) start = ts;
      const elapsed = ts - start - delayMs;
      if (elapsed < 0) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const t = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      const stepped = Math.round(eased * STEPS) / STEPS;
      setValue(Math.round(target * stepped));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else setValue(target);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      cancelAnimationFrame(rafRef.current);
    };
  }, [target, durationMs, delayMs]);

  return value;
}
