"use client";

export default function Footer() {
  return (
    <div className="border-t border-[#1e1608] px-6 py-4 sm:px-9 flex items-center justify-between flex-wrap gap-2.5 bg-[#0f0c07]">
      <div className="font-mono text-[10px] text-[#4a3c28]">
        /* made with 🔥 &amp; ☕ by Om Brahmbhatt */
      </div>
      <div className="flex gap-2">
        <a
          href="https://github.com/Barot-sam"
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[9px] px-3 py-1.5 rounded-md border border-[#2a1e10] bg-[#161008] text-[#c0905a] tracking-wide transition-colors hover:border-[#c4722a] hover:bg-[#1e1408] no-underline inline-block"
        >
          → github
        </a>
      </div>
    </div>
  );
}
