"use client";

import { useScrollStore } from "@/store/scrollStore";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

/* Native line helper (replaces drei Line which crashes the scene) */
function NativeLine({
  points,
  color,
}: {
  points: [number, number, number][];
  color: string;
}) {
  const lineObj = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(points.length * 3);
    for (let i = 0; i < points.length; i++) {
      positions[i * 3] = points[i][0];
      positions[i * 3 + 1] = points[i][1];
      positions[i * 3 + 2] = points[i][2];
    }
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.LineBasicMaterial({ color });
    return new THREE.Line(geo, mat);
  }, [points, color]);
  return <primitive object={lineObj} />;
}

/* Track path - large oval circuit, no self-intersection possible */
function createTrackPath() {
  // Grand Prix-scale circuit. Two straights (~480 units) separated by
  // 480 units, connected by sweeping 160-unit-radius turns.
  // Track is 40 units wide, min separation = 480 >> 40. No overlap possible.
  return new THREE.CatmullRomCurve3(
    [
      // Bottom straight (heading east, z = 0)
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(96, 0, 0),
      new THREE.Vector3(192, 0, 0),
      new THREE.Vector3(288, 0, 0),
      new THREE.Vector3(384, 0, 0),
      new THREE.Vector3(480, 0, 0),
      // Right turn (sweeping north)
      new THREE.Vector3(552, 0, -40),
      new THREE.Vector3(608, 0, -112),
      new THREE.Vector3(632, 0, -208),
      new THREE.Vector3(624, 0, -304),
      new THREE.Vector3(584, 0, -384),
      new THREE.Vector3(528, 0, -440),
      // Top straight (heading west, z ~ -480)
      new THREE.Vector3(448, 0, -472),
      new THREE.Vector3(352, 0, -480),
      new THREE.Vector3(256, 0, -480),
      new THREE.Vector3(160, 0, -480),
      new THREE.Vector3(80, 0, -472),
      // Left turn (sweeping south back to start)
      new THREE.Vector3(8, 0, -440),
      new THREE.Vector3(-48, 0, -384),
      new THREE.Vector3(-80, 0, -304),
      new THREE.Vector3(-88, 0, -208),
      new THREE.Vector3(-72, 0, -112),
      new THREE.Vector3(-40, 0, -48),
    ],
    true,
    "catmullrom",
    0.3,
  );
}

/* Helper: get perpendicular direction for flat XZ track */
const UP = new THREE.Vector3(0, 1, 0);
function getTrackLeft(path: THREE.CatmullRomCurve3, t: number) {
  const tangent = path.getTangentAt(t);
  return new THREE.Vector3().crossVectors(UP, tangent).normalize();
}

/* Shared smooth progress so camera and car stay perfectly synced */
let playerSmoothedT = 0;

const TRACK_HALF_WIDTH = 20;

