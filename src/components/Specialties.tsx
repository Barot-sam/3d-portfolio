"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";

const specialties = [
  {
    icon: "📱",
    title: "React Native",
    desc: "Cross-platform apps with true native feel. Offline-first architecture, Reanimated 3, native module bridging, Expo EAS builds.",
    tags: ["expo", "eas", "reanimated", "offline-first"],
    glow: "#61dafb18",
  },
  {
    icon: "🤖",
    title: "AI/ML Engineering",
    desc: "LLM fine-tuning, RAG pipelines, agent frameworks. From Jupyter notebooks to production FastAPI services.",
    tags: ["llms", "langchain", "pytorch", "rag"],
    glow: "#3776ab18",
  },
];

export default function Specialties() {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const cards = el.querySelectorAll("[data-card]");
          gsap.from(cards, {
            opacity: 0,
            y: 20,
            duration: 0.5,
            stagger: 0.15,
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
    <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {specialties.map((card) => (
        <div
          key={card.title}
          data-card
          className="relative overflow-hidden bg-[#131008] border border-[#221810] rounded-xl p-4 cursor-default transition-colors hover:border-[#c4722a44]"
        >
          {/* Glow */}
          <div
            className="absolute -bottom-5 -right-5 w-[70px] h-[70px]"
            style={{
              background: `radial-gradient(circle, ${card.glow} 0%, transparent 70%)`,
            }}
          />
          <div className="text-xs font-semibold text-[#e0c090] mb-1.5 flex items-center gap-2">
            <span>{card.icon}</span> {card.title}
          </div>
          <div className="text-[10px] text-[#7a6850] leading-relaxed">
            {card.desc}
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {card.tags.map((tag) => (
              <span
                key={tag}
                className="font-mono text-[8px] px-1.5 py-0.5 rounded bg-[#1e1508] border border-[#2e2010] text-[#9a8060] tracking-wide"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
