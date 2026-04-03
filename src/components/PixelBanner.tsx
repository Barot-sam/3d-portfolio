"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";

export default function PixelBanner() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const stars = Array.from({ length: 60 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.2 + 0.3,
      o: Math.random(),
      s: Math.random() * 0.008 + 0.003,
    }));

    let animId: number;
    function draw() {
      if (!canvas || !ctx) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach((s) => {
        s.o += s.s;
        if (s.o > 1 || s.o < 0) s.s *= -1;
        ctx.beginPath();
        ctx.arc(s.x * canvas.width, s.y * canvas.height, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(196,114,42,${s.o * 0.5})`;
        ctx.fill();
      });
      animId = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(animId);
  }, []);

  useEffect(() => {
    if (textRef.current) {
      gsap.from(textRef.current, {
        opacity: 0,
        scale: 0.8,
        duration: 0.8,
        ease: "power2.out",
      });
    }
  }, []);

  return (
    <div className="relative overflow-hidden rounded-xl border border-[#2a1e10] bg-[#0a0806] h-20 flex items-center justify-center">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <div className="scanline-overlay" />
      <div
        ref={textRef}
        className="relative z-10 font-pixel text-base text-[#c4722a]"
        style={{
          textShadow: "2px 2px 0 #6a3010, 4px 4px 0 #3a1808",
          animation: "pglow 2.5s ease-in-out infinite alternate",
        }}
      >
        Om Brahmbhatt
      </div>
    </div>
  );
}