/* Track surface - cross-product based width */
function TrackSurface() {
  const path = useMemo(createTrackPath, []);
  const geometry = useMemo(() => {
    const SEGS = 300;
    const positions: number[] = [];
    const indices: number[] = [];
    for (let i = 0; i <= SEGS; i++) {
      const safet = i / SEGS; // closed curve: t=1.0 == t=0.0
      const p = path.getPointAt(safet % 1 || 0);
      const left = getTrackLeft(path, safet % 1 || 0.001);
      positions.push(
        p.x + left.x * TRACK_HALF_WIDTH,
        0.01,
        p.z + left.z * TRACK_HALF_WIDTH,
      );
      positions.push(
        p.x - left.x * TRACK_HALF_WIDTH,
        0.01,
        p.z - left.z * TRACK_HALF_WIDTH,
      );
      if (i < SEGS) {
        const a = i * 2;
        indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }, [path]);
  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial color="#0a0a0a" />
    </mesh>
  );
}

/* Track edge lines */
function TrackEdges() {
  const path = useMemo(createTrackPath, []);
  const { left, right, center } = useMemo(() => {
    const SEGS = 300;
    const l: [number, number, number][] = [];
    const r: [number, number, number][] = [];
    const c: [number, number, number][] = [];
    for (let i = 0; i <= SEGS; i++) {
      const t = (i / SEGS) % 1 || (i === 0 ? 0 : 0.001);
      const p = path.getPointAt(t);
      const dir = getTrackLeft(path, t || 0.001);
      l.push([
        p.x + dir.x * TRACK_HALF_WIDTH,
        0.05,
        p.z + dir.z * TRACK_HALF_WIDTH,
      ]);
      r.push([
        p.x - dir.x * TRACK_HALF_WIDTH,
        0.05,
        p.z - dir.z * TRACK_HALF_WIDTH,
      ]);
      c.push([p.x, 0.04, p.z]);
    }
    return { left: l, right: r, center: c };
  }, [path]);

  /* Start/finish grid markings */
  const gridMarks = useMemo(() => {
    const marks: { pos: [number, number, number]; rot: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const t = Math.min(0.005 + i * 0.012, 0.999);
      const p = path.getPointAt(t);
      const tangent = path.getTangentAt(t);
      marks.push({
        pos: [p.x, 0.02, p.z],
        rot: Math.atan2(tangent.x, tangent.z),
      });
    }
    return marks;
  }, [path]);

  return (
    <group>
      <NativeLine points={left} color="#ff6a00" />
      <NativeLine points={right} color="#ff6a00" />
      <NativeLine points={center} color="#3a2010" />
      {/* Start grid boxes */}
      {gridMarks.map((m, i) => (
        <group key={`grid${i}`}>
          <mesh
            position={[m.pos[0] - 1.5, 0.02, m.pos[2]]}
            rotation={[0, m.rot, 0]}
          >
            <boxGeometry args={[0.5, 0.01, 0.8]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh
            position={[m.pos[0] + 1.5, 0.02, m.pos[2]]}
            rotation={[0, m.rot, 0]}
          >
            <boxGeometry args={[0.5, 0.01, 0.8]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* Track fencing - catch fence on both sides */
function TrackFencing() {
  const path = useMemo(createTrackPath, []);
  const posts = useMemo(() => {
    const result: { pos: [number, number, number]; rot: number }[] = [];
    const COUNT = 400;
    for (let i = 0; i < COUNT; i++) {
      const t = i / COUNT;
      const p = path.getPointAt(t);
      const left = getTrackLeft(path, t);
      const tangent = path.getTangentAt(t);
      const rot = Math.atan2(tangent.x, tangent.z);
      const offset = TRACK_HALF_WIDTH + 2;
      result.push({
        pos: [p.x + left.x * offset, 0, p.z + left.z * offset],
        rot,
      });
      result.push({
        pos: [p.x - left.x * offset, 0, p.z - left.z * offset],
        rot,
      });
    }
    return result;
  }, [path]);
  return (
    <group>
      {posts.map((f, i) => (
        <group key={`fn${i}`} position={f.pos} rotation={[0, f.rot, 0]}>
          {/* Vertical post */}
          <mesh position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 1.0, 6]} />
            <meshBasicMaterial color="#666" />
          </mesh>
          {/* Upper rail */}
          <mesh position={[0, 0.9, 0]}>
            <boxGeometry args={[0.02, 0.04, 6]} />
            <meshBasicMaterial color="#999" />
          </mesh>
          {/* Lower rail */}
          <mesh position={[0, 0.45, 0]}>
            <boxGeometry args={[0.02, 0.04, 6]} />
            <meshBasicMaterial color="#999" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* Curb strips - realistic red/white kerbs */
function CurbBlocks() {
  const path = useMemo(createTrackPath, []);
  const blocks = useMemo(() => {
    const result: { pos: [number, number, number]; color: string }[] = [];
    const COUNT = 100;
    for (let i = 0; i < COUNT; i++) {
      const t = i / COUNT;
      const p = path.getPointAt(t);
      const left = getTrackLeft(path, t);
      const offset = TRACK_HALF_WIDTH + 0.3;
      result.push({
        pos: [p.x + left.x * offset, 0.04, p.z + left.z * offset],
        color: i % 2 === 0 ? "#cc2020" : "#f5f5f5",
      });
      result.push({
        pos: [p.x - left.x * offset, 0.04, p.z - left.z * offset],
        color: i % 2 === 0 ? "#f5f5f5" : "#cc2020",
      });
    }
    return result;
  }, [path]);
  return (
    <group>
      {blocks.map((b, i) => (
        <mesh key={i} position={b.pos}>
          <boxGeometry args={[0.4, 0.08, 0.8]} />
          <meshBasicMaterial color={b.color} />
        </mesh>
      ))}
    </group>
  );
}

/* ── McLaren-style F1 Car Body ── */
function F1CarBody({
  bodyColor,
  accentColor,
}: {
  bodyColor: string;
  accentColor: string;
}) {
  const flWheel = useRef<THREE.Group>(null);
  const frWheel = useRef<THREE.Group>(null);
  const rlWheel = useRef<THREE.Group>(null);
  const rrWheel = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    const spin = 10 * delta;
    if (flWheel.current) flWheel.current.rotation.x += spin;
    if (frWheel.current) frWheel.current.rotation.x += spin;
    if (rlWheel.current) rlWheel.current.rotation.x += spin;
    if (rrWheel.current) rrWheel.current.rotation.x += spin;
  });
  return (
    <group>
      {/* ── SURVIVAL CELL / MONOCOQUE ── */}
      {/* Main tub - carbon fiber black center */}
      <mesh position={[0, 0.13, -0.2]}>
        <boxGeometry args={[0.58, 0.2, 2.4]} />
        <meshBasicMaterial color="#1a1a1a" />
      </mesh>
      {/* Upper monocoque shell - stepped down from cockpit surround */}
      <mesh position={[0, 0.22, -0.6]}>
        <boxGeometry args={[0.52, 0.06, 1.2]} />
        <meshBasicMaterial color="#1a1a1a" />
      </mesh>

      {/* ── NOSE SECTION ── */}
      {/* Nose cone - long taper, MCL style dropped nose */}
      <mesh position={[0, 0.1, -1.5]} rotation={[0.05, 0, 0]}>
        <boxGeometry args={[0.35, 0.1, 0.9]} />
        <meshBasicMaterial color={accentColor} />
      </mesh>
      <mesh position={[0, 0.08, -2.0]} rotation={[0.06, 0, 0]}>
        <boxGeometry args={[0.22, 0.07, 0.6]} />
        <meshBasicMaterial color={accentColor} />
      </mesh>
      <mesh position={[0, 0.06, -2.35]}>
        <boxGeometry args={[0.14, 0.04, 0.35]} />
        <meshBasicMaterial color={accentColor} />
      </mesh>
      {/* Nose tip */}
      <mesh position={[0, 0.055, -2.55]}>
        <boxGeometry args={[0.08, 0.025, 0.12]} />
        <meshBasicMaterial color={accentColor} />
      </mesh>

      {/* ── FRONT WING ── */}
      {/* Main plane */}
      <mesh position={[0, 0.04, -2.6]}>
        <boxGeometry args={[1.6, 0.02, 0.25]} />
        <meshBasicMaterial color="#1a1a1a" />
      </mesh>
      {/* Upper flap */}
      <mesh position={[0, 0.065, -2.55]}>
        <boxGeometry args={[1.5, 0.015, 0.15]} />
        <meshBasicMaterial color={accentColor} />
      </mesh>
      {/* Lower flap */}
      <mesh position={[0, 0.025, -2.65]}>
        <boxGeometry args={[1.55, 0.015, 0.1]} />
        <meshBasicMaterial color={accentColor} />
      </mesh>
      {/* Endplates - complex shape */}
      {[-0.8, 0.8].map((x, i) => (
        <group key={`fwep${i}`}>
          <mesh position={[x, 0.05, -2.6]}>
            <boxGeometry args={[0.025, 0.1, 0.35]} />
            <meshBasicMaterial color={accentColor} />
          </mesh>
          {/* Endplate canard */}
          <mesh position={[x, 0.04, -2.75]} rotation={[0.2, 0, 0]}>
            <boxGeometry args={[0.02, 0.04, 0.08]} />
            <meshBasicMaterial color="#1a1a1a" />
          </mesh>
        </group>
      ))}
      {/* Front wing pylons (nose to wing) */}
      {[-0.08, 0.08].map((x, i) => (
        <mesh key={`fwp${i}`} position={[x, 0.045, -2.45]}>
          <boxGeometry args={[0.015, 0.03, 0.15]} />
          <meshBasicMaterial color="#1a1a1a" />
        </mesh>
      ))}

      {/* ── SIDEPODS ── */}
      {/* Sidepod main body - undercut style */}
      {[-1, 1].map((s, i) => (
        <group key={`sp${i}`}>
          {/* Upper sidepod */}
          <mesh position={[s * 0.42, 0.22, -0.15]}>
            <boxGeometry args={[0.3, 0.12, 1.5]} />
            <meshBasicMaterial color="#1a1a1a" />
          </mesh>
          {/* Sidepod accent stripe */}
          <mesh position={[s * 0.56, 0.22, -0.15]}>
            <boxGeometry args={[0.02, 0.1, 1.2]} />
            <meshBasicMaterial color={accentColor} />
          </mesh>
          {/* Undercut shape */}
          <mesh position={[s * 0.42, 0.14, 0.1]}>
            <boxGeometry args={[0.28, 0.06, 1.0]} />
            <meshBasicMaterial color="#111" />
          </mesh>
          {/* Sidepod inlet - large opening */}
          <mesh position={[s * 0.44, 0.24, -0.92]}>
            <boxGeometry args={[0.28, 0.14, 0.06]} />
            <meshBasicMaterial color="#050505" />
          </mesh>
          {/* Inlet surround - accent colored */}
          <mesh position={[s * 0.44, 0.32, -0.92]}>
            <boxGeometry args={[0.3, 0.02, 0.07]} />
            <meshBasicMaterial color={accentColor} />
          </mesh>
          {/* Sidepod vane */}
          <mesh position={[s * 0.56, 0.2, -0.7]}>
            <boxGeometry args={[0.015, 0.12, 0.2]} />
            <meshBasicMaterial color="#1a1a1a" />
          </mesh>
        </group>
      ))}

      {/* ── COCKPIT / HALO ── */}
      {/* Cockpit rim - raised edges */}
      <mesh position={[0, 0.27, -0.55]}>
        <boxGeometry args={[0.42, 0.06, 0.7]} />
        <meshBasicMaterial color="#0a0a0a" />
      </mesh>
      {/* Cockpit side protection */}
      {[-0.22, 0.22].map((x, i) => (
        <mesh key={`cp${i}`} position={[x, 0.26, -0.55]}>
          <boxGeometry args={[0.04, 0.08, 0.6]} />
          <meshBasicMaterial color={accentColor} />
        </mesh>
      ))}
      {/* HALO - titanium colored */}
      {/* Halo center pillar */}
      <mesh position={[0, 0.34, -0.9]}>
        <boxGeometry args={[0.05, 0.04, 0.06]} />
        <meshBasicMaterial color="#888" />
      </mesh>
      {/* Halo top bar */}
      <mesh position={[0, 0.37, -0.55]}>
        <boxGeometry args={[0.04, 0.04, 0.72]} />
        <meshBasicMaterial color="#888" />
      </mesh>
      {/* Halo side arms */}
      {[-0.16, 0.16].map((x, i) => (
        <mesh key={`hsa${i}`} position={[x, 0.34, -0.25]}>
          <boxGeometry args={[0.035, 0.03, 0.4]} />
          <meshBasicMaterial color="#888" />
        </mesh>
      ))}
      {/* Halo side connections */}
      {[-0.16, 0.16].map((x, i) => (
        <mesh key={`hsc${i}`} position={[x, 0.33, -0.05]}>
          <boxGeometry args={[0.1, 0.025, 0.06]} />
          <meshBasicMaterial color="#888" />
        </mesh>
      ))}

      {/* ── DRIVER ── */}
      {/* Helmet */}
      <mesh position={[0, 0.33, -0.5]}>
        <sphereGeometry args={[0.095, 12, 8]} />
        <meshBasicMaterial color="#f0e0d0" />
      </mesh>
      {/* Visor */}
      <mesh position={[0, 0.34, -0.59]}>
        <boxGeometry args={[0.14, 0.04, 0.02]} />
        <meshBasicMaterial color="#222" />
      </mesh>

      {/* ── AIR INTAKE / ROLL STRUCTURE ── */}
      <mesh position={[0, 0.38, -0.15]}>
        <boxGeometry args={[0.12, 0.2, 0.22]} />
        <meshBasicMaterial color="#1a1a1a" />
      </mesh>
      {/* T-cam */}
      <mesh position={[0, 0.49, -0.15]}>
        <boxGeometry args={[0.04, 0.02, 0.06]} />
        <meshBasicMaterial color={accentColor} />
      </mesh>

      {/* ── MIRRORS ── */}
      {[-0.35, 0.35].map((x, i) => (
        <group key={`mir${i}`}>
          <mesh position={[x, 0.3, -0.65]}>
            <boxGeometry args={[0.06, 0.04, 0.03]} />
            <meshBasicMaterial color="#1a1a1a" />
          </mesh>
          {/* Mirror glass */}
          <mesh position={[x, 0.3, -0.665]}>
            <boxGeometry args={[0.05, 0.03, 0.005]} />
            <meshBasicMaterial color="#6688aa" />
          </mesh>
          {/* Mirror stalk */}
          <mesh position={[x * 0.85, 0.28, -0.65]}>
            <boxGeometry args={[0.08, 0.012, 0.015]} />
            <meshBasicMaterial color="#1a1a1a" />
          </mesh>
        </group>
      ))}

      {/* ── ENGINE COVER & SHARK FIN ── */}
      <mesh position={[0, 0.2, 0.5]}>
        <boxGeometry args={[0.38, 0.14, 1.1]} />
        <meshBasicMaterial color="#1a1a1a" />
      </mesh>
      {/* Engine cover accent swoosh */}
      <mesh position={[0, 0.28, 0.3]}>
        <boxGeometry args={[0.36, 0.02, 0.8]} />
        <meshBasicMaterial color={accentColor} />
      </mesh>
      {/* Shark fin */}
      <mesh position={[0, 0.32, 0.7]}>
        <boxGeometry args={[0.015, 0.12, 0.6]} />
        <meshBasicMaterial color="#1a1a1a" />
      </mesh>

      {/* ── REAR WING ── */}
      {/* Main plane */}
      <mesh position={[0, 0.52, 1.3]}>
        <boxGeometry args={[0.82, 0.03, 0.22]} />
        <meshBasicMaterial color={accentColor} />
      </mesh>
      {/* DRS flap */}
      <mesh position={[0, 0.565, 1.25]}>
        <boxGeometry args={[0.78, 0.02, 0.12]} />
        <meshBasicMaterial color={accentColor} />
      </mesh>
      {/* Beam wing */}
      <mesh position={[0, 0.38, 1.28]}>
        <boxGeometry args={[0.6, 0.015, 0.1]} />
        <meshBasicMaterial color="#1a1a1a" />
      </mesh>
      {/* Endplates */}
      {[-0.42, 0.42].map((x, i) => (
        <mesh key={`rwe${i}`} position={[x, 0.47, 1.3]}>
          <boxGeometry args={[0.025, 0.22, 0.3]} />
          <meshBasicMaterial color={accentColor} />
        </mesh>
      ))}
      {/* Rear wing swan-neck mounts */}
      {[-0.1, 0.1].map((x, i) => (
        <mesh key={`rwm${i}`} position={[x, 0.38, 1.15]}>
          <boxGeometry args={[0.02, 0.28, 0.04]} />
          <meshBasicMaterial color="#333" />
        </mesh>
      ))}

      {/* ── FLOOR / GROUND EFFECT ── */}
      {/* Main floor */}
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[0.8, 0.012, 3.0]} />
        <meshBasicMaterial color="#111" />
      </mesh>
      {/* Floor edges - wider at rear */}
      {[-0.45, 0.45].map((x, i) => (
        <mesh key={`fe${i}`} position={[x, 0.02, 0.3]}>
          <boxGeometry args={[0.12, 0.01, 2.0]} />
          <meshBasicMaterial color="#111" />
        </mesh>
      ))}
      {/* Diffuser */}
      <mesh position={[0, 0.04, 1.35]} rotation={[-0.15, 0, 0]}>
        <boxGeometry args={[0.75, 0.015, 0.25]} />
        <meshBasicMaterial color="#111" />
      </mesh>
      {/* Diffuser fences */}
      {[-0.25, -0.08, 0.08, 0.25].map((x, i) => (
        <mesh key={`dff${i}`} position={[x, 0.06, 1.35]}>
          <boxGeometry args={[0.015, 0.08, 0.2]} />
          <meshBasicMaterial color="#1a1a1a" />
        </mesh>
      ))}
      {/* Rain light */}
      <mesh position={[0, 0.22, 1.42]}>
        <boxGeometry args={[0.2, 0.04, 0.025]} />
        <meshBasicMaterial color="#ff2200" />
      </mesh>

      {/* ── FRONT WHEELS ── */}
      {[
        { x: -0.72, ref: flWheel },
        { x: 0.72, ref: frWheel },
      ].map(({ x, ref }, i) => {
        const outSign = x > 0 ? 1 : -1;
        return (
          <group key={`fwh${i}`} position={[x, 0.18, -1.4]}>
            <group ref={ref}>
              {/* Rubber tread (outer barrel) */}
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.22, 0.22, 0.14, 32]} />
                <meshBasicMaterial color="#2a2a2a" />
              </mesh>
              {/* Outer sidewall (red - soft compound) */}
              <mesh
                rotation={[0, 0, Math.PI / 2]}
                position={[outSign * 0.07, 0, 0]}
              >
                <cylinderGeometry args={[0.22, 0.22, 0.006, 32]} />
                <meshBasicMaterial color="#dd1111" />
              </mesh>
              {/* Inner sidewall (red) */}
              <mesh
                rotation={[0, 0, Math.PI / 2]}
                position={[-outSign * 0.07, 0, 0]}
              >
                <cylinderGeometry args={[0.22, 0.22, 0.006, 32]} />
                <meshBasicMaterial color="#dd1111" />
              </mesh>
              {/* Rim */}
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.13, 0.13, 0.15, 20]} />
                <meshBasicMaterial color="#aaa" />
              </mesh>
              {/* Center lock nut */}
              <mesh
                rotation={[0, 0, Math.PI / 2]}
                position={[outSign * 0.076, 0, 0]}
              >
                <cylinderGeometry args={[0.035, 0.035, 0.015, 6]} />
                <meshBasicMaterial color="#ddd" />
              </mesh>
            </group>
          </group>
        );
      })}

      {/* ── REAR WHEELS (wider) ── */}
      {[
        { x: -0.7, ref: rlWheel },
        { x: 0.7, ref: rrWheel },
      ].map(({ x, ref }, i) => {
        const outSign = x > 0 ? 1 : -1;
        return (
          <group key={`rwh${i}`} position={[x, 0.21, 0.95]}>
            <group ref={ref}>
              {/* Rubber tread (outer barrel) */}
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.25, 0.25, 0.2, 32]} />
                <meshBasicMaterial color="#2a2a2a" />
              </mesh>
              {/* Outer sidewall (yellow - medium compound) */}
              <mesh
                rotation={[0, 0, Math.PI / 2]}
                position={[outSign * 0.1, 0, 0]}
              >
                <cylinderGeometry args={[0.25, 0.25, 0.006, 32]} />
                <meshBasicMaterial color="#e8c811" />
              </mesh>
              {/* Inner sidewall (yellow) */}
              <mesh
                rotation={[0, 0, Math.PI / 2]}
                position={[-outSign * 0.1, 0, 0]}
              >
                <cylinderGeometry args={[0.25, 0.25, 0.006, 32]} />
                <meshBasicMaterial color="#e8c811" />
              </mesh>
              {/* Rim */}
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.15, 0.15, 0.21, 20]} />
                <meshBasicMaterial color="#aaa" />
              </mesh>
              {/* Center lock nut */}
              <mesh
                rotation={[0, 0, Math.PI / 2]}
                position={[outSign * 0.106, 0, 0]}
              >
                <cylinderGeometry args={[0.04, 0.04, 0.015, 6]} />
                <meshBasicMaterial color="#ddd" />
              </mesh>
            </group>
          </group>
        );
      })}

      {/* ── SUSPENSION ── */}
      {/* Front upper wishbone */}
      {[-1, 1].map((s, i) => (
        <group key={`fus${i}`}>
          <mesh position={[s * 0.48, 0.18, -1.25]}>
            <boxGeometry args={[0.3, 0.012, 0.025]} />
            <meshBasicMaterial color="#555" />
          </mesh>
          <mesh position={[s * 0.48, 0.18, -1.5]}>
            <boxGeometry args={[0.3, 0.012, 0.025]} />
            <meshBasicMaterial color="#555" />
          </mesh>
          {/* Front lower wishbone */}
          <mesh position={[s * 0.48, 0.1, -1.3]}>
            <boxGeometry args={[0.3, 0.012, 0.025]} />
            <meshBasicMaterial color="#555" />
          </mesh>
          <mesh position={[s * 0.48, 0.1, -1.5]}>
            <boxGeometry args={[0.3, 0.012, 0.025]} />
            <meshBasicMaterial color="#555" />
          </mesh>
          {/* Push rod */}
          <mesh position={[s * 0.5, 0.15, -1.35]} rotation={[0, 0, s * 0.3]}>
            <boxGeometry args={[0.012, 0.12, 0.015]} />
            <meshBasicMaterial color="#666" />
          </mesh>
        </group>
      ))}
      {/* Rear suspension */}
      {[-1, 1].map((s, i) => (
        <group key={`rs${i}`}>
          <mesh position={[s * 0.47, 0.17, 0.85]}>
            <boxGeometry args={[0.28, 0.012, 0.025]} />
            <meshBasicMaterial color="#555" />
          </mesh>
          <mesh position={[s * 0.47, 0.17, 1.05]}>
            <boxGeometry args={[0.28, 0.012, 0.025]} />
            <meshBasicMaterial color="#555" />
          </mesh>
          <mesh position={[s * 0.47, 0.1, 0.9]}>
            <boxGeometry args={[0.28, 0.012, 0.025]} />
            <meshBasicMaterial color="#555" />
          </mesh>
        </group>
      ))}

      {/* ── BARGEBOARDS / TURNING VANES ── */}
      {[-0.3, 0.3].map((x, i) => (
        <group key={`bb${i}`}>
          <mesh position={[x, 0.12, -1.0]}>
            <boxGeometry args={[0.012, 0.1, 0.15]} />
            <meshBasicMaterial color="#1a1a1a" />
          </mesh>
          <mesh position={[x * 1.1, 0.1, -1.05]}>
            <boxGeometry args={[0.012, 0.08, 0.12]} />
            <meshBasicMaterial color="#1a1a1a" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* Detailed F1 Car (Player) */
function PixelF1Car({ path }: { path: THREE.CatmullRomCurve3 }) {
  const carRef = useRef<THREE.Group>(null);
  const scrollProgress = useScrollStore((s) => s.progress);
  useFrame(() => {
    if (!carRef.current) return;
    // Shortest-path delta to handle 1→0 wrap without snapping backward
    let delta = scrollProgress - playerSmoothedT;
    if (delta > 0.5) delta -= 1;
    if (delta < -0.5) delta += 1;
    playerSmoothedT += delta * 0.08;
    const t = ((playerSmoothedT % 1) + 1) % 1;
    const pos = path.getPointAt(t);
    const lookAt = path.getPointAt((t + 0.01) % 1);
    carRef.current.position.set(pos.x, 0.05, pos.z);
    carRef.current.lookAt(lookAt.x, 0.05, lookAt.z);
  });
  return (
    <group ref={carRef}>
      <group rotation={[0, Math.PI, 0]}>
        <F1CarBody bodyColor="#1a1a1a" accentColor="#ff8000" />
      </group>
      <pointLight
        position={[0, 0.2, 2.5]}
        color="#f0e8d0"
        intensity={4}
        distance={10}
      />
      <pointLight
        position={[0, 0.2, -1.4]}
        color="#ff3020"
        intensity={2}
        distance={5}
      />
    </group>
  );
}

/* Rival Cars */
function RivalCar({
  path,
  offset,
  color,
  laneOffset,
}: {
  path: THREE.CatmullRomCurve3;
  offset: number;
  color: string;
  laneOffset: number;
}) {
  const carRef = useRef<THREE.Group>(null);
  const speed = useRef(0.0003 + offset * 0.0001);
  const t = useRef(offset);
  useFrame(() => {
    if (!carRef.current) return;
    t.current = (((t.current + speed.current) % 1) + 1) % 1;
    const safeT = t.current;
    const pos = path.getPointAt(safeT);
    const aheadT = (safeT + 0.01) % 1;
    const aheadPos = path.getPointAt(aheadT);
    const left = getTrackLeft(path, safeT);
    const aheadLeft = getTrackLeft(path, aheadT);
    carRef.current.position.set(
      pos.x + left.x * laneOffset,
      0.05,
      pos.z + left.z * laneOffset,
    );
    carRef.current.lookAt(
      aheadPos.x + aheadLeft.x * laneOffset,
      0.05,
      aheadPos.z + aheadLeft.z * laneOffset,
    );
  });
  return (
    <group ref={carRef} scale={0.9}>
      <group rotation={[0, Math.PI, 0]}>
        <F1CarBody bodyColor={color} accentColor="#ddd" />
      </group>
      <pointLight
        position={[0, 0.2, -1.4]}
        color="#ff4444"
        intensity={2}
        distance={6}
      />
    </group>
  );
}

/* Pit Stop LED Boards */
interface PitStopProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  title: string;
  icon: string;
  sectionId: string;
}

function PitStopBillboard({
  position,
  rotation = [0, 0, 0],
  title,
}: PitStopProps) {
  const meshRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    meshRef.current.position.y =
      position[1] + Math.sin(clock.getElapsedTime() * 2) * 0.08 + 0.5;
  });
  return (
    <group ref={meshRef} position={position} rotation={rotation}>
      {/* Main board frame */}
      <mesh position={[0, 2.8, 0]}>
        <boxGeometry args={[4.2, 2.8, 0.2]} />
        <meshBasicMaterial color="#1a1108" />
      </mesh>
      {/* LED screen */}
      <mesh position={[0, 2.8, -0.12]}>
        <planeGeometry args={[3.8, 2.4]} />
        <meshBasicMaterial color="#0a0806" />
      </mesh>
      {/* Frame border - top/bottom */}
      {[3.95, 1.65].map((y, i) => (
        <mesh key={`bh${i}`} position={[0, y, -0.12]}>
          <boxGeometry args={[3.9, 0.06, 0.03]} />
          <meshBasicMaterial color="#c4722a" />
        </mesh>
      ))}
      {/* Frame border - sides */}
      {[-1.93, 1.93].map((x, i) => (
        <mesh key={`bv${i}`} position={[x, 2.8, -0.12]}>
          <boxGeometry args={[0.06, 2.36, 0.03]} />
          <meshBasicMaterial color="#c4722a" />
        </mesh>
      ))}
      {/* Title bar - LED style */}
      <mesh position={[0, 3.5, -0.16]}>
        <boxGeometry args={[2.8, 0.35, 0.02]} />
        <meshBasicMaterial color="#f0a040" />
      </mesh>
      {/* LED pixel dots for label */}
      {title.split("").map((_, i) => (
        <mesh key={i} position={[-0.8 + i * 0.22, 2.7, -0.16]}>
          <boxGeometry args={[0.14, 0.14, 0.02]} />
          <meshBasicMaterial color="#f0a040" />
        </mesh>
      ))}
      {/* Support structure - metal poles */}
      {[-1.6, 1.6].map((x, i) => (
        <mesh key={`post${i}`} position={[x, 0.7, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 2.8, 6]} />
          <meshBasicMaterial color="#3a3028" />
        </mesh>
      ))}
      {/* Base plates */}
      {[-1.6, 1.6].map((x, i) => (
        <mesh key={`base${i}`} position={[x, -0.65, 0]}>
          <cylinderGeometry args={[0.25, 0.25, 0.08, 8]} />
          <meshBasicMaterial color="#2a2018" />
        </mesh>
      ))}
      <pointLight
        position={[0, 3.5, -0.5]}
        color="#f0a040"
        intensity={6}
        distance={12}
      />
    </group>
  );
}

/* Ground & Track Surface */
function GroundGrid() {
  return (
    <group>
      {/* Ground plane - tarmac runoff */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[300, 300]} />
        <meshBasicMaterial color="#060503" />
      </mesh>
      {/* Subtle grid */}
      <gridHelper
        args={[250, 50, "#0f0d0a", "#0f0d0a"]}
        position={[0, -0.01, 0]}
      />
      {/* Gravel trap (lighter ground near track) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[20, -0.015, -25]}>
        <circleGeometry args={[50, 32]} />
        <meshBasicMaterial color="#0d0a06" />
      </mesh>
    </group>
  );
}

/* Environment */
function TrackEnvironment() {
  const path = useMemo(createTrackPath, []);
  const floodlights = useMemo(() => {
    const lights: { pos: [number, number, number] }[] = [];
    for (let i = 0; i < 8; i++) {
      const t = Math.min(i / 8, 0.999);
      const p = path.getPointAt(t);
      const left = getTrackLeft(path, t);
      const offset = TRACK_HALF_WIDTH + 8;
      lights.push({ pos: [p.x + left.x * offset, 0, p.z + left.z * offset] });
    }
    return lights;
  }, [path]);
  return (
    <group>
      {/* Grandstands with roof */}
      {[
        { t: 0.1, side: 1 },
        { t: 0.35, side: -1 },
        { t: 0.6, side: 1 },
        { t: 0.85, side: -1 },
      ].map((gs, idx) => {
        const t = Math.min(gs.t, 0.999);
        const p = path.getPointAt(t);
        const left = getTrackLeft(path, t);
        const tangent = path.getTangentAt(t);
        const offset = (TRACK_HALF_WIDTH + 10) * gs.side;
        const angle = Math.atan2(tangent.x, tangent.z);
        return (
          <group
            key={`gs${idx}`}
            position={[p.x + left.x * offset, 0, p.z + left.z * offset]}
            rotation={[0, angle, 0]}
          >
            {/* Seating tiers */}
            {Array.from({ length: 5 }).map((_, row) => (
              <mesh key={row} position={[0, row * 0.7 + 0.35, row * 0.5]}>
                <boxGeometry args={[10, 0.4, 0.7]} />
                <meshBasicMaterial
                  color={row % 2 === 0 ? "#1e1608" : "#2a1e10"}
                />
              </mesh>
            ))}
            {/* Roof structure */}
            <mesh position={[0, 4.5, 2]}>
              <boxGeometry args={[11, 0.12, 4]} />
              <meshBasicMaterial color="#1a1108" />
            </mesh>
            {/* Roof support pillars */}
            {[-4.5, -1.5, 1.5, 4.5].map((x, i) => (
              <mesh key={`pillar${i}`} position={[x, 2.25, 2.5]}>
                <cylinderGeometry args={[0.08, 0.08, 4.5, 6]} />
                <meshBasicMaterial color="#2e2415" />
              </mesh>
            ))}
            {/* Crowd - more detailed figures */}
            {Array.from({ length: 25 }).map((_, j) => (
              <group
                key={`c${j}`}
                position={[
                  ((j % 5) - 2) * 1.5,
                  Math.floor(j / 5) * 0.7 + 0.75,
                  Math.floor(j / 5) * 0.5 + 0.15,
                ]}
              >
                {/* Body */}
                <mesh>
                  <boxGeometry args={[0.18, 0.35, 0.15]} />
                  <meshBasicMaterial
                    color={
                      [
                        "#c4722a",
                        "#f0a040",
                        "#d4882a",
                        "#5a8a40",
                        "#4a6ea8",
                        "#cc3333",
                        "#8844aa",
                      ][j % 7]
                    }
                  />
                </mesh>
                {/* Head */}
                <mesh position={[0, 0.22, 0]}>
                  <sphereGeometry args={[0.06, 6, 4]} />
                  <meshBasicMaterial color="#d4a574" />
                </mesh>
              </group>
            ))}
          </group>
        );
      })}
      {/* TecPro barriers & tire walls */}
      {Array.from({ length: 30 }).map((_, i) => {
        const t = Math.min(i / 30, 0.999);
        const p = path.getPointAt(t);
        const left = getTrackLeft(path, t);
        const offset = TRACK_HALF_WIDTH + 1.2;
        const isCorner = i % 4 === 0;
        return (
          <group key={`b${i}`}>
            {/* Left barrier */}
            <group position={[p.x + left.x * offset, 0, p.z + left.z * offset]}>
              <mesh position={[0, 0.25, 0]}>
                <boxGeometry args={[0.3, 0.5, 1.5]} />
                <meshBasicMaterial color={isCorner ? "#c4722a" : "#2a1e10"} />
              </mesh>
              {isCorner && (
                <mesh position={[0, 0.5, 0]}>
                  <cylinderGeometry args={[0.15, 0.15, 1.5, 8]} />
                  <meshBasicMaterial color="#1a1108" />
                </mesh>
              )}
            </group>
            {/* Right barrier */}
            <group position={[p.x - left.x * offset, 0, p.z - left.z * offset]}>
              <mesh position={[0, 0.25, 0]}>
                <boxGeometry args={[0.3, 0.5, 1.5]} />
                <meshBasicMaterial color={isCorner ? "#c4722a" : "#2a1e10"} />
              </mesh>
              {isCorner && (
                <mesh position={[0, 0.5, 0]}>
                  <cylinderGeometry args={[0.15, 0.15, 1.5, 8]} />
                  <meshBasicMaterial color="#1a1108" />
                </mesh>
              )}
            </group>
          </group>
        );
      })}
      {/* Floodlight towers */}
      {floodlights.map((fl, i) => (
        <group key={`fl${i}`} position={fl.pos}>
          {/* Lattice tower - cylinder pole */}
          <mesh position={[0, 6, 0]}>
            <cylinderGeometry args={[0.08, 0.15, 12, 6]} />
            <meshBasicMaterial color="#2e2415" />
          </mesh>
          {/* Light housing */}
          <mesh position={[0, 12.2, 0]}>
            <boxGeometry args={[1.2, 0.4, 0.5]} />
            <meshBasicMaterial color="#ddd" />
          </mesh>
          {/* Light panels */}
          {[-0.35, 0, 0.35].map((x, j) => (
            <mesh key={j} position={[x, 12.1, -0.3]}>
              <boxGeometry args={[0.25, 0.25, 0.05]} />
              <meshBasicMaterial color="#ffe8b0" />
            </mesh>
          ))}
          <pointLight
            position={[0, 12, 0]}
            color="#f0e8d0"
            intensity={25}
            distance={35}
          />
          {/* Base plate */}
          <mesh position={[0, 0.05, 0]}>
            <cylinderGeometry args={[0.5, 0.5, 0.1, 8]} />
            <meshBasicMaterial color="#1a1108" />
          </mesh>
        </group>
      ))}
      {/* Start/Finish gantry */}
      <group position={[15, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        {/* Main pillars - thick steel */}
        {[-21.5, 21.5].map((x, i) => (
          <mesh key={`gp${i}`} position={[x, 5.5, 0]}>
            <boxGeometry args={[0.7, 11, 0.7]} />
            <meshBasicMaterial color="#555" />
          </mesh>
        ))}
        {/* Crossbar - wide overhead beam */}
        <mesh position={[0, 11.2, 0]}>
          <boxGeometry args={[43.7, 0.7, 1.2]} />
          <meshBasicMaterial color="#444" />
        </mesh>
        {/* FIA lights panel - dark background */}
        <mesh position={[0, 10.6, -0.6]}>
          <boxGeometry args={[16, 1.0, 0.14]} />
          <meshBasicMaterial color="#111" />
        </mesh>
        {/* Start lights - 5 columns of lights */}
        {[-3.2, -1.6, 0, 1.6, 3.2].map((x, i) => (
          <group key={`sl${i}`} position={[x, 10.6, -0.66]}>
            {/* Top light */}
            <mesh position={[0, 0.2, 0]}>
              <sphereGeometry args={[0.12, 12, 8]} />
              <meshBasicMaterial color={i < 2 ? "#22cc22" : "#ff2200"} />
            </mesh>
            {/* Bottom light */}
            <mesh position={[0, -0.2, 0]}>
              <sphereGeometry args={[0.12, 12, 8]} />
              <meshBasicMaterial color={i < 2 ? "#22cc22" : "#ff2200"} />
            </mesh>
          </group>
        ))}
        {/* Sponsor banner */}
        <mesh position={[0, 11.8, -0.3]}>
          <boxGeometry args={[14, 0.7, 0.08]} />
          <meshBasicMaterial color="#f0a040" />
        </mesh>
        {/* Checkered flag strip on road */}
        {Array.from({ length: 40 }).map((_, i) => (
          <mesh
            key={`chk${i}`}
            position={[(i - 19.5) * 1, 0.01, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[0.9, 0.7]} />
            <meshBasicMaterial color={i % 2 === 0 ? "#fff" : "#111"} />
          </mesh>
        ))}
        <pointLight
          position={[0, 10, -1]}
          color="#f0a040"
          intensity={25}
          distance={35}
        />
      </group>
      {/* Realistic trees */}
      {Array.from({ length: 18 }).map((_, i) => {
        const angle = (i / 18) * Math.PI * 2;
        const radius = 420 + (i % 3) * 40;
        const x = Math.cos(angle) * radius + 272;
        const z = Math.sin(angle) * radius - 240;
        const scale = 0.8 + (i % 4) * 0.15;
        return (
          <group key={`tree${i}`} position={[x, 0, z]} scale={scale}>
            {/* Trunk - cylinder */}
            <mesh position={[0, 1.5, 0]}>
              <cylinderGeometry args={[0.12, 0.18, 3, 8]} />
              <meshBasicMaterial color="#3a2510" />
            </mesh>
            {/* Canopy - layered cones */}
            <mesh position={[0, 3.8, 0]}>
              <coneGeometry args={[1.4, 2.0, 8]} />
              <meshBasicMaterial color="#1a5a14" />
            </mesh>
            <mesh position={[0, 4.8, 0]}>
              <coneGeometry args={[1.1, 1.6, 8]} />
              <meshBasicMaterial color="#228a1e" />
            </mesh>
            <mesh position={[0, 5.6, 0]}>
              <coneGeometry args={[0.7, 1.2, 8]} />
              <meshBasicMaterial color="#2aaa24" />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/* Particle Sparks */
function Sparks() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const count = 80;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const particles = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * 60 + 15,
        y: Math.random() * 6 + 0.5,
        z: (Math.random() - 0.5) * 80 - 20,
        speed: Math.random() * 0.5 + 0.2,
        phase: Math.random() * Math.PI * 2,
        scale: Math.random() * 0.08 + 0.03,
      })),
    [],
  );
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    particles.forEach((p, i) => {
      dummy.position.set(
        p.x + Math.sin(t * p.speed + p.phase) * 0.5,
        p.y + Math.sin(t * p.speed * 1.5 + p.phase) * 0.3,
        p.z,
      );
      dummy.scale.setScalar(p.scale * (0.5 + Math.sin(t * 2 + p.phase) * 0.5));
      dummy.updateMatrix();
      ref.current!.setMatrixAt(i, dummy.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#f0a040" transparent opacity={0.6} />
    </instancedMesh>
  );
}

/* Camera Controller - cockpit view */
function CameraController() {
  const { camera } = useThree();
  const path = useMemo(createTrackPath, []);
  useFrame(() => {
    // Read the same smoothed T the car already computed this frame
    const t = ((playerSmoothedT % 1) + 1) % 1;
    const carPos = path.getPointAt(t);
    const lookTarget = path.getPointAt((t + 0.015) % 1);
    const tangent = path.getTangentAt(t);
    // Cockpit cam: sit at driver's head position, slightly forward along travel direction
    camera.position.set(
      carPos.x + tangent.x * 0.3,
      0.55,
      carPos.z + tangent.z * 0.3,
    );
    camera.lookAt(lookTarget.x, 0.3, lookTarget.z);
  });
  return null;
}

/* Main export */
export { createTrackPath };

export default function RacingWorld() {
  const path = useMemo(createTrackPath, []);
  const pitStops: PitStopProps[] = useMemo(() => {
    const stops = [
      { t: 0.05, title: "START", icon: "\u{1F3C1}", sectionId: "hero" },
      { t: 0.18, title: "ABOUT", icon: "\u{1F464}", sectionId: "about" },
      { t: 0.35, title: "PROJECTS", icon: "\u{1F3D7}", sectionId: "projects" },
      { t: 0.52, title: "SKILLS", icon: "\u26A1", sectionId: "skills" },
      {
        t: 0.7,
        title: "EXPERIENCE",
        icon: "\u{1F3C6}",
        sectionId: "experience",
      },
      { t: 0.88, title: "CONTACT", icon: "\u{1F4E1}", sectionId: "contact" },
    ];
    return stops.map((stop) => {
      const safeT = Math.min(stop.t, 0.999);
      const pos = path.getPointAt(safeT);
      const left = getTrackLeft(path, safeT);
      const tangent = path.getTangentAt(safeT);
      const angle = Math.atan2(tangent.x, tangent.z);
      const sideOffset = TRACK_HALF_WIDTH + 5;
      return {
        position: [
          pos.x + left.x * sideOffset,
          0,
          pos.z + left.z * sideOffset,
        ] as [number, number, number],
        rotation: [0, angle + Math.PI / 2, 0] as [number, number, number],
        title: stop.title,
        icon: stop.icon,
        sectionId: stop.sectionId,
      };
    });
  }, [path]);
  return (
    <Canvas
      camera={{ position: [0, 0.45, 0], fov: 75, near: 0.05, far: 2000 }}
      gl={{ antialias: true }}
      style={{ position: "absolute", inset: 0, zIndex: 1 }}
    >
      <color attach="background" args={["#0a0806"]} />
      <fog attach="fog" args={["#0a0806", 280, 1120]} />
      <ambientLight intensity={0.4} color="#f0d5a8" />
      <hemisphereLight args={["#f0d5a8", "#0a0806", 0.4]} />
      <GroundGrid />
      <TrackSurface />
      <TrackEdges />
      <CurbBlocks />
      <TrackFencing />
      <PixelF1Car path={path} />
      <RivalCar path={path} offset={0.12} color="#3178c6" laneOffset={8} />
      <RivalCar path={path} offset={0.38} color="#dc382d" laneOffset={-8} />
      <RivalCar path={path} offset={0.62} color="#22c55e" laneOffset={-4} />
      {pitStops.map((stop) => (
        <PitStopBillboard key={stop.sectionId} {...stop} />
      ))}
      <TrackEnvironment />
      <Sparks />
      <CameraController />
    </Canvas>
  );
}
