"use client";

// Presenter-triggered ending (key "M"). City keeps breathing underneath
// (CityCanvas gets `ending` and slow-zooms out on its own) while this
// overlay reveals the final tally, then fades to branding.

import { motion, AnimatePresence } from "framer-motion";
import { CityMetrics } from "@/lib/cityAggregate";

const ROWS: { key: keyof CityMetrics; label: string; format: (v: number) => string }[] = [
  { key: "founders", label: "AI Startups", format: (v) => v.toLocaleString("en-IN") },
  { key: "population", label: "Population Reached", format: (v) => v.toLocaleString("en-IN") },
  { key: "jobs", label: "Jobs Created", format: (v) => v.toLocaleString("en-IN") },
  { key: "gdpCr", label: "GDP Added", format: (v) => `₹${v.toLocaleString("en-IN")} Cr` },
];

export default function ClosingSequence({
  metrics,
  topDistrictName,
}: {
  metrics: CityMetrics;
  topDistrictName: string | null;
}) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/70 backdrop-blur-sm"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center mb-10"
        >
          <div className="text-sm uppercase tracking-[0.4em] text-cyan-300 font-bold">
            Bharat AI City
          </div>
          <div className="text-5xl font-black text-white mt-1">Built Today</div>
        </motion.div>

        <div className="grid grid-cols-2 gap-6 mb-10">
          {ROWS.map((row, i) => (
            <motion.div
              key={row.key}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8 + i * 0.25, type: "spring", damping: 14 }}
              className="rounded-2xl px-8 py-5 bg-white/5 border border-white/10 text-center min-w-[220px]"
            >
              <div className="text-3xl font-black text-white tabular-nums">
                {row.format(metrics[row.key])}
              </div>
              <div className="text-xs uppercase tracking-widest text-white/50 font-bold mt-1">
                {row.label}
              </div>
            </motion.div>
          ))}
        </div>

        {topDistrictName && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
            className="text-white/70 font-semibold mb-10"
          >
            Top Sector: <span className="text-amber-300 font-black">{topDistrictName}</span>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.6 }}
          className="text-2xl font-bold text-white/90"
        >
          Thank you, Founders. 🙏
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3.4 }}
          className="text-sm text-white/40 font-bold uppercase tracking-[0.3em] mt-3"
        >
          Bharat1.ai
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
