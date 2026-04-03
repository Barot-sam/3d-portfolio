"use client";

import { SECTION_THRESHOLDS, useScrollStore } from "@/store/scrollStore";
import { AnimatePresence, motion } from "framer-motion";

// Each section panel only shows within a narrow window around its center
const PIT_STOP_RADIUS = 0.04; // ±4% of track around center

/* ──────────────────────────────────────────────
   SECTION CONTENT PANELS
   These appear as HTML overlays on top of the 3D scene
────────────────────────────────────────────── */

function SectionWrapper({
  id,
  children,
  side = "right",
}: {
  id: string;
  children: React.ReactNode;
  side?: "left" | "right";
}) {
  const activeSection = useScrollStore((s) => s.activeSection);
  const progress = useScrollStore((s) => s.progress);
  const threshold = SECTION_THRESHOLDS[id as keyof typeof SECTION_THRESHOLDS];
  const center = (threshold.start + threshold.end) / 2;
  const isNearPitStop =
    activeSection === id && Math.abs(progress - center) < PIT_STOP_RADIUS;

  return (
    <AnimatePresence>
      {isNearPitStop && (
        <motion.div
          initial={{ opacity: 0, x: side === "right" ? 80 : -80 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: side === "right" ? 80 : -80 }}
          transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1] }}
          className={`absolute top-1/2 -translate-y-1/2 ${
            side === "right" ? "right-4 sm:right-8" : "left-4 sm:left-8"
          } w-[340px] sm:w-[400px] max-h-[70vh] overflow-y-auto pointer-events-auto`}
        >
          <div className="bg-[#0d0a07ee] border border-[#2e2415] rounded-xl p-5 backdrop-blur-md shadow-[0_0_40px_rgba(196,114,42,0.1)]">
            {/* CRT scanline effect */}
            <div className="absolute inset-0 pointer-events-none rounded-xl opacity-30 scanline-overlay" />
            <div className="relative z-10">{children}</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SectionTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-lg">{icon}</span>
      <h2 className="font-pixel text-[10px] text-[#c4722a] tracking-wider">
        {title}
      </h2>
      <div className="flex-1 h-px bg-gradient-to-r from-[#2e1c0c] to-transparent" />
    </div>
  );
}

/* ── HERO ───────────────────────────────── */
function HeroSection() {
  return (
    <SectionWrapper id="hero" side="right">
      <SectionTitle icon="🏁" title="START GRID" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="font-mono text-[10px] text-[#c4722a] tracking-wider mb-2">
          &gt; DRIVER PROFILE LOADED_
        </div>
        <h1
          className="text-3xl font-bold text-[#f0d5a8] mb-1"
          style={{
            textShadow:
              "1px 1px 0 #8a5820, 2px 2px 0 #6a4018, 3px 3px 8px rgba(0,0,0,0.5)",
          }}
        >
          Om Brahmbhatt
        </h1>
        <div className="font-mono text-xs text-[#8a7060] mb-3">
          @<span className="text-[#c4722a]">Barot-sam</span> · Lap 1 of ∞
        </div>
        <p className="text-xs text-[#b09878] leading-relaxed mb-4">
          Full-stack engineer racing through the world of web, mobile, AI &amp;
          3D. Every project is a lap —{" "}
          <span className="text-[#d4a060] font-semibold">
            fast, precise, refined
          </span>
          .
        </p>
        <div className="flex flex-wrap gap-1.5">
          {["⚡ Open to Work", "🇮🇳 India", "🤖 AI/ML", "🏎️ Full Stack"].map(
            (badge) => (
              <span
                key={badge}
                className="font-mono text-[8px] px-2 py-1 rounded-full bg-[#1a1108] border border-[#2e2010] text-[#d4882a]"
              >
                {badge}
              </span>
            ),
          )}
        </div>
        <div className="mt-4 font-pixel text-[7px] text-[#4a3c28] tracking-wider animate-pulse">
          ↓ SCROLL TO RACE ↓
        </div>
      </motion.div>
    </SectionWrapper>
  );
}

