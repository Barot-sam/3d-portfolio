"use client";

import gsap from "gsap";
import { useEffect, useRef, useState } from "react";

const languages = [
  { name: "JavaScript", pct: 88, color: "#f0db4f" },
  { name: "TypeScript", pct: 75, color: "#3178c6" },
  { name: "Python", pct: 68, color: "#3776ab" },
  { name: "CSS / SCSS", pct: 60, color: "#c4722a" },
  { name: "GLSL", pct: 35, color: "#a78bfa" },
  { name: "Shell", pct: 30, color: "#5a8a40" },
];

export default function LanguageBars() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          const items = el.querySelectorAll("[data-bar]");
          gsap.from(items, {
            opacity: 0,
            x: -20,
            duration: 0.4,
            stagger: 0.08,
            ease: "power2.out",
          });
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="flex flex-col gap-2">
      {languages.map((lang) => (
        <div
          key={lang.name}
          data-bar
          className="flex items-center gap-3"
        >
          <span className="w-[86px] text-[10px] text-[#8a7858] font-mono shrink-0">
            {lang.name}
          </span>
          <div className="flex-1 h-[5px] bg-[#1e1808] rounded-sm overflow-hidden">
            <div
              className="h-full rounded-sm transition-[width] duration-[1.3s] ease-[cubic-bezier(.22,.61,.36,1)]"
              style={{
                width: visible ? `${lang.pct}%` : "0%",
                background: lang.color,
              }}
            />
          </div>
          <span className="w-[30px] text-right text-[9px] text-[#6a5840] font-mono">
            {lang.pct}%
          </span>
        </div>
      ))}
    </div>
  );
}
