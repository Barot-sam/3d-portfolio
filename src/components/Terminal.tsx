"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const lines = [
  { t: "dim", v: "# welcome to om's world" },
  { t: "cmd", v: "$ whoami" },
  {
    t: "out",
    v: "Om Brahmbhatt — Full Stack JS · React Native · AI/ML · 3D Web",
  },
  { t: "cmd", v: "$ ls ./stack" },
  {
    t: "hi",
    v: "next.js  remix  astro  three.js  framer-motion  fastapi  pytorch  langchain",
  },
  { t: "cmd", v: "$ npm run lighthouse" },
  {
    t: "info",
    v: "⚡  Performance 98 · SEO 100 · Accessibility 100 · Best Practices 100",
  },
  { t: "cmd", v: "$ python train.py --model gpt-finetune --epochs 10" },
  {
    t: "out",
    v: "✓ Loss: 0.043  Accuracy: 97.2%  → deployed to /api/v1/predict",
  },
  { t: "cmd", v: "$ echo $STATUS" },
  { t: "hi", v: "open to work · github.com/Barot-sam" },
  { t: "dim", v: "█" },
];

const colorMap: Record<string, string> = {
  dim: "text-[#4a3c28]",
  cmd: "text-[#d4a060]",
  out: "text-[#7a9860]",
  info: "text-[#6a7898]",
  hi: "text-[#c4722a]",
};

export default function Terminal() {
  const [displayLines, setDisplayLines] = useState<{ t: string; v: string }[]>(
    [],
  );
  const bodyRef = useRef<HTMLDivElement>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    let li = 0;
    let ci = 0;
    let currentLines: { t: string; v: string }[] = [];

    function typeChar() {
      if (!mounted.current) return;
      if (li >= lines.length) {
        setTimeout(() => {
          if (!mounted.current) return;
          currentLines = [];
          setDisplayLines([]);
          li = 0;
          ci = 0;
          typeChar();
        }, 2200);
        return;
      }

      const line = lines[li];
      if (ci === 0) {
        currentLines = [...currentLines, { t: line.t, v: "" }];
      }

      if (ci < line.v.length) {
        currentLines = currentLines.map((l, i) =>
          i === currentLines.length - 1
            ? { ...l, v: line.v.slice(0, ci + 1) }
            : l,
        );
        setDisplayLines([...currentLines]);
        ci++;
        setTimeout(typeChar, line.t === "dim" ? 15 : 22 + Math.random() * 16);
      } else {
        ci = 0;
        li++;
        setTimeout(typeChar, li % 2 === 0 ? 280 : 100);
      }
    }

    typeChar();
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [displayLines]);

  return (
    <motion.div
      className="rounded-xl border border-[#2a1e10] bg-[#0a0806] overflow-hidden font-mono"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: 0.1 }}
    >
      {/* Title bar */}
      <div className="flex items-center gap-1.5 px-3.5 py-2 bg-[#1a1208] border-b border-[#2a1e10]">
        <div className="w-2.5 h-2.5 rounded-full bg-[#c0392b]" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#c4722a]" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#5a8a40]" />
        <span className="ml-1.5 text-[9px] text-[#6a5840] tracking-wider">
          om@brahmbhatt ~ zsh
        </span>
      </div>

      {/* Terminal body */}
      <div
        ref={bodyRef}
        className="p-4 min-h-[140px] max-h-[200px] overflow-y-auto"
      >
        {displayLines.map((line, i) => (
          <div
            key={i}
            className={`text-[11px] leading-7 ${colorMap[line.t] || "text-[#b09878]"}`}
          >
            {line.v}
            {i === displayLines.length - 1 && (
              <span
                className="inline-block w-[7px] h-[13px] bg-[#c4722a] align-middle ml-0.5"
                style={{ animation: "cur 1s step-end infinite" }}
              />
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
