"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";

export default function CassettePlayer() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          gsap.from(el, {
            opacity: 0,
            y: 30,
            duration: 0.6,
            ease: "power2.out",
          });
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-xl border border-[#2a1e10] bg-[#0f0c07] p-5 flex flex-col items-center gap-3.5"
    >
      {/* Scanline */}
      <div
        className="absolute inset-0 pointer-events-none rounded-xl"
        style={{
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(196,114,42,0.03) 2px, rgba(196,114,42,0.03) 4px)",
        }}
      />

      <div className="font-pixel text-[6px] text-[#c4722a] tracking-[0.15em] opacity-70">
        ▶ NOW BUILDING
      </div>

      {/* Cassette SVG */}
      <svg
        width="240"
        height="124"
        viewBox="0 0 240 124"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10"
      >
        <rect
          x="5"
          y="14"
          width="230"
          height="96"
          rx="10"
          fill="#1a1108"
          stroke="#3a2810"
          strokeWidth="1.5"
        />
        <rect
          x="18"
          y="24"
          width="204"
          height="60"
          rx="6"
          fill="#231508"
          stroke="#2e1c0c"
          strokeWidth="1"
        />
        <line
          x1="28"
          y1="38"
          x2="212"
          y2="38"
          stroke="#3a2510"
          strokeWidth="0.5"
        />
        <line
          x1="28"
          y1="50"
          x2="212"
          y2="50"
          stroke="#3a2510"
          strokeWidth="0.5"
        />
        <text
          x="120"
          y="44"
          textAnchor="middle"
          fontFamily="var(--font-press-start), monospace"
          fontSize="5.5"
          fill="#c4722a"
        >
          OM BRAHMBHATT
        </text>
        <text
          x="120"
          y="60"
          textAnchor="middle"
          fontFamily="var(--font-press-start), monospace"
          fontSize="3.8"
          fill="#8a6030"
        >
          FULL STACK · AI/ML · 3D WEB
        </text>
        <text
          x="120"
          y="75"
          textAnchor="middle"
          fontFamily="var(--font-jetbrains-mono), monospace"
          fontSize="5"
          fill="#6a4820"
        >
          github.com/Barot-sam
        </text>
        {/* Left reel */}
        <circle
          cx="76"
          cy="98"
          r="17"
          fill="#0d0a07"
          stroke="#3a2810"
          strokeWidth="1.5"
        />
        <circle
          cx="76"
          cy="98"
          r="8"
          fill="#1a1108"
          stroke="#2e1c0c"
          strokeWidth="1"
        />
        <circle cx="76" cy="98" r="3" fill="#c4722a" />
        <line
          x1="76"
          y1="90"
          x2="76"
          y2="86"
          stroke="#c4722a"
          strokeWidth="1"
          opacity="0.5"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 76 98"
            to="360 76 98"
            dur="1.2s"
            repeatCount="indefinite"
          />
        </line>
        {/* Right reel */}
        <circle
          cx="164"
          cy="98"
          r="17"
          fill="#0d0a07"
          stroke="#3a2810"
          strokeWidth="1.5"
        />
        <circle
          cx="164"
          cy="98"
          r="8"
          fill="#1a1108"
          stroke="#2e1c0c"
          strokeWidth="1"
        />
        <circle cx="164" cy="98" r="3" fill="#c4722a" />
        <line
          x1="164"
          y1="90"
          x2="164"
          y2="86"
          stroke="#c4722a"
          strokeWidth="1"
          opacity="0.5"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 164 98"
            to="360 164 98"
            dur="1.2s"
            repeatCount="indefinite"
          />
        </line>
        {/* Tape */}
        <path
          d="M93 90 Q120 86 147 90 Q147 108 120 108 Q93 108 93 90Z"
          fill="#0a0806"
          stroke="#2e1c0c"
          strokeWidth="1"
        />
        <path
          d="M97 97 Q120 92 143 97"
          fill="none"
          stroke="#c4722a"
          strokeWidth="1.5"
          strokeDasharray="4 3"
        >
          <animate
            attributeName="stroke-dashoffset"
            values="0;-14"
            dur="0.4s"
            repeatCount="indefinite"
          />
        </path>
        <circle
          cx="22"
          cy="112"
          r="4"
          fill="#0a0806"
          stroke="#2a1808"
          strokeWidth="1"
        />
        <circle
          cx="218"
          cy="112"
          r="4"
          fill="#0a0806"
          stroke="#2a1808"
          strokeWidth="1"
        />
      </svg>

      {/* Now playing bar */}
      <div className="flex items-center gap-2.5 bg-[#1a1108] border border-[#2e2010] rounded-lg px-3.5 py-2 w-full max-w-md">
        <div
          className="w-2 h-2 rounded-full bg-[#c4722a] shrink-0"
          style={{ animation: "blink 1s ease-in-out infinite" }}
        />
        <div className="flex-1 font-mono text-[10px] text-[#c0a880] whitespace-nowrap overflow-hidden">
          <span
            className="inline-block"
            style={{ animation: "scrolltxt 14s linear infinite" }}
          >
            ⚡ Shipping features · 🤖 Training models · 📱 Building apps · 🎲
            Writing shaders · 🔍 Optimising SEO · ▲ Next.js wizardry · 🌀 Framer
            Motion magic · ⚡ Shipping features · 🤖 Training models · 📱
            Building apps · 🎲 Writing shaders · 🔍 Optimising SEO · ▲ Next.js
            wizardry · 🌀 Framer Motion magic &nbsp;&nbsp;
          </span>
        </div>
        <div className="font-mono text-[9px] text-[#6a5840] shrink-0">∞:∞∞</div>
      </div>
    </div>
  );
}
