"use client";

// Presenter-triggered ending (key "M"). The city keeps breathing underneath
// (CityCanvas gets `ending` and slow-zooms out on its own) while this overlay
// reveals the final tally, then settles on branding.

import { motion, AnimatePresence } from "framer-motion";
import { CityMetrics } from "@/lib/cityAggregate";
import { PoweredBy } from "@/components/retro/PoweredBy";

const ROWS: { key: keyof CityMetrics; label: string; color: string }[] = [
  { key: "founders", label: "AI STARTUPS", color: "var(--p-yellow)" },
  { key: "population", label: "CITIZENS REACHED", color: "var(--p-lime)" },
  { key: "jobs", label: "JOBS CREATED", color: "var(--p-cyan)" },
  { key: "gdpCr", label: "GDP ADDED (CR)", color: "var(--p-amber)" },
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
        transition={{ duration: 1 }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center font-pixel"
        style={{ background: "rgba(15,15,23,0.92)" }}
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center mb-10"
        >
          <div className="text-[var(--p-cyan)]" style={{ fontSize: 13 }}>
            BHARAT AI CITY
          </div>
          <div
            className="text-[var(--p-yellow)]"
            style={{ fontSize: 44, marginTop: 18, textShadow: "6px 6px 0 var(--p-blood)" }}
          >
            BUILT TODAY
          </div>
        </motion.div>

        <div className="grid grid-cols-2 gap-5 mb-9">
          {ROWS.map((row, i) => (
            <motion.div
              key={row.key}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8 + i * 0.25, type: "spring", damping: 15 }}
              className="pixel-panel text-center px-9 py-6"
              style={{ background: "var(--p-deep)", borderWidth: 4, minWidth: 280 }}
            >
              <div className="tabular-nums" style={{ fontSize: 32, color: row.color }}>
                {metrics[row.key].toLocaleString("en-IN")}
              </div>
              <div className="text-[var(--p-silver)]" style={{ fontSize: 11, marginTop: 14 }}>
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
            className="text-[var(--p-silver)] mb-9"
            style={{ fontSize: 14 }}
          >
            TOP SECTOR:{" "}
            <span className="text-[var(--p-amber)]">{topDistrictName.toUpperCase()}</span>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.6 }}
          className="text-[var(--p-white)]"
          style={{ fontSize: 22 }}
        >
          THANK YOU, FOUNDERS
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3.4 }}
          className="mt-8"
        >
          <PoweredBy height={34} />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
