"use client";

import { motion } from "framer-motion";

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

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.4 },
  }),
};

export default function TechGrid() {
  let globalIndex = 0;

  return (
    <div className="space-y-3">
      {techStack.map((group) => (
        <div key={group.group}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {group.items.map((item) => {
              const idx = globalIndex++;
              return (
                <motion.div
                  key={item.name}
                  className="group relative overflow-hidden rounded-xl border border-[#221808] bg-[#151008] px-3.5 py-3 flex flex-col gap-1 cursor-default transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/40"
                  style={
                    { "--accent-color": item.color } as React.CSSProperties
                  }
                  custom={idx}
                  variants={cardVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  whileHover={{ borderColor: item.color }}
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
                </motion.div>
              );
            })}
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
