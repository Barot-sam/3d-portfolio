"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";

interface MiniCanvasProps {
  type: "wave" | "bars" | "dots" | "spin";
  c1: string;
  c2: string;
}

function MiniCanvas({ type, c1, c2 }: MiniCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    let t = 0;
    let animId: number;

    function draw() {
      if (!el || !ctx) return;
      el.width = el.offsetWidth || 200;
      el.height = el.offsetHeight || 120;
      ctx.clearRect(0, 0, el.width, el.height);
      const W = el.width,
        H = el.height;

      if (type === "wave") {
        for (let w = 0; w < 3; w++) {
          ctx.beginPath();
          ctx.strokeStyle = w % 2 ? c2 : c1;
          ctx.lineWidth = 1.5;
          ctx.globalAlpha = 0.45 - w * 0.08;
          for (let x = 0; x < W; x++) {
            const y =
              H / 2 +
              Math.sin((x / W) * Math.PI * 4 + t + w * 1.3) * (14 - w * 4);
            x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      } else if (type === "bars") {
        const bars = 10;
        for (let i = 0; i < bars; i++) {
          const h = (Math.sin(t * 1.2 + i * 0.65) * 0.4 + 0.55) * H * 0.7;
          ctx.globalAlpha = 0.55;
          ctx.fillStyle = i % 2 ? c2 : c1;
          ctx.fillRect(i * (W / bars) + 2, H - h, W / bars - 4, h);
        }
      } else if (type === "dots") {
        for (let i = 0; i < 20; i++) {
          const x = (Math.sin(i * 0.65 + t) * 0.38 + 0.5) * W;
          const y = (Math.cos(i * 0.45 + t * 0.7) * 0.38 + 0.5) * H;
          ctx.beginPath();
          ctx.arc(x, y, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = i % 3 === 0 ? c1 : i % 3 === 1 ? c2 : "#ffffff";
          ctx.globalAlpha = 0.6;
          ctx.fill();
        }
      } else if (type === "spin") {
        for (let i = 0; i < 8; i++) {
          const angle = t + i * (Math.PI / 4);
          const r = 24;
          const x = W / 2 + Math.cos(angle) * r;
          const y = H / 2 + Math.sin(angle) * r;
          ctx.beginPath();
          ctx.arc(x, y, 3 + (i % 2) * 2, 0, Math.PI * 2);
          ctx.fillStyle = i % 2 ? c1 : c2;
          ctx.globalAlpha = 0.7;
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(W / 2, H / 2, 8, 0, Math.PI * 2);
        ctx.fillStyle = c1;
        ctx.globalAlpha = 0.4;
        ctx.fill();
      }
      t += 0.035;
      animId = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(animId);
  }, [type, c1, c2]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}

const demos = [
  {
    type: "wave" as const,
    c1: "#c4722a",
    c2: "#f0a040",
    bg: "linear-gradient(135deg, #0d0a07, #1a0f05)",
    icon: "🌐",
    title: "Web App Demo",
    desc: "Next.js / React project. 30 sec walkthrough — UI, interactions, speed.",
    how: "record → LICEcap → .gif",
    label: "web-demo.gif",
  },
  {
    type: "bars" as const,
    c1: "#5aaa40",
    c2: "#3a8a30",
    bg: "linear-gradient(135deg, #07100d, #071a14)",
    icon: "📱",
    title: "React Native App",
    desc: "iOS simulator + QuickTime. Show navigation, animations, offline mode.",
    how: "simulator → QuickTime → ezgif",
    label: "mobile-demo.gif",
  },
  {
    type: "dots" as const,
    c1: "#4a6ea8",
    c2: "#2a4e88",
    bg: "linear-gradient(135deg, #07090d, #0a0f1a)",
    icon: "🤖",
    title: "AI/ML Pipeline",
    desc: "Terminal or UI showing model / RAG pipeline / FastAPI endpoint.",
    how: "asciinema → agg → .gif",
    label: "ai-demo.gif",
  },
  {
    type: "spin" as const,
    c1: "#a078e0",
    c2: "#c4722a",
    bg: "linear-gradient(135deg, #0a0711, #12071a)",
    icon: "🎲",
    title: "3D / Animation",
    desc: "Three.js scene or Framer Motion UI. Stops people mid-scroll.",
    how: "screen record → ezgif.com → .gif",
    label: "3d-demo.gif",
  },
];

export default function DemoGrid() {
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
            scale: 0.95,
            duration: 0.5,
            stagger: 0.1,
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
    <>
      <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {demos.map((demo) => (
          <div
            key={demo.title}
            data-card
            className="group bg-[#131008] border border-dashed border-[#2e2010] rounded-xl overflow-hidden cursor-default transition-all hover:border-[#c4722a66] hover:-translate-y-0.5"
          >
            {/* Preview area */}
            <div
              className="h-[120px] relative overflow-hidden flex items-center justify-center border-b border-[#1e1608]"
              style={{ background: demo.bg }}
            >
              <MiniCanvas type={demo.type} c1={demo.c1} c2={demo.c2} />
              <div className="relative z-10 flex flex-col items-center gap-1.5">
                <div className="w-10 h-10 rounded-full bg-[#c4722a22] border border-[#c4722a66] flex items-center justify-center transition-colors group-hover:bg-[#c4722a44]">
                  <div className="w-0 h-0 border-t-[7px] border-t-transparent border-b-[7px] border-b-transparent border-l-[13px] border-l-[#c4722a] ml-0.5" />
                </div>
                <span className="font-mono text-[8px] text-[#6a5840] tracking-wider">
                  {demo.label}
                </span>
              </div>
            </div>

            {/* Info */}
            <div className="px-3.5 py-3">
              <div className="text-xs font-semibold text-[#d0b888] mb-1">
                {demo.icon} {demo.title}
              </div>
              <div className="text-[10px] text-[#6a5840] leading-relaxed font-mono">
                {demo.desc}
              </div>
              <span className="inline-block font-mono text-[8px] px-2 py-0.5 rounded bg-[#1e1508] border border-[#c4722a33] text-[#c4722a] mt-2 tracking-wide">
                {demo.how}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 bg-[#1a1508] border border-[#2e2010] border-l-[3px] border-l-[#c4722a] rounded-r-lg px-4 py-3 text-[11px] text-[#a09070] leading-relaxed">
        💡 Keep each GIF under <strong className="text-[#d4a060]">5MB</strong>{" "}
        and <strong className="text-[#d4a060]">800px wide</strong>. Compress at{" "}
        <code className="font-mono text-[9px] bg-[#0d0a07] px-1.5 py-0.5 rounded text-[#c4722a]">
          ezgif.com/optimize
        </code>
      </div>
    </>
  );
}
