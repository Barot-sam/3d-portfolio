import { create } from "zustand";

interface ScrollState {
  progress: number;
  activeSection: string;
  speed: number;
  lap: number;
  racing: boolean;
  nitro: number; // 0–1
  boosting: boolean;
  setProgress: (progress: number) => void;
  setActiveSection: (section: string) => void;
  setSpeed: (speed: number) => void;
  setLap: (lap: number) => void;
  setRacing: (racing: boolean) => void;
  setNitro: (nitro: number, boosting: boolean) => void;
  reset: () => void;
}

export const useScrollStore = create<ScrollState>((set) => ({
  progress: 0,
  activeSection: "hero",
  speed: 0,
  lap: 1,
  racing: true,
  nitro: 1,
  boosting: false,
  setProgress: (progress) => set({ progress }),
  setActiveSection: (activeSection) => set({ activeSection }),
  setSpeed: (speed) => set({ speed }),
  setLap: (lap) => set({ lap }),
  setRacing: (racing) => set({ racing }),
  setNitro: (nitro, boosting) => set({ nitro, boosting }),
  reset: () =>
    set({ progress: 0, activeSection: "hero", speed: 0, lap: 1, racing: true, nitro: 1, boosting: false }),
}));

// Section thresholds along the track (0-1)
export const SECTION_THRESHOLDS = {
  hero: { start: 0, end: 0.12 },
  about: { start: 0.12, end: 0.28 },
  projects: { start: 0.28, end: 0.45 },
  skills: { start: 0.45, end: 0.62 },
  experience: { start: 0.62, end: 0.78 },
  contact: { start: 0.78, end: 1.0 },
} as const;
