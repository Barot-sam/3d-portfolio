"use client";

import gsap from "gsap";
import { useCallback, useEffect, useRef, useState } from "react";

/*
  Web Audio API synth for retro F1 sounds.
  No external audio files needed — everything is generated.
*/

class RetroAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private isPlaying = false;
  private _muted = false;

  get muted() {
    return this._muted;
  }

  init() {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.15;
    this.masterGain.connect(this.ctx.destination);
  }

  // Engine idle sound - oscillator based
  startEngine() {
    if (!this.ctx || !this.masterGain || this.isPlaying) return;
    this.isPlaying = true;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0.08;
    this.engineGain.connect(this.masterGain);

    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = "sawtooth";
    this.engineOsc.frequency.value = 80;
    this.engineOsc.connect(this.engineGain);
    this.engineOsc.start();
  }

  // Adjust engine pitch based on scroll speed
  setEngineSpeed(speed: number) {
    if (!this.engineOsc || !this.engineGain) return;
    // Map speed 0-1 to frequency 80-400 Hz
    const freq = 80 + speed * 320;
    this.engineOsc.frequency.setTargetAtTime(freq, this.ctx!.currentTime, 0.1);
    this.engineGain.gain.setTargetAtTime(
      Math.min(0.08 + speed * 0.12, 0.2),
      this.ctx!.currentTime,
      0.1,
    );
  }

  // Chiptune click for UI interactions
  playClick() {
    if (!this.ctx || !this.masterGain || this._muted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "square";
    osc.frequency.value = 800;
    gain.gain.value = 0.1;
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  // Section transition swoosh
  playSwoosh() {
    if (!this.ctx || !this.masterGain || this._muted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 200;
    osc.frequency.exponentialRampToValueAtTime(
      800,
      this.ctx.currentTime + 0.15,
    );
    gain.gain.value = 0.06;
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  // Gear shift sound
  playGearShift() {
    if (!this.ctx || !this.masterGain || this._muted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.value = 150;
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.05);
    osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.1);
    gain.gain.value = 0.1;
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  // Start race countdown beeps
  playCountdownBeep(final = false) {
    if (!this.ctx || !this.masterGain || this._muted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "square";
    osc.frequency.value = final ? 1200 : 600;
    gain.gain.value = 0.12;
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      this.ctx.currentTime + (final ? 0.4 : 0.2),
    );
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + (final ? 0.4 : 0.2));
  }

  toggleMute() {
    this._muted = !this._muted;
    if (this.masterGain) {
      this.masterGain.gain.value = this._muted ? 0 : 0.15;
    }
    return this._muted;
  }

  destroy() {
    this.engineOsc?.stop();
    this.ctx?.close();
    this.ctx = null;
    this.isPlaying = false;
  }
}

// Singleton
let audioEngine: RetroAudioEngine | null = null;

export function getAudioEngine(): RetroAudioEngine {
  if (!audioEngine) {
    audioEngine = new RetroAudioEngine();
  }
  return audioEngine;
}

/* ──────────────────────────────────────────────
   SOUND TOGGLE BUTTON & INIT OVERLAY
────────────────────────────────────────────── */
export default function SoundManager() {
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(false);
  const [countdown, setCountdown] = useState(-1);
  const engine = useRef<RetroAudioEngine | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const muteButtonRef = useRef<HTMLButtonElement>(null);

  const handleStart = useCallback(() => {
    const e = getAudioEngine();
    e.init();
    engine.current = e;

    // Countdown sequence
    setCountdown(5);
    let count = 5;
    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        e.playCountdownBeep(false);
        setCountdown(count);
      } else {
        e.playCountdownBeep(true);
        e.startEngine();
        setCountdown(-1);
        // Fade out overlay then set started
        if (overlayRef.current) {
          gsap.to(overlayRef.current, {
            opacity: 0,
            duration: 0.5,
            onComplete: () => setStarted(true),
          });
        } else {
          setStarted(true);
        }
        clearInterval(interval);
      }
    }, 600);
  }, []);

  const handleToggleMute = useCallback(() => {
    if (!engine.current) return;
    engine.current.playClick();
    const isMuted = engine.current.toggleMute();
    setMuted(isMuted);
  }, []);

  // Pulsing title animation
  useEffect(() => {
    if (!started && countdown < 0 && titleRef.current) {
      gsap.to(titleRef.current, {
        opacity: 0.5,
        duration: 1,
        repeat: -1,
        yoyo: true,
        ease: "power1.inOut",
      });
    }
  }, [started, countdown]);

  // Fade in mute button after start
  useEffect(() => {
    if (started && muteButtonRef.current) {
      gsap.from(muteButtonRef.current, {
        opacity: 0,
        y: 20,
        duration: 0.5,
        delay: 1,
        ease: "power2.out",
      });
    }
  }, [started]);

  // Start screen overlay
  if (!started) {
    return (
      <div
        ref={overlayRef}
        className="fixed inset-0 z-[100] bg-[#0d0a07] flex flex-col items-center justify-center"
      >
        <div className="scanline-overlay" />
        <div className="relative z-10 flex flex-col items-center gap-6">
          {countdown >= 0 ? (
            <>
              {/* Countdown lights */}
              <div className="flex gap-3">
                {[5, 4, 3, 2, 1].map((n) => (
                  <div
                    key={n}
                    className={`w-8 h-8 rounded-full border-2 transition-all duration-300 ${
                      countdown <= n - 1
                        ? countdown === 0
                          ? "bg-[#5aaa40] border-[#5aaa40] shadow-[0_0_20px_#5aaa40]"
                          : "bg-[#c4722a] border-[#c4722a] shadow-[0_0_20px_#c4722a]"
                        : "bg-[#1a1108] border-[#2e2415]"
                    }`}
                  />
                ))}
              </div>
              <div className="font-pixel text-sm text-[#c4722a]">
                {countdown > 0 ? countdown : "GO!"}
              </div>
            </>
          ) : (
            <>
              <div
                ref={titleRef}
                className="font-pixel text-xl text-[#c4722a] text-center"
                style={{
                  textShadow: "2px 2px 0 #6a3010, 4px 4px 0 #3a1808",
                }}
              >
                F1 PORTFOLIO
              </div>
              <div className="font-pixel text-[8px] text-[#6a5840] text-center tracking-wider">
                Om Brahmbhatt · Full Stack Engineer
              </div>
              <button
                onClick={handleStart}
                className="mt-4 font-pixel text-[10px] px-6 py-3 bg-[#c4722a] text-[#0d0a07] rounded-lg border-2 border-[#f0a040] cursor-pointer tracking-wider transition-all hover:bg-[#f0a040] hover:scale-105 active:scale-95"
              >
                START RACE
              </button>
              <div className="font-mono text-[8px] text-[#4a3c28] mt-2">
                🔊 Sound on for full experience
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Mute toggle (after started)
  return (
    <button
      ref={muteButtonRef}
      onClick={handleToggleMute}
      className="fixed bottom-4 left-4 z-[60] bg-[#0d0a07cc] border border-[#2e2415] rounded-lg px-3 py-2 backdrop-blur-sm cursor-pointer pointer-events-auto font-pixel text-[8px] text-[#c4722a] tracking-wider transition-colors hover:border-[#c4722a]"
    >
      {muted ? "🔇 MUTED" : "🔊 SOUND"}
    </button>
  );
}
