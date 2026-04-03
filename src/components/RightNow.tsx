"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";

const items = [
  {
    icon: "🔭",
    text: "Building AI-powered products blending LLMs with high-performance, SEO-ranked frontends",
  },
  {
    icon: "⚡",
    text: "Obsessing over Core Web Vitals, bundle sizes, and Lighthouse 100 scores",
  },
  {
    icon: "🎲",
    text: "Experimenting with Three.js + R3F for immersive 3D web experiences",
  },
  {
    icon: "💬",
    text: "Open to freelance & collaboration — Next.js, React Native, AI/ML, or performance audits",
  },
];

export default function RightNow() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          gsap.from(el.children, {
            opacity: 0,
            y: 15,
            duration: 0.4,
            stagger: 0.1,
            ease: "power2.out",
          });
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="flex flex-col gap-2">
      {items.map((item, i) => (
        <div
          key={i}
          className="flex items-start gap-2.5 px-3 py-2.5 bg-[#131008] border border-[#1e1608] rounded-lg text-[11px] text-[#b09070] leading-relaxed opacity-0"
        >
          <span className="text-sm leading-snug shrink-0">{item.icon}</span>
          <span>{item.text}</span>
        </div>
      ))}
    </div>
  );
}
