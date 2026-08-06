"use client";

// Live city-wide metrics strip for the projector. Every number here is
// derived from the same runs data the phones already write — no new
// tables. Numbers never snap: each tick eases toward the latest value so
// the room watches the count climb instead of jumping.

import { useEffect, useRef, useState } from "react";
import { CityMetrics } from "@/lib/cityAggregate";

interface MetricDef {
  key: keyof CityMetrics;
  label: string;
  icon: string;
  format: (v: number) => string;
}

const METRICS: MetricDef[] = [
  { key: "founders", label: "AI Startups", icon: "🚀", format: (v) => Math.round(v).toLocaleString("en-IN") },
  { key: "population", label: "Population", icon: "👥", format: (v) => Math.round(v).toLocaleString("en-IN") },
  { key: "jobs", label: "Jobs Created", icon: "💼", format: (v) => Math.round(v).toLocaleString("en-IN") },
  { key: "gdpCr", label: "GDP", icon: "💰", format: (v) => `₹${Math.round(v).toLocaleString("en-IN")} Cr` },
  { key: "innovationIndex", label: "Innovation Index", icon: "💡", format: (v) => Math.round(v).toString() },
];

function useCountUp(target: number, durationMs = 900) {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    fromRef.current = value;
    startRef.current = null;
    let raf = 0;
    const from = fromRef.current;
    const delta = target - from;
    function tick(now: number) {
      if (startRef.current === null) startRef.current = now;
      const p = Math.min(1, (now - startRef.current) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(from + delta * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return value;
}

function MetricTile({ def, value }: { def: MetricDef; value: number }) {
  const animated = useCountUp(value);
  return (
    <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur">
      <span className="text-2xl">{def.icon}</span>
      <div>
        <div className="text-2xl font-black tabular-nums text-white leading-none">
          {def.format(animated)}
        </div>
        <div className="text-[11px] uppercase tracking-widest text-white/50 font-bold mt-0.5">
          {def.label}
        </div>
      </div>
    </div>
  );
}

export default function MetricsBar({ metrics }: { metrics: CityMetrics }) {
  return (
    <div className="flex flex-wrap gap-3 justify-center">
      {METRICS.map((def) => (
        <MetricTile key={def.key} def={def} value={metrics[def.key]} />
      ))}
    </div>
  );
}
