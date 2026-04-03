"use client";

import { motion } from "framer-motion";

const badges = [
  {
    label: "⚡ Open to opportunities",
    cls: "bg-[#2a1a08] text-[#d4882a] border-[#3d2510]",
  },
  { label: "🇮🇳 India", cls: "bg-[#220f07] text-[#c45e3e] border-[#38180a]" },
  {
    label: "🤖 AI/ML Builder",
    cls: "bg-[#221a06] text-[#c8a832] border-[#362a10]",
  },
  {
    label: "🚀 Performance Obsessed",
    cls: "bg-[#0d1a0a] text-[#5aaa40] border-[#1a3010]",
  },
  { label: "🎲 3D Web", cls: "bg-[#07101a] text-[#5a8ad4] border-[#102030]" },
  {
    label: "📦 Full Stack JS",
    cls: "bg-[#1a1814] text-[#8a8070] border-[#2a2820]",
  },
];

const pills = [
  { label: "JavaScript / TypeScript", dotColor: "bg-[#c4722a]" },
  { label: "React & React Native", dotColor: "bg-[#c4722a]" },
  { label: "Python · FastAPI · AI/ML", dotColor: "bg-[#5a8a40]" },
  { label: "SEO · Performance · 3D Web", dotColor: "bg-[#2a8a7a]" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function Header() {
  return (
    <motion.div
      className="relative overflow-hidden px-6 py-8 sm:px-9"
      style={{
        background:
          "linear-gradient(135deg, #1a0f05 0%, #231408 50%, #1a0e07 100%)",
      }}
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
    >
      {/* Radial glow */}
      <div
        className="absolute -top-15 -right-15 w-65 h-65 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(196,114,20,0.25) 0%, transparent 70%)",
        }}
      />

      {/* Badges */}
      <motion.div className="flex flex-wrap gap-2 mb-4" variants={itemVariants}>
        {badges.map((b) => (
          <span
            key={b.label}
            className={`font-mono text-[9px] px-2.5 py-1 rounded-full font-medium tracking-wide border ${b.cls}`}
          >
            {b.label}
          </span>
        ))}
      </motion.div>

      <motion.div
        className="font-mono text-xs text-[#c4722a] tracking-wider mb-1.5"
        variants={itemVariants}
      >
        &gt; hello, world —
      </motion.div>

      <motion.h1
        className="text-5xl sm:text-6xl font-bold tracking-tight leading-none mb-1 text-[#f0d5a8]"
        style={{
          textShadow:
            "1px 1px 0 #8a5820, 2px 2px 0 #6a4018, 3px 3px 0 #4a2c10, 4px 4px 0 #2e1c08, 5px 5px 12px rgba(0,0,0,0.53)",
        }}
        variants={itemVariants}
      >
        Om Brahmbhatt
      </motion.h1>

      <motion.div
        className="font-mono text-sm text-[#8a7060] mb-3.5"
        variants={itemVariants}
      >
        @<span className="text-[#c4722a]">Barot-sam</span> on GitHub
      </motion.div>

      <motion.p
        className="text-sm text-[#b09878] leading-relaxed max-w-lg mb-5"
        variants={itemVariants}
      >
        I build things that{" "}
        <strong className="text-[#d4a060] font-semibold">run everywhere</strong>{" "}
        — web, mobile, server, and minds. Full-stack JS craftsman,{" "}
        <strong className="text-[#d4a060] font-semibold">React Native</strong>{" "}
        specialist, and{" "}
        <strong className="text-[#d4a060] font-semibold">AI/ML engineer</strong>{" "}
        who ships{" "}
        <strong className="text-[#d4a060] font-semibold">
          fast, accessible, SEO-ranked
        </strong>{" "}
        products. Not just functional — refined.
      </motion.p>

      <motion.div className="flex flex-wrap gap-2" variants={itemVariants}>
        {pills.map((p) => (
          <div
            key={p.label}
            className="flex items-center gap-2 bg-[#1a1108] border border-[#2e2010] rounded-lg px-3 py-1.5 text-[11px] text-[#c0a880] cursor-default transition-colors hover:border-[#c4722a55]"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${p.dotColor} shrink-0`}
            />
            {p.label}
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}
