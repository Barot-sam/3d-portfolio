"use client";

import { SECTION_THRESHOLDS, useScrollStore } from "@/store/scrollStore";
import gsap from "gsap";
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
  const nitro = useScrollStore((s) => s.nitro);
  const boosting = useScrollStore((s) => s.boosting);
  const speed = useScrollStore((s) => s.speed);
  const setRacing = useScrollStore((s) => s.setRacing);
  const reset = useScrollStore((s) => s.reset);
  const speedRef = useRef<HTMLDivElement>(null);
  const [lapTime, setLapTime] = useState("0:00.000");
  const sectionLabelRef = useRef<HTMLDivElement>(null);
  const prevSection = useRef(activeSection);

  // Update speed display directly from physics
  useEffect(() => {
    if (speedRef.current) {
      speedRef.current.textContent = String(speed);
    }
  }, [speed]);

  // Animate section label swap
  useEffect(() => {
    if (prevSection.current !== activeSection && sectionLabelRef.current) {
      gsap.fromTo(
        sectionLabelRef.current,
        { opacity: 0, y: -10 },
        { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" },
      );
      prevSection.current = activeSection;
    }
  }, [activeSection]);

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
        <div
          ref={sectionLabelRef}
          className="bg-[#0d0a07cc] border border-[#c4722a44] rounded-lg px-4 py-1.5 backdrop-blur-sm"
        >
          <div className="font-pixel text-[8px] text-[#c4722a] tracking-wider text-center">
            {sectionIcons[activeSection]} {sectionLabels[activeSection]}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-[#0d0a07cc] border border-[#2e2415] rounded-lg px-3 py-1.5 backdrop-blur-sm">
            <div className="font-pixel text-[7px] text-[#6a5840] tracking-wider">
              POS
            </div>
            <div className="font-pixel text-xs text-[#5aaa40]">P1</div>
          </div>
          <button
            onClick={() => {
              setRacing(false);
              reset();
              window.location.reload();
            }}
            className="pointer-events-auto bg-[#0d0a07cc] border border-[#c4722a66] rounded-lg px-3 py-1.5 backdrop-blur-sm cursor-pointer transition-all hover:border-[#c4722a] hover:bg-[#c4722a22] hover:scale-105 active:scale-95"
          >
            <div className="font-pixel text-[7px] text-[#c4722a] tracking-wider">
              STOP
            </div>
            <div className="font-pixel text-[8px] text-[#f0a040]">■ RACE</div>
          </button>
        </div>
      </div>

      {/* Bottom bar — Speed + progress */}
      <div className="absolute bottom-0 left-0 right-0 px-4 py-3 sm:px-6 flex items-end justify-between">
        {/* Speed + Nitro */}
        <div className="flex items-end gap-2">
          <div className="bg-[#0d0a07cc] border border-[#2e2415] rounded-lg px-4 py-2 backdrop-blur-sm">
            <div className="font-pixel text-[7px] text-[#6a5840] tracking-wider">KM/H</div>
            <div ref={speedRef} className="font-mono text-2xl text-[#f0a040] font-bold tabular-nums">0</div>
          </div>
          <div className={`bg-[#0d0a07cc] border rounded-lg px-3 py-2 backdrop-blur-sm transition-colors ${boosting ? "border-[#00eeff]" : "border-[#2e2415]"}`}>
            <div className={`font-pixel text-[7px] tracking-wider mb-1 ${boosting ? "text-[#00eeff]" : "text-[#6a5840]"}`}>
              {boosting ? "BOOST!" : "NITRO"}
            </div>
            <div className="flex flex-col gap-0.75">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="w-3 h-1.5 rounded-sm transition-all duration-75"
                  style={{
                    background: nitro >= (10 - i) / 10
                      ? boosting ? "#00eeff" : "#22aaff"
                      : "#1a1a2a",
                    boxShadow: nitro >= (10 - i) / 10 && boosting ? "0 0 4px #00eeff" : "none",
                  }}
                />
              ))}
            </div>
            <div className="font-pixel text-[6px] text-[#4a5870] mt-1 text-center">SHIFT</div>
          </div>
        </div>

        {/* Track progress bar */}
        <div className="flex-1 mx-4 sm:mx-8 mb-1">
          <div className="relative h-2 bg-[#1a110866] rounded-full border border-[#2e241566] backdrop-blur-sm overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#c4722a] to-[#f0a040] rounded-full transition-[width] duration-100"
              style={{ width: `${progress * 100}%` }}
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
