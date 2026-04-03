"use client";

import { getAudioEngine } from "@/components/SoundManager";
import { SECTION_THRESHOLDS, useScrollStore } from "@/store/scrollStore";
import { useCallback, useEffect, useRef } from "react";

/*
  ScrollController:
  - Momentum-based physics: keys accelerate/decelerate like a real car
  - Maps wheel/touch events to scroll progress (0-1)
  - Updates active section based on thresholds
  - Supports keyboard navigation (ArrowUp/Down, WASD)
*/
export default function ScrollController() {
  const setProgress = useScrollStore((s) => s.setProgress);
  const setActiveSection = useScrollStore((s) => s.setActiveSection);
  const setSpeed = useScrollStore((s) => s.setSpeed);
  const setLap = useScrollStore((s) => s.setLap);
  const progressRef = useRef(0);
  const lapRef = useRef(1);
  const prevSection = useRef("hero");
  const prevGear = useRef(1);
  // Momentum physics
  const velocityRef = useRef(0);
  const keysDown = useRef<Set<string>>(new Set());
  const rafRef = useRef<number>(0);

  const applyProgress = useCallback(
    (newProgress: number, speed: number) => {
      // Infinite loop: wrap around instead of clamping
      if (newProgress >= 1) {
        newProgress = newProgress - 1;
        lapRef.current += 1;
        setLap(lapRef.current);
      } else if (newProgress < 0) {
        newProgress = newProgress + 1;
        lapRef.current = Math.max(1, lapRef.current - 1);
        setLap(lapRef.current);
      }
      progressRef.current = newProgress;
      setProgress(newProgress);
      setSpeed(speed);

      // Determine active section
      for (const [key, val] of Object.entries(SECTION_THRESHOLDS)) {
        if (newProgress >= val.start && newProgress < val.end) {
          if (prevSection.current !== key) {
            prevSection.current = key;
            setActiveSection(key);
            try {
              getAudioEngine().playSwoosh();
            } catch {}
          }
          break;
        }
      }

      // Gear shift sound
      const gear = Math.min(Math.floor(newProgress * 8) + 1, 8);
      if (gear !== prevGear.current) {
        prevGear.current = gear;
        try {
          getAudioEngine().playGearShift();
        } catch {}
      }

      // Engine pitch
      try {
        getAudioEngine().setEngineSpeed(speed * 0.5);
      } catch {}
    },
    [setProgress, setActiveSection, setSpeed, setLap],
  );

  // Physics loop: acceleration, friction, velocity → position
  useEffect(() => {
    const ACCELERATION = 0.000063;
    const FRICTION = 0.93;
    const MAX_SPEED = 0.001134;

    const tick = () => {
      const keys = keysDown.current;
      let thrust = 0;
      if (keys.has("ArrowUp") || keys.has("w") || keys.has("W"))
        thrust += ACCELERATION;
      if (keys.has("ArrowDown") || keys.has("s") || keys.has("S"))
        thrust -= ACCELERATION;
      if (keys.has("ArrowRight") || keys.has("d") || keys.has("D"))
        thrust += ACCELERATION * 0.5;
      if (keys.has("ArrowLeft") || keys.has("a") || keys.has("A"))
        thrust -= ACCELERATION * 0.5;

      velocityRef.current += thrust;
      velocityRef.current *= FRICTION; // drag
      // Clamp speed
      velocityRef.current = Math.max(
        -MAX_SPEED,
        Math.min(MAX_SPEED, velocityRef.current),
      );
      // Kill tiny drift
      if (Math.abs(velocityRef.current) < 0.00005) velocityRef.current = 0;

      if (velocityRef.current !== 0 && useScrollStore.getState().racing) {
        const newP = progressRef.current + velocityRef.current;
        applyProgress(newP, Math.abs(velocityRef.current) * 100);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [applyProgress]);

  useEffect(() => {
    // Wheel handler — still instant-response, small deltas feel fine
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      // Feed wheel into velocity for momentum
      velocityRef.current += e.deltaY * 0.0000315;
    };

    // Touch handlers
    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const delta = (touchStartY - e.touches[0].clientY) * 0.000042;
      touchStartY = e.touches[0].clientY;
      velocityRef.current += delta;
    };

    // Keyboard: track key state, physics loop handles the rest
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        [
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          "w",
          "W",
          "a",
          "A",
          "s",
          "S",
          "d",
          "D",
        ].includes(e.key)
      ) {
        e.preventDefault();
        keysDown.current.add(e.key);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysDown.current.delete(e.key);
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  return null;
}