/* ── ABOUT ──────────────────────────────── */
function AboutSection() {
  return (
    <SectionWrapper id="about" side="left">
      <SectionTitle icon="👤" title="PIT STOP — ABOUT" />
      <div className="space-y-3">
        <div className="font-mono text-[9px] text-[#6a5840] border border-[#2e2010] rounded-lg p-3 bg-[#0a080644]">
          <span className="text-[#d4a060]">$</span> cat about.md
        </div>
        <p className="text-xs text-[#b09878] leading-relaxed">
          I build things that{" "}
          <strong className="text-[#d4a060]">run everywhere</strong> — web,
          mobile, server, and minds. A full-stack JS craftsman,{" "}
          <strong className="text-[#d4a060]">React Native</strong> specialist,
          and <strong className="text-[#d4a060]">AI/ML engineer</strong> who
          ships fast, accessible, SEO-ranked products.
        </p>
        <p className="text-xs text-[#b09878] leading-relaxed">
          Not just functional —{" "}
          <span className="text-[#c4722a] font-semibold">refined</span>. Like an
          F1 car, every millisecond of performance matters. I obsess over Core
          Web Vitals, bundle sizes, and Lighthouse scores.
        </p>
        <div className="grid grid-cols-2 gap-2 mt-3">
          {[
            { label: "Languages", value: "JS · TS · Python" },
            { label: "Frontend", value: "React · Next.js" },
            { label: "Mobile", value: "React Native" },
            { label: "AI/ML", value: "PyTorch · LangChain" },
          ].map((item) => (
            <div
              key={item.label}
              className="bg-[#1a1108] border border-[#2e2010] rounded-lg p-2"
            >
              <div className="font-pixel text-[6px] text-[#6a5840] tracking-wider">
                {item.label}
              </div>
              <div className="font-mono text-[9px] text-[#d4a060] mt-0.5">
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
}

/* ── PROJECTS ───────────────────────────── */
function ProjectsSection() {
  const projects = [
    {
      title: "AI-Powered Web App",
      tech: "Next.js · FastAPI · GPT",
      desc: "Full-stack AI product with RAG pipeline",
      status: "🟢 LIVE",
    },
    {
      title: "3D Portfolio Experience",
      tech: "Three.js · R3F · GSAP",
      desc: "Immersive 3D web experience you're seeing now",
      status: "🏎️ RACING",
    },
    {
      title: "React Native App",
      tech: "Expo · Reanimated · Offline",
      desc: "Cross-platform mobile with native feel",
      status: "📱 SHIPPED",
    },
    {
      title: "SEO Analytics Dashboard",
      tech: "Next.js · PostgreSQL · Charts",
      desc: "Real-time SEO monitoring & insights",
      status: "⚡ FAST",
    },
  ];

  return (
    <SectionWrapper id="projects" side="right">
      <SectionTitle icon="🏗️" title="PIT STOP — PROJECTS" />
      <div className="space-y-2.5">
        {projects.map((p, i) => (
          <motion.div
            key={p.title}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 * i }}
            className="group bg-[#131008] border border-[#221810] rounded-lg p-3 cursor-pointer transition-all hover:border-[#c4722a44] hover:bg-[#181208]"
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xs font-semibold text-[#e0c090]">
                {p.title}
              </h3>
              <span className="font-mono text-[7px] text-[#5aaa40]">
                {p.status}
              </span>
            </div>
            <div className="font-mono text-[8px] text-[#c4722a] mb-1">
              {p.tech}
            </div>
            <div className="text-[10px] text-[#7a6850]">{p.desc}</div>
            {/* Placeholder for screenshot/video */}
            <div className="mt-2 h-16 rounded border border-dashed border-[#2e201066] bg-[#0a080644] flex items-center justify-center">
              <span className="font-mono text-[8px] text-[#4a3c28]">
                [ preview.mp4 ]
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </SectionWrapper>
  );
}

/* ── SKILLS ──────────────────────────────── */
function SkillsSection() {
  const skillGroups = [
    {
      title: "FRONTEND",
      skills: [
        { name: "React / Next.js", pct: 95 },
        { name: "TypeScript", pct: 90 },
        { name: "Three.js / R3F", pct: 75 },
        { name: "Framer Motion", pct: 85 },
      ],
    },
    {
      title: "BACKEND & AI",
      skills: [
        { name: "Node.js", pct: 88 },
        { name: "Python / FastAPI", pct: 80 },
        { name: "AI/ML · LangChain", pct: 70 },
        { name: "PostgreSQL / MongoDB", pct: 78 },
      ],
    },
  ];

  return (
    <SectionWrapper id="skills" side="left">
      <SectionTitle icon="⚡" title="PIT STOP — SKILLS" />
      <div className="space-y-4">
        {skillGroups.map((group) => (
          <div key={group.title}>
            <div className="font-pixel text-[7px] text-[#6a5840] tracking-wider mb-2">
              {group.title}
            </div>
            <div className="space-y-2">
              {group.skills.map((skill, i) => (
                <motion.div
                  key={skill.name}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 * i }}
                  className="flex items-center gap-2"
                >
                  <span className="w-[100px] font-mono text-[9px] text-[#8a7858] shrink-0">
                    {skill.name}
                  </span>
                  <div className="flex-1 h-[5px] bg-[#1e1808] rounded-sm overflow-hidden">
                    <motion.div
                      className="h-full rounded-sm bg-gradient-to-r from-[#c4722a] to-[#f0a040]"
                      initial={{ width: 0 }}
                      animate={{ width: `${skill.pct}%` }}
                      transition={{
                        delay: 0.2 + i * 0.1,
                        duration: 1,
                        ease: [0.22, 0.61, 0.36, 1],
                      }}
                    />
                  </div>
                  <span className="w-8 text-right font-mono text-[8px] text-[#6a5840]">
                    {skill.pct}%
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        ))}

        {/* Tech badges */}
        <div className="flex flex-wrap gap-1 mt-2">
          {[
            "React",
            "Next.js",
            "TypeScript",
            "Python",
            "Three.js",
            "Node.js",
            "FastAPI",
            "Docker",
            "Redis",
            "GLSL",
          ].map((tech) => (
            <span
              key={tech}
              className="font-mono text-[7px] px-1.5 py-0.5 rounded bg-[#1a1408] border border-[#2a1e10] text-[#c4722a]"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
}

/* ── EXPERIENCE ─────────────────────────── */
function ExperienceSection() {
  const experiences = [
    {
      role: "Full Stack Developer",
      type: "Freelance / Contract",
      period: "2023 — Present",
      highlights: [
        "Built AI-powered web apps with Next.js + FastAPI",
        "Lighthouse 95+ across all client projects",
        "React Native apps with offline-first architecture",
      ],
    },
    {
      role: "3D Web Developer",
      type: "Personal / Open Source",
      period: "2022 — Present",
      highlights: [
        "Three.js / R3F with custom GLSL shaders",
        "Interactive 3D portfolio experiences",
        "WebGL post-processing & GSAP timelines",
      ],
    },
    {
      role: "AI/ML Engineer",
      type: "Projects & Research",
      period: "2023 — Present",
      highlights: [
        "LLM fine-tuning & RAG pipeline development",
        "Production FastAPI services for ML models",
        "LangChain agent frameworks",
      ],
    },
  ];

  return (
    <SectionWrapper id="experience" side="right">
      <SectionTitle icon="🏆" title="PIT STOP — EXPERIENCE" />
      <div className="space-y-3">
        {experiences.map((exp, i) => (
          <motion.div
            key={exp.role}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * i }}
            className="border-l-2 border-[#c4722a] pl-3 py-1"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-[#e0c090]">
                {exp.role}
              </h3>
              <span className="font-mono text-[7px] text-[#6a5840]">
                {exp.period}
              </span>
            </div>
            <div className="font-mono text-[8px] text-[#c4722a] mb-1.5">
              {exp.type}
            </div>
            {exp.highlights.map((h) => (
              <div
                key={h}
                className="flex gap-1.5 text-[9px] text-[#7a6850] leading-relaxed"
              >
                <span className="text-[#c4722a] shrink-0">→</span>
                {h}
              </div>
            ))}
          </motion.div>
        ))}
      </div>
    </SectionWrapper>
  );
}

/* ── CONTACT ────────────────────────────── */
function ContactSection() {
  const links = [
    {
      icon: "🔗",
      label: "GitHub",
      value: "github.com/Barot-sam",
      href: "https://github.com/Barot-sam",
    },
    {
      icon: "💼",
      label: "LinkedIn",
      value: "linkedin.com/in/om",
      href: "https://linkedin.com",
    },
    {
      icon: "📧",
      label: "Email",
      value: "om@example.com",
      href: "mailto:om@example.com",
    },
    { icon: "📄", label: "Resume", value: "Download PDF", href: "#" },
  ];

  return (
    <SectionWrapper id="contact" side="left">
      <SectionTitle icon="📡" title="FINISH LINE — CONTACT" />
      <div className="space-y-3">
        <div className="font-mono text-[9px] text-[#b09878] leading-relaxed">
          Race is over. Let&apos;s talk about your next project.
        </div>

        <div className="space-y-2">
          {links.map((link, i) => (
            <motion.a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * i }}
              className="flex items-center gap-3 bg-[#131008] border border-[#221810] rounded-lg px-3 py-2.5 cursor-pointer transition-all hover:border-[#c4722a] hover:bg-[#181208] no-underline group"
            >
              <span className="text-sm">{link.icon}</span>
              <div className="flex-1">
                <div className="font-pixel text-[7px] text-[#6a5840] tracking-wider">
                  {link.label}
                </div>
                <div className="font-mono text-[10px] text-[#d4a060] group-hover:text-[#f0a040] transition-colors">
                  {link.value}
                </div>
              </div>
              <span className="font-mono text-[10px] text-[#4a3c28] group-hover:text-[#c4722a] transition-colors">
                →
              </span>
            </motion.a>
          ))}
        </div>

        <div className="mt-4 bg-[#1a1508] border border-[#2e2010] border-l-[3px] border-l-[#c4722a] rounded-r-lg px-3 py-2">
          <div className="font-pixel text-[7px] text-[#c4722a] tracking-wider mb-1">
            🏁 RACE COMPLETE
          </div>
          <div className="font-mono text-[9px] text-[#7a6850]">
            Thanks for racing through my portfolio. Let&apos;s build something
            fast together.
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}

/* ── MAIN EXPORT ────────────────────────── */
export default function ContentSections() {
  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      <HeroSection />
      <AboutSection />
      <ProjectsSection />
      <SkillsSection />
      <ExperienceSection />
      <ContactSection />
    </div>
  );
}
