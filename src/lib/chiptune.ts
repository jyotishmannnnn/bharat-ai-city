// Chiptune audio engine -- pure Web Audio synthesis, zero asset files.
//
// Channels mirror the NES APU layout:
//   square  -> melody / SFX blips
//   triangle-> bass
//   noise   -> percussion, hits, explosions
//
// iOS/Safari will not start an AudioContext outside a user gesture, so nothing
// is created until `init()` is called from a real pointer/key event.

type Channel = "square" | "triangle" | "sawtooth" | "sine";

const MIDI_A4 = 69;
const FREQ_A4 = 440;

function midiToFreq(m: number): number {
  return FREQ_A4 * Math.pow(2, (m - MIDI_A4) / 12);
}

class Chiptune {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private muted = false;
  private bgmTimer: ReturnType<typeof setInterval> | null = null;
  private nextStepTime = 0;
  private step = 0;

  get enabled(): boolean {
    return this.ctx !== null && !this.muted;
  }

  get isMuted(): boolean {
    return this.muted;
  }

  /** Must be called from inside a user-gesture handler. Safe to call repeatedly. */
  init(): void {
    if (typeof window === "undefined") return;
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return;

    try {
      const ctx = new Ctor();
      const master = ctx.createGain();
      master.gain.value = this.muted ? 0 : 0.8;
      master.connect(ctx.destination);

      const musicGain = ctx.createGain();
      musicGain.gain.value = 0.28;
      musicGain.connect(master);

      const sfxGain = ctx.createGain();
      sfxGain.gain.value = 0.85;
      sfxGain.connect(master);

      // Pre-render one second of white noise for percussion / impacts.
      const len = Math.floor(ctx.sampleRate * 1.0);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

      this.ctx = ctx;
      this.master = master;
      this.musicGain = musicGain;
      this.sfxGain = sfxGain;
      this.noiseBuffer = buf;
      if (ctx.state === "suspended") void ctx.resume();
    } catch {
      // Audio is a nice-to-have; never let it break gameplay.
      this.ctx = null;
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.8, this.ctx.currentTime, 0.02);
    }
  }

  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  // ------------------------------------------------------------------ core ---

  private tone(opts: {
    type: Channel;
    freq: number;
    endFreq?: number;
    duration: number;
    volume?: number;
    delay?: number;
    dest?: GainNode | null;
  }): void {
    const ctx = this.ctx;
    const dest = opts.dest ?? this.sfxGain;
    if (!ctx || !dest) return;

    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = opts.type;
    osc.frequency.setValueAtTime(opts.freq, t0);
    if (opts.endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(1, opts.endFreq),
        t0 + opts.duration
      );
    }

    const vol = opts.volume ?? 0.3;
    // Hard attack + exponential decay = classic square-wave blip envelope.
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.duration);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(t0);
    osc.stop(t0 + opts.duration + 0.02);
  }

  private noise(opts: {
    duration: number;
    volume?: number;
    delay?: number;
    highpass?: number;
    lowpass?: number;
    dest?: GainNode | null;
  }): void {
    const ctx = this.ctx;
    const dest = opts.dest ?? this.sfxGain;
    if (!ctx || !dest || !this.noiseBuffer) return;

    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    if (opts.highpass) {
      filter.type = "highpass";
      filter.frequency.value = opts.highpass;
    } else {
      filter.type = "lowpass";
      filter.frequency.value = opts.lowpass ?? 2200;
    }

    const gain = ctx.createGain();
    const vol = opts.volume ?? 0.25;
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    src.start(t0);
    src.stop(t0 + opts.duration + 0.02);
  }

  // ------------------------------------------------------------------- sfx ---

  /** Pickup blip. Pitch climbs with the combo streak so a run *sounds* hotter. */
  collect(combo = 0): void {
    const stepUp = Math.min(12, combo);
    const base = midiToFreq(72 + stepUp);
    this.tone({ type: "square", freq: base, duration: 0.07, volume: 0.22 });
    this.tone({
      type: "square",
      freq: base * 1.5,
      duration: 0.06,
      volume: 0.14,
      delay: 0.045,
    });
  }

  hit(): void {
    this.noise({ duration: 0.22, volume: 0.34, lowpass: 900 });
    this.tone({
      type: "square",
      freq: 190,
      endFreq: 55,
      duration: 0.26,
      volume: 0.26,
    });
  }

  blocked(): void {
    this.tone({ type: "square", freq: 520, endFreq: 900, duration: 0.1, volume: 0.2 });
    this.noise({ duration: 0.09, volume: 0.16, highpass: 3000 });
  }

  powerup(): void {
    // Rising arpeggio -- the classic "you got something good" cue.
    [0, 4, 7, 12].forEach((semi, i) => {
      this.tone({
        type: "square",
        freq: midiToFreq(69 + semi),
        duration: 0.09,
        volume: 0.2,
        delay: i * 0.05,
      });
    });
  }

  countdownTick(): void {
    this.tone({ type: "square", freq: midiToFreq(76), duration: 0.09, volume: 0.24 });
  }

  go(): void {
    [76, 81, 88].forEach((n, i) =>
      this.tone({
        type: "square",
        freq: midiToFreq(n),
        duration: 0.16,
        volume: 0.28,
        delay: i * 0.07,
      })
    );
    this.noise({ duration: 0.2, volume: 0.18, highpass: 2000, delay: 0.14 });
  }

  uiTap(): void {
    this.tone({ type: "square", freq: 660, duration: 0.045, volume: 0.16 });
  }

  fanfare(): void {
    const notes = [72, 76, 79, 84, 79, 84, 88];
    notes.forEach((n, i) =>
      this.tone({
        type: "square",
        freq: midiToFreq(n),
        duration: 0.18,
        volume: 0.24,
        delay: i * 0.11,
      })
    );
    [48, 52, 55].forEach((n, i) =>
      this.tone({
        type: "triangle",
        freq: midiToFreq(n),
        duration: 0.5,
        volume: 0.3,
        delay: i * 0.11,
      })
    );
  }

  // ------------------------------------------------------------------- bgm ---
  // 16th-note step sequencer with lookahead scheduling (the standard Web Audio
  // pattern -- setInterval is only used to *schedule*, never to time notes).

  private static readonly BPM = 148;
  private static readonly STEPS = 32;

  /** Am - F - C - G, one chord per 8 steps. */
  private static readonly BASS = [45, 41, 48, 43];
  private static readonly LEAD: number[][] = [
    [69, 72, 76, 72],
    [65, 69, 72, 69],
    [67, 72, 76, 79],
    [67, 71, 74, 71],
  ];

  startBgm(): void {
    if (!this.ctx || this.bgmTimer) return;
    this.step = 0;
    this.nextStepTime = this.ctx.currentTime + 0.1;
    this.bgmTimer = setInterval(() => this.scheduleBgm(), 25);
  }

  stopBgm(): void {
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  private scheduleBgm(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const stepDur = 60 / Chiptune.BPM / 4; // 16th note

    while (this.nextStepTime < ctx.currentTime + 0.12) {
      const s = this.step % Chiptune.STEPS;
      const chord = Math.floor(s / 8) % Chiptune.BASS.length;
      const delay = Math.max(0, this.nextStepTime - ctx.currentTime);

      // Triangle bass on every 4th step.
      if (s % 4 === 0) {
        this.tone({
          type: "triangle",
          freq: midiToFreq(Chiptune.BASS[chord]),
          duration: stepDur * 3.2,
          volume: 0.5,
          delay,
          dest: this.musicGain,
        });
      }

      // Square lead arpeggio on every 2nd step.
      if (s % 2 === 0) {
        const arp = Chiptune.LEAD[chord];
        const note = arp[(s / 2) % arp.length];
        this.tone({
          type: "square",
          freq: midiToFreq(note),
          duration: stepDur * 1.6,
          volume: 0.16,
          delay,
          dest: this.musicGain,
        });
      }

      // Noise hat on offbeats, accented kick-ish hit on the downbeat.
      if (s % 4 === 2) {
        this.noise({
          duration: 0.03,
          volume: 0.07,
          highpass: 6000,
          delay,
          dest: this.musicGain,
        });
      }
      if (s % 8 === 0) {
        this.noise({
          duration: 0.07,
          volume: 0.12,
          lowpass: 400,
          delay,
          dest: this.musicGain,
        });
      }

      this.nextStepTime += stepDur;
      this.step++;
    }
  }

  dispose(): void {
    this.stopBgm();
    if (this.ctx) {
      void this.ctx.close().catch(() => {});
      this.ctx = null;
      this.master = null;
      this.musicGain = null;
      this.sfxGain = null;
    }
  }
}

export const chiptune = new Chiptune();

/** Haptics -- free tactile feedback on mobile, no-op on desktop/unsupported. */
export const haptics = {
  light() {
    try {
      navigator.vibrate?.(10);
    } catch {
      /* unsupported */
    }
  },
  medium() {
    try {
      navigator.vibrate?.(25);
    } catch {
      /* unsupported */
    }
  },
  heavy() {
    try {
      navigator.vibrate?.(45);
    } catch {
      /* unsupported */
    }
  },
  pattern(p: number[]) {
    try {
      navigator.vibrate?.(p);
    } catch {
      /* unsupported */
    }
  },
};
