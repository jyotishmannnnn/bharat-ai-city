"use client";

import { allSectors, useGameStore } from "@/lib/store";
import { BuildingSprite } from "@/components/retro/PixelSprite";
import { chiptune, haptics } from "@/lib/chiptune";
import { MISSIONS_PER_RUN } from "@/lib/gameConfig";

export default function SectorSelect() {
  const sectors = allSectors();
  const chosenSectors = useGameStore((s) => s.chosenSectors);
  const toggleSector = useGameStore((s) => s.toggleSector);
  const confirmSectors = useGameStore((s) => s.confirmSectors);

  const ready = chosenSectors.length === MISSIONS_PER_RUN;
  const remaining = MISSIONS_PER_RUN - chosenSectors.length;

  const pick = (id: (typeof sectors)[number]["id"], disabled: boolean) => {
    chiptune.init();
    if (disabled) {
      chiptune.blocked();
      haptics.heavy();
      return;
    }
    chiptune.uiTap();
    haptics.light();
    toggleSector(id);
  };

  return (
    <div className="pixel-screen crt w-full h-full overflow-y-auto px-4 pt-7 pb-28">
      <div className="text-center mb-5">
        <h2 className="text-[13px] leading-relaxed text-[var(--p-yellow)]">
          PICK {MISSIONS_PER_RUN} SECTORS
        </h2>
        <p className="text-[8px] leading-relaxed text-[var(--p-silver)] mt-3">
          SELECTED {chosenSectors.length}/{MISSIONS_PER_RUN}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {sectors.map((s) => {
          const selected = chosenSectors.includes(s.id);
          const order = chosenSectors.indexOf(s.id);
          const disabled = !selected && ready;
          return (
            <button
              key={s.id}
              onClick={() => pick(s.id, disabled)}
              aria-pressed={selected}
              className="pixel-btn relative p-2.5 text-left"
              style={{
                background: selected ? "var(--p-slate)" : "var(--p-deep)",
                borderColor: selected ? "var(--p-yellow)" : "var(--p-black)",
                opacity: disabled ? 0.45 : 1,
              }}
            >
              {selected && (
                <div className="absolute top-1 right-1 w-5 h-5 bg-[var(--p-yellow)] text-[var(--p-black)] text-[9px] flex items-center justify-center">
                  {order + 1}
                </div>
              )}
              <BuildingSprite sector={s.id} size={2} />
              <div className="text-[8px] leading-[1.6] text-[var(--p-white)] mt-2">
                {s.name.toUpperCase()}
              </div>
              <div className="text-[6px] leading-[1.7] text-[var(--p-silver)] mt-1">
                {s.tagline.toUpperCase()}
              </div>
            </button>
          );
        })}
      </div>

      <div className="safe-bottom fixed bottom-0 left-0 right-0 px-3 pt-3 bg-[var(--p-black)] border-t-[3px] border-[var(--p-shadow)]">
        <button
          onClick={() => {
            chiptune.init();
            chiptune.uiTap();
            haptics.medium();
            confirmSectors();
          }}
          disabled={!ready}
          className="pixel-btn font-pixel w-full py-4 text-[10px] leading-relaxed"
          style={{
            background: ready ? "var(--p-lime)" : "var(--p-shadow)",
            color: ready ? "var(--p-black)" : "var(--p-slate-l)",
          }}
        >
          {ready
            ? "LAUNCH MISSIONS"
            : `PICK ${remaining} MORE`}
        </button>
      </div>
    </div>
  );
}
