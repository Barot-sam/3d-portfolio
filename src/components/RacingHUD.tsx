"use client";

import { SECTION_THRESHOLDS, useScrollStore } from "@/store/scrollStore";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const sectionLabels: Record<string, string> = {
  hero: "START GRID",
  about: "PIT STOP 1 — ABOUT",
  projects: "PIT STOP 2 — PROJECTS",
  skills: "PIT STOP 3 — SKILLS",
  experience: "PIT STOP 4 — EXPERIENCE",
  contact: "FINISH LINE — CONTACT",
};

const sectionIcons: Record<string, string> = {
  hero: "🏁",
  about: "👤",
  projects: "🏗️",
  skills: "⚡",
  experience: "🏆",
  contact: "📡",
};

export default function RacingHUD() {
  const progress = useScrollStore((s) => s.progress);
  const activeSection = useScrollStore((s) => s.activeSection);
  const lap = useScrollStore((s) => s.lap);
  const setRacing = useScrollStore((s) => s.setRacing);
  const reset = useScrollStore((s) => s.reset);
  const [displaySpeed, setDisplaySpeed] = useState(0);
  const [lapTime, setLapTime] = useState("0:00.000");
  const prevProgress = useRef(0);

  // Calculate fake speed from scroll delta
  useEffect(() => {
    const delta = Math.abs(progress - prevProgress.current);
    const speed = Math.min(Math.floor(delta * 15000), 350);
    setDisplaySpeed((prev) => prev + (speed - prev) * 0.1);
    prevProgress.current = progress;
  }, [progress]);

  // Fake running lap time
  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const mins = Math.floor(elapsed / 60000);
      const secs = Math.floor((elapsed % 60000) / 1000);
      const ms = elapsed % 1000;
      setLapTime(
        `${mins}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`,
      );
    }, 47);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {/* Top bar — Lap info */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-2 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="bg-[#0d0a07cc] border border-[#2e2415] rounded-lg px-3 py-1.5 backdrop-blur-sm">
            <div className="font-pixel text-[7px] text-[#6a5840] tracking-wider">
              LAP
            </div>
            <div className="font-pixel text-xs text-[#c4722a]">{lap}/∞</div>
          </div>
          <div className="bg-[#0d0a07cc] border border-[#2e2415] rounded-lg px-3 py-1.5 backdrop-blur-sm">
            <div className="font-pixel text-[7px] text-[#6a5840] tracking-wider">
              TIME
            </div>
            <div className="font-mono text-xs text-[#f0a040]">{lapTime}</div>
          </div>
        </div>

        {/* Current section */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="bg-[#0d0a07cc] border border-[#c4722a44] rounded-lg px-4 py-1.5 backdrop-blur-sm"
          >
            <div className="font-pixel text-[8px] text-[#c4722a] tracking-wider text-center">
              {sectionIcons[activeSection]} {sectionLabels[activeSection]}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center gap-3">
          <div className="bg-[#0d0a07cc] border border-[#2e2415] rounded-lg px-3 py-1.5 backdrop-blur-sm">
            <div className="font-pixel text-[7px] text-[#6a5840] tracking-wider">
              POS
            </div>
            <div className="font-pixel text-xs text-[#5aaa40]">P1</div>
          </div>
          <motion.button
            onClick={() => {
              setRacing(false);
              reset();
              window.location.reload();
            }}
            className="pointer-events-auto bg-[#0d0a07cc] border border-[#c4722a66] rounded-lg px-3 py-1.5 backdrop-blur-sm cursor-pointer hover:border-[#c4722a] hover:bg-[#c4722a22] transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="font-pixel text-[7px] text-[#c4722a] tracking-wider">
              STOP
            </div>
            <div className="font-pixel text-[8px] text-[#f0a040]">■ RACE</div>
          </motion.button>
        </div>
      </div>

      {/* Bottom bar — Speed + progress */}
      <div className="absolute bottom-0 left-0 right-0 px-4 py-3 sm:px-6 flex items-end justify-between">
        {/* Speed */}
        <div className="bg-[#0d0a07cc] border border-[#2e2415] rounded-lg px-4 py-2 backdrop-blur-sm">
          <div className="font-pixel text-[7px] text-[#6a5840] tracking-wider">
            KM/H
          </div>
          <div className="font-mono text-2xl text-[#f0a040] font-bold tabular-nums">
            {Math.floor(displaySpeed)}
          </div>
        </div>

        {/* Track progress bar */}
        <div className="flex-1 mx-4 sm:mx-8 mb-1">
          <div className="relative h-2 bg-[#1a110866] rounded-full border border-[#2e241566] backdrop-blur-sm overflow-hidden">
            <motion.div
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#c4722a] to-[#f0a040] rounded-full"
              style={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.1 }}
            />
            {/* Section markers */}
            {Object.entries(SECTION_THRESHOLDS).map(([key, val]) => (
              <div
                key={key}
                className="absolute top-1/2 -translate-y-1/2 w-1 h-3 rounded-full"
                style={{
                  left: `${val.start * 100}%`,
                  background: activeSection === key ? "#f0a040" : "#4a3c2866",
                }}
              />
            ))}
          </div>
          {/* Section labels under bar */}
          <div className="flex justify-between mt-1">
            {Object.keys(SECTION_THRESHOLDS).map((key) => (
              <div
                key={key}
                className={`font-pixel text-[5px] tracking-wider transition-colors ${
                  activeSection === key ? "text-[#c4722a]" : "text-[#4a3c28]"
                }`}
              >
                {key.toUpperCase()}
              </div>
            ))}
          </div>
        </div>

        {/* Gear indicator */}
        <div className="bg-[#0d0a07cc] border border-[#2e2415] rounded-lg px-4 py-2 backdrop-blur-sm">
          <div className="font-pixel text-[7px] text-[#6a5840] tracking-wider">
            GEAR
          </div>
          <div className="font-pixel text-xl text-[#c4722a]">
            {Math.min(Math.floor(progress * 8) + 1, 8)}
          </div>
        </div>
      </div>

      {/* Scanline effect over everything */}
      <div className="absolute inset-0 pointer-events-none opacity-20 scanline-overlay" />

      {/* Corner vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 50%, #0d0a0766 80%, #0d0a07cc 100%)",
        }}
      />
    </div>
  );
}
