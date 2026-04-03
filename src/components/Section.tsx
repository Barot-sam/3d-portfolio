"use client";

import { ReactNode } from "react";

interface SectionProps {
  title: string;
  children: ReactNode;
  noBorder?: boolean;
}

export default function Section({ title, children, noBorder }: SectionProps) {
  return (
    <div
      className={`px-6 py-7 sm:px-9 ${noBorder ? "" : "border-b border-[#1e1608]"}`}
    >
      <div className="flex items-center gap-2.5 font-mono text-[10px] tracking-[0.12em] text-[#c4722a] uppercase mb-4">
        {title}
        <span className="flex-1 h-px bg-gradient-to-r from-[#2e1c0c] to-transparent" />
      </div>
      {children}
    </div>
  );
}
