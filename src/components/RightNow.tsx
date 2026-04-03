"use client";

import { motion } from "framer-motion";

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
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => (
        <motion.div
          key={i}
          className="flex items-start gap-2.5 px-3 py-2.5 bg-[#131008] border border-[#1e1608] rounded-lg text-[11px] text-[#b09070] leading-relaxed"
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.1, duration: 0.4 }}
        >
          <span className="text-sm leading-snug shrink-0">{item.icon}</span>
          <span>{item.text}</span>
        </motion.div>
      ))}
    </div>
  );
}
