"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";

const techStack = [
  {
    group: "Languages",
    items: [
      { icon: "⚡", name: "JavaScript", cat: "core lang", color: "#f0db4f" },
      { icon: "🔷", name: "TypeScript", cat: "typed js", color: "#3178c6" },
      { icon: "🐍", name: "Python", cat: "ai & scripts", color: "#3776ab" },
      { icon: "🎨", name: "GLSL", cat: "shaders", color: "#a78bfa" },
    ],
  },
  {
    group: "Frontend",
    items: [
      { icon: "⚛", name: "React", cat: "frontend", color: "#61dafb" },
      { icon: "▲", name: "Next.js", cat: "ssr · ssg · isr", color: "#e8e8e8" },
      { icon: "🎸", name: "Remix", cat: "full-stack web", color: "#ef4444" },
      { icon: "🚀", name: "Astro", cat: "content & seo", color: "#ff5d01" },
      { icon: "💜", name: "Gatsby", cat: "static sites", color: "#663399" },
      { icon: "🎲", name: "Three.js", cat: "3d & webgl", color: "#049ef4" },
      { icon: "🌀", name: "Framer Motion", cat: "animation", color: "#0055ff" },
      { icon: "📱", name: "React Native", cat: "mobile", color: "#61dafb" },
    ],
  },
  {
    group: "Backend & AI",
    items: [
      { icon: "🟢", name: "Node.js", cat: "backend", color: "#68a063" },
      { icon: "🚀", name: "FastAPI", cat: "api layer", color: "#009688" },
      { icon: "🧠", name: "AI / ML", cat: "models & stuff", color: "#ff6b35" },
      { icon: "🔗", name: "LangChain", cat: "llm pipelines", color: "#f59e0b" },
    ],
  },
  {
    group: "Data & Infra",
    items: [
      { icon: "🍃", name: "MongoDB", cat: "database", color: "#4db33d" },
      { icon: "🐘", name: "PostgreSQL", cat: "database", color: "#336791" },
      { icon: "⚙", name: "Redis", cat: "cache / queues", color: "#dc382d" },
      { icon: "🐳", name: "Docker", cat: "containers", color: "#2496ed" },
    ],
  },
];

export default function TechGrid() {
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
            duration: 0.4,
            stagger: 0.04,
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
    <div ref={gridRef} className="space-y-3">
      {techStack.map((group) => (
        <div key={group.group}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {group.items.map((item) => (
              <div
                key={item.name}
                data-card
                className="group relative overflow-hidden rounded-xl border border-[#221808] bg-[#151008] px-3.5 py-3 flex flex-col gap-1 cursor-default hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/40"
                style={
                  {
                    "--accent-color": item.color,
                    transition: "border-color 0.2s, transform 0.2s, box-shadow 0.2s",
                  } as React.CSSProperties
                }
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = item.color;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "#221808";
                }}
              >
                {/* Top accent bar on hover */}
                <div
                  className="absolute top-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: item.color }}
                />
                <div className="text-lg leading-none mb-0.5">{item.icon}</div>
                <div className="text-xs font-bold text-[#dfc898]">
                  {item.name}
                </div>
                <div className="text-[9px] text-[#6a5840] font-mono">
                  {item.cat}
                </div>
              </div>
            ))}
          </div>
          {/* Divider between groups */}
          <div
            className="h-px my-3"
            style={{
              background:
                "linear-gradient(to right, #2e1c0c44, #2e1c0c, #2e1c0c44)",
            }}
          />
        </div>
      ))}
    </div>
  );
}
