"use client";

// Live city-wide metrics strip. Every number derives from the same runs rows
// the phones already write — no extra tables.
//
// Numbers never snap: each tick eases toward the latest value so the room
// watches the count climb. Sized for readability from the back of a hall.

import { useEffect, useRef, useState } from "react";
import { CityMetrics } from "@/lib/cityAggregate";

interface MetricDef {
  key: keyof CityMetrics;
  label: string;
  color: string;
  format: (v: number) => string;
}

const METRICS: MetricDef[] = [
  { key: "founders", label: "STARTUPS", color: "var(--p-yellow)", format: (v) => Math.round(v).toLocaleString("en-IN") },
  { key: "population", label: "CITIZENS", color: "var(--p-lime)", format: (v) => Math.round(v).toLocaleString("en-IN") },
  { key: "jobs", label: "JOBS", color: "var(--p-cyan)", format: (v) => Math.round(v).toLocaleString("en-IN") },
  { key: "gdpCr", label: "GDP CR", color: "var(--p-amber)", format: (v) => Math.round(v).toLocaleString("en-IN") },
  { key: "innovationIndex", label: "INNOV IDX", color: "var(--p-violet)", format: (v) => Math.round(v).toString() },
];

function useEased(target: number, durationMs = 900) {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);

  useEffect(() => {
    const from = fromRef.current;
    const delta = target - from;
    let raf = 0;
    let start: number | null = null;
    const tick = (now: number) => {
      if (start === null) start = now;
      const p = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = from + delta * eased;
      setValue(v);
      fromRef.current = v;
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return value;
}

function MetricTile({ def, value, big }: { def: MetricDef; value: number; big: boolean }) {
  const animated = useEased(value);
  return (
    <div
      className="pixel-panel bg-[var(--p-deep)] text-center"
      style={{ padding: big ? "18px 26px" : "10px 16px" }}
    >
      <div
        className="font-pixel tabular-nums leading-none"
        style={{ color: def.color, fontSize: big ? 40 : 24 }}
      >
        {def.format(animated)}
      </div>
      <div
        className="font-pixel text-[var(--p-silver)] leading-none"
        style={{ marginTop: big ? 14 : 9, fontSize: big ? 13 : 9 }}
      >
        {def.label}
      </div>
    </div>
  );
}

export default function MetricsBar({
  metrics,
  big = false,
}: {
  metrics: CityMetrics;
  big?: boolean;
}) {
  return (
    <div className="flex flex-wrap justify-center" style={{ gap: big ? 16 : 10 }}>
      {METRICS.map((def) => (
        <MetricTile key={def.key} def={def} value={metrics[def.key]} big={big} />
      ))}
    </div>
  );
}
