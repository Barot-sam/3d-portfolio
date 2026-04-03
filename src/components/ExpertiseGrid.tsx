"use client";

import { motion } from "framer-motion";

const expertise = [
  {
    icon: "🔍",
    title: "SEO Optimisation",
    color: "#22c55e",
    points: [
      "Technical SEO — meta, structured data, sitemaps",
      "Core Web Vitals: LCP, FID, CLS down to green",
      "SSR / SSG strategies for full crawlability",
      "Dynamic OG images & social previews",
    ],
    tags: ["schema.org", "open-graph", "sitemap", "CWV"],
  },
  {
    icon: "⚡",
    title: "Performance Optimisation",
    color: "#f59e0b",
    points: [
      "Lighthouse 95+ across all metrics",
      "Bundle splitting, tree-shaking, lazy loading",
      "Image optimisation — next/image, AVIF, WebP",
      "Edge caching, CDN strategy, ISR patterns",
    ],
    tags: ["lighthouse", "webpack", "vite", "cdn", "isr"],
  },
  {
    icon: "🏗",
    title: "Performance-First Code",
    color: "#38bdf8",
    points: [
      "React: memoization, virtualization, Suspense",
      "Debounce, throttle, Web Workers, WASM",
      "Optimistic UI & React Query caching",
      "DB query optimisation & indexing",
    ],
    tags: ["useMemo", "react-query", "web-workers", "wasm"],
  },
  {
    icon: "🎨",
    title: "3D & Rich Interactions",
    color: "#a78bfa",
    points: [
      "Three.js / R3F with custom GLSL shaders",
      "Framer Motion spring & gesture animations",
      "WebGL post-processing & GSAP timelines",
      "60fps — GPU compositing only",
    ],
    tags: ["r3f", "glsl", "gsap", "css-gpu"],
  },
];

export default function ExpertiseGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {expertise.map((card, i) => (
        <motion.div
          key={card.title}
          className="bg-[#131008] border border-[#221810] rounded-r-xl px-4 py-3.5 cursor-default transition-colors hover:bg-[#181208]"
          style={{ borderLeft: `3px solid ${card.color}` }}
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.1, duration: 0.5 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base leading-none">{card.icon}</span>
            <span className="text-xs font-semibold text-[#e0c090]">
              {card.title}
            </span>
          </div>
          <div className="flex flex-col gap-1 mb-2.5">
            {card.points.map((pt) => (
              <div
                key={pt}
                className="text-[10px] text-[#7a6850] leading-relaxed flex gap-1.5"
              >
                <span
                  style={{ color: card.color }}
                  className="shrink-0 text-[9px] mt-0.5"
                >
                  →
                </span>
                {pt}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {card.tags.map((tag) => (
              <span
                key={tag}
                className="font-mono text-[8px] px-1.5 py-0.5 rounded bg-[#1a1408] border border-[#2a1e10] tracking-wide"
                style={{ color: card.color }}
              >
                {tag}
              </span>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
