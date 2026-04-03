"use client";

import ContentSections from "@/components/ContentSections";
import RacingHUD from "@/components/RacingHUD";
import ScrollController from "@/components/ScrollController";
import SoundManager from "@/components/SoundManager";
import dynamic from "next/dynamic";

const RacingWorld = dynamic(() => import("@/components/RacingWorld"), {
  ssr: false,
});

export default function Home() {
  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-[#0d0a07]">
      {/* 3D Racing World */}
      <RacingWorld />

      {/* HTML Overlays */}
      <ContentSections />
      <RacingHUD />

      {/* Sound + Start Screen */}
      <SoundManager />

      {/* Input Handler */}
      <ScrollController />
    </div>
  );
}
