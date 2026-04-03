"use client";

import { getAudioEngine } from "@/components/SoundManager";
import { useScrollStore } from "@/store/scrollStore";
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
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

const TRACK_HALF_WIDTH = 20;

/* Shared mutable car state — read by both PlayerCar and ChaseCamera each frame */
const CAR_STATE = {
  position: new THREE.Vector3(4, 0.17, 0),
  yaw: Math.PI / 2, // faces +X (east), along first straight
  speed: 0,
  steerAngle: 0,
};

/* Build a ribbon mesh along the track at a given lateral offset and width */
function buildRibbonGeometry(
  path: THREE.CatmullRomCurve3,
  halfWidth: number,
  lateralOffset: number,
  yHeight: number,
  segs: number,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= segs; i++) {
    const t = (i / segs) % 1 || (i === 0 ? 0 : 0.0001);
    const p = path.getPointAt(t);
    const left = getTrackLeft(path, t === 0 ? 0.001 : t);
    const cx = p.x + left.x * lateralOffset;
    const cz = p.z + left.z * lateralOffset;
    positions.push(
      cx + left.x * halfWidth, yHeight, cz + left.z * halfWidth,
      cx - left.x * halfWidth, yHeight, cz - left.z * halfWidth,
    );
    if (i < segs) {
      const a = i * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/* Track surface - asphalt base */
function TrackSurface() {
  const path = useMemo(() => createTrackPath(), []);

  // Main asphalt — full width, clearly raised above grass
  const asphaltGeo = useMemo(
    () => buildRibbonGeometry(path, TRACK_HALF_WIDTH, 0, 0.12, 300),
    [path],
  );
  // White edge strips — 1.5 units wide on each outer edge
  const leftEdgeGeo = useMemo(
    () => buildRibbonGeometry(path, 1.5, TRACK_HALF_WIDTH - 1.5, 0.14, 300),
    [path],
  );
  const rightEdgeGeo = useMemo(
    () => buildRibbonGeometry(path, 1.5, -(TRACK_HALF_WIDTH - 1.5), 0.14, 300),
    [path],
  );

  return (
    <group>
      <mesh geometry={asphaltGeo}>
        <meshStandardMaterial color="#606060" roughness={0.88} metalness={0.05} />
      </mesh>
      <mesh geometry={leftEdgeGeo}>
        <meshStandardMaterial color="#eeeeee" roughness={0.65} metalness={0} />
      </mesh>
      <mesh geometry={rightEdgeGeo}>
        <meshStandardMaterial color="#eeeeee" roughness={0.65} metalness={0} />
      </mesh>
    </group>
  );
}

/* Track markings — dashed center line + solid outer white bounds + start grid */
function TrackEdges() {
  const path = useMemo(() => createTrackPath(), []);

  // Dashed center line: all dashes merged into ONE geometry — 1 draw call
  const centerDashGeo = useMemo(() => {
    const TOTAL = 120;
    const DASH_LEN = 0.006;
    const segs = 3;
    const allPositions: number[] = [];
    const allIndices: number[] = [];
    let vertOffset = 0;
    for (let i = 0; i < TOTAL; i++) {
      const tStart = i / TOTAL;
      const tEnd = tStart + DASH_LEN;
      for (let j = 0; j <= segs; j++) {
        const t = Math.min(tStart + (j / segs) * (tEnd - tStart), 0.9999);
        const p = path.getPointAt(t);
        const left = getTrackLeft(path, t);
        allPositions.push(p.x + left.x * 0.6, 0.17, p.z + left.z * 0.6);
        allPositions.push(p.x - left.x * 0.6, 0.17, p.z - left.z * 0.6);
        if (j < segs) {
          const a = vertOffset + j * 2;
          allIndices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
        }
      }
      vertOffset += (segs + 1) * 2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(allPositions, 3));
    geo.setIndex(allIndices);
    geo.computeVertexNormals();
    return geo;
  }, [path]);

  /* Start/finish grid boxes */
  const gridMarks = useMemo(() => {
    const marks: { pos: [number, number, number]; rot: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const t = Math.min(0.005 + i * 0.012, 0.999);
      const p = path.getPointAt(t);
      const tangent = path.getTangentAt(t);
      marks.push({
        pos: [p.x, 0.18, p.z],
        rot: Math.atan2(tangent.x, tangent.z),
      });
    }
    return marks;
  }, [path]);

  return (
    <group>
      {/* Dashed center line — single draw call */}
      <mesh geometry={centerDashGeo}>
        <meshStandardMaterial color="#ffffff" roughness={0.6} metalness={0} />
      </mesh>
      {/* Start grid boxes */}
      {gridMarks.map((m, i) => (
        <group key={`grid${i}`}>
          <mesh position={[m.pos[0] - 3, 0.05, m.pos[2]]} rotation={[0, m.rot, 0]}>
            <boxGeometry args={[1.2, 0.01, 2.0]} />
            <meshStandardMaterial color="#ffffff" roughness={0.6} />
          </mesh>
          <mesh position={[m.pos[0] + 3, 0.05, m.pos[2]]} rotation={[0, m.rot, 0]}>
            <boxGeometry args={[1.2, 0.01, 2.0]} />
            <meshStandardMaterial color="#ffffff" roughness={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* Track fencing — 3 InstancedMesh draw calls instead of 2400 */
function TrackFencing() {
  const path = useMemo(() => createTrackPath(), []);
  const postRef = useRef<THREE.InstancedMesh>(null);
  const railUpRef = useRef<THREE.InstancedMesh>(null);
  const railLoRef = useRef<THREE.InstancedMesh>(null);
  const COUNT = 400;

  useEffect(() => {
    const dummy = new THREE.Object3D();
    const offset = TRACK_HALF_WIDTH + 2;
    let idx = 0;
    for (let i = 0; i < COUNT; i++) {
      const t = i / COUNT;
      const p = path.getPointAt(t);
      const left = getTrackLeft(path, t);
      const tangent = path.getTangentAt(t);
      const rot = Math.atan2(tangent.x, tangent.z);
      for (const side of [1, -1]) {
        const bx = p.x + left.x * offset * side;
        const bz = p.z + left.z * offset * side;
        dummy.position.set(bx, 0.17 + 0.5, bz);
        dummy.rotation.y = rot;
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        postRef.current?.setMatrixAt(idx, dummy.matrix);
        dummy.position.set(bx, 0.17 + 0.9, bz);
        dummy.updateMatrix();
        railUpRef.current?.setMatrixAt(idx, dummy.matrix);
        dummy.position.set(bx, 0.17 + 0.45, bz);
        dummy.updateMatrix();
        railLoRef.current?.setMatrixAt(idx, dummy.matrix);
        idx++;
      }
    }
    if (postRef.current) postRef.current.instanceMatrix.needsUpdate = true;
    if (railUpRef.current) railUpRef.current.instanceMatrix.needsUpdate = true;
    if (railLoRef.current) railLoRef.current.instanceMatrix.needsUpdate = true;
  }, [path]);

  const total = COUNT * 2;
  return (
    <group>
      <instancedMesh ref={postRef} args={[undefined, undefined, total]}>
        <cylinderGeometry args={[0.03, 0.03, 1.0, 5]} />
        <meshStandardMaterial color="#666" metalness={0.3} roughness={0.6} />
      </instancedMesh>
      <instancedMesh ref={railUpRef} args={[undefined, undefined, total]}>
        <boxGeometry args={[0.02, 0.04, 6]} />
        <meshStandardMaterial color="#999" metalness={0.4} roughness={0.5} />
      </instancedMesh>
      <instancedMesh ref={railLoRef} args={[undefined, undefined, total]}>
        <boxGeometry args={[0.02, 0.04, 6]} />
        <meshStandardMaterial color="#999" metalness={0.4} roughness={0.5} />
      </instancedMesh>
    </group>
  );
}

/* Curb strips - realistic red/white kerbs */
function CurbBlocks() {
  const path = useMemo(() => createTrackPath(), []);
  const blocks = useMemo(() => {
    const result: { pos: [number, number, number]; color: string }[] = [];
    const COUNT = 100;
    for (let i = 0; i < COUNT; i++) {
      const t = i / COUNT;
      const p = path.getPointAt(t);
      const left = getTrackLeft(path, t);
      const offset = TRACK_HALF_WIDTH + 0.3;
      result.push({
        pos: [p.x + left.x * offset, 0.15, p.z + left.z * offset],
        color: i % 2 === 0 ? "#cc2020" : "#f5f5f5",
      });
      result.push({
        pos: [p.x - left.x * offset, 0.15, p.z - left.z * offset],
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
          <meshStandardMaterial color={b.color} />
        </mesh>
      ))}
    </group>
  );
}

/* ── McLaren-style F1 Car Body ── */
function F1CarBody({
  bodyColor,
  accentColor,
  isPlayer = false,
}: {
  bodyColor: string;
  accentColor: string;
  isPlayer?: boolean;
}) {
  const flSteer = useRef<THREE.Group>(null);
  const frSteer = useRef<THREE.Group>(null);
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
    // Read live steer angle directly from CAR_STATE every frame
    if (isPlayer && flSteer.current) flSteer.current.rotation.y = CAR_STATE.steerAngle;
    if (isPlayer && frSteer.current) frSteer.current.rotation.y = CAR_STATE.steerAngle;
  });
  return (
    <group>
      {/* ── SURVIVAL CELL / MONOCOQUE ── */}
      {/* Main tub - carbon fiber black center */}
      <mesh position={[0, 0.13, -0.2]}>
        <boxGeometry args={[0.58, 0.2, 2.4]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.4} roughness={0.4} />
      </mesh>
      {/* Upper monocoque shell - stepped down from cockpit surround */}
      <mesh position={[0, 0.22, -0.6]}>
        <boxGeometry args={[0.52, 0.06, 1.2]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.4} roughness={0.4} />
      </mesh>

      {/* ── NOSE SECTION ── */}
      {/* Nose cone - long taper, MCL style dropped nose */}
      <mesh position={[0, 0.1, -1.5]} rotation={[0.05, 0, 0]}>
        <boxGeometry args={[0.35, 0.1, 0.9]} />
        <meshStandardMaterial color={accentColor} metalness={0.3} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.08, -2.0]} rotation={[0.06, 0, 0]}>
        <boxGeometry args={[0.22, 0.07, 0.6]} />
        <meshStandardMaterial color={accentColor} metalness={0.3} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.06, -2.35]}>
        <boxGeometry args={[0.14, 0.04, 0.35]} />
        <meshStandardMaterial color={accentColor} metalness={0.3} roughness={0.2} />
      </mesh>
      {/* Nose tip */}
      <mesh position={[0, 0.055, -2.55]}>
        <boxGeometry args={[0.08, 0.025, 0.12]} />
        <meshStandardMaterial color={accentColor} metalness={0.3} roughness={0.2} />
      </mesh>

      {/* ── FRONT WING ── */}
      {/* Main plane */}
      <mesh position={[0, 0.04, -2.6]}>
        <boxGeometry args={[1.6, 0.02, 0.25]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.4} roughness={0.4} />
      </mesh>
      {/* Upper flap */}
      <mesh position={[0, 0.065, -2.55]}>
        <boxGeometry args={[1.5, 0.015, 0.15]} />
        <meshStandardMaterial color={accentColor} metalness={0.3} roughness={0.2} />
      </mesh>
      {/* Lower flap */}
      <mesh position={[0, 0.025, -2.65]}>
        <boxGeometry args={[1.55, 0.015, 0.1]} />
        <meshStandardMaterial color={accentColor} metalness={0.3} roughness={0.2} />
      </mesh>
      {/* Endplates - complex shape */}
      {[-0.8, 0.8].map((x, i) => (
        <group key={`fwep${i}`}>
          <mesh position={[x, 0.05, -2.6]}>
            <boxGeometry args={[0.025, 0.1, 0.35]} />
            <meshStandardMaterial color={accentColor} metalness={0.3} roughness={0.2} />
          </mesh>
          {/* Endplate canard */}
          <mesh position={[x, 0.04, -2.75]} rotation={[0.2, 0, 0]}>
            <boxGeometry args={[0.02, 0.04, 0.08]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.4} roughness={0.4} />
          </mesh>
        </group>
      ))}
      {/* Front wing pylons (nose to wing) */}
      {[-0.08, 0.08].map((x, i) => (
        <mesh key={`fwp${i}`} position={[x, 0.045, -2.45]}>
          <boxGeometry args={[0.015, 0.03, 0.15]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.4} roughness={0.4} />
        </mesh>
      ))}

      {/* ── SIDEPODS ── */}
      {/* Sidepod main body - undercut style */}
      {[-1, 1].map((s, i) => (
        <group key={`sp${i}`}>
          {/* Upper sidepod */}
          <mesh position={[s * 0.42, 0.22, -0.15]}>
            <boxGeometry args={[0.3, 0.12, 1.5]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.4} roughness={0.4} />
          </mesh>
          {/* Sidepod accent stripe */}
          <mesh position={[s * 0.56, 0.22, -0.15]}>
            <boxGeometry args={[0.02, 0.1, 1.2]} />
            <meshStandardMaterial color={accentColor} metalness={0.3} roughness={0.2} />
          </mesh>
          {/* Undercut shape */}
          <mesh position={[s * 0.42, 0.14, 0.1]}>
            <boxGeometry args={[0.28, 0.06, 1.0]} />
            <meshStandardMaterial color="#111" metalness={0.3} roughness={0.5} />
          </mesh>
          {/* Sidepod inlet - large opening */}
          <mesh position={[s * 0.44, 0.24, -0.92]}>
            <boxGeometry args={[0.28, 0.14, 0.06]} />
            <meshStandardMaterial color="#050505" metalness={0.0} roughness={0.8} />
          </mesh>
          {/* Inlet surround - accent colored */}
          <mesh position={[s * 0.44, 0.32, -0.92]}>
            <boxGeometry args={[0.3, 0.02, 0.07]} />
            <meshStandardMaterial color={accentColor} metalness={0.3} roughness={0.2} />
          </mesh>
          {/* Sidepod vane */}
          <mesh position={[s * 0.56, 0.2, -0.7]}>
            <boxGeometry args={[0.015, 0.12, 0.2]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.4} roughness={0.4} />
          </mesh>
        </group>
      ))}

      {/* ── COCKPIT / HALO ── */}
      {/* Cockpit rim - raised edges */}
      <mesh position={[0, 0.27, -0.55]}>
        <boxGeometry args={[0.42, 0.06, 0.7]} />
        <meshStandardMaterial color="#0a0a0a" metalness={0.3} roughness={0.5} />
      </mesh>
      {/* Cockpit side protection */}
      {[-0.22, 0.22].map((x, i) => (
        <mesh key={`cp${i}`} position={[x, 0.26, -0.55]}>
          <boxGeometry args={[0.04, 0.08, 0.6]} />
          <meshStandardMaterial color={accentColor} metalness={0.3} roughness={0.2} />
        </mesh>
      ))}
      {/* HALO - titanium colored */}
      {/* Halo center pillar */}
      <mesh position={[0, 0.34, -0.9]}>
        <boxGeometry args={[0.05, 0.04, 0.06]} />
        <meshStandardMaterial color="#888" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Halo top bar */}
      <mesh position={[0, 0.37, -0.55]}>
        <boxGeometry args={[0.04, 0.04, 0.72]} />
        <meshStandardMaterial color="#888" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Halo side arms */}
      {[-0.16, 0.16].map((x, i) => (
        <mesh key={`hsa${i}`} position={[x, 0.34, -0.25]}>
          <boxGeometry args={[0.035, 0.03, 0.4]} />
          <meshStandardMaterial color="#888" metalness={0.9} roughness={0.1} />
        </mesh>
      ))}
      {/* Halo side connections */}
      {[-0.16, 0.16].map((x, i) => (
        <mesh key={`hsc${i}`} position={[x, 0.33, -0.05]}>
          <boxGeometry args={[0.1, 0.025, 0.06]} />
          <meshStandardMaterial color="#888" metalness={0.9} roughness={0.1} />
        </mesh>
      ))}

      {/* ── DRIVER ── */}
      {/* Helmet */}
      <mesh position={[0, 0.33, -0.5]}>
        <sphereGeometry args={[0.095, 12, 8]} />
        <meshStandardMaterial color="#f0e0d0" />
      </mesh>
      {/* Visor */}
      <mesh position={[0, 0.34, -0.59]}>
        <boxGeometry args={[0.14, 0.04, 0.02]} />
        <meshStandardMaterial color="#222" />
      </mesh>

      {/* ── AIR INTAKE / ROLL STRUCTURE ── */}
      <mesh position={[0, 0.38, -0.15]}>
        <boxGeometry args={[0.12, 0.2, 0.22]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.4} roughness={0.4} />
      </mesh>
      {/* T-cam */}
      <mesh position={[0, 0.49, -0.15]}>
        <boxGeometry args={[0.04, 0.02, 0.06]} />
        <meshStandardMaterial color={accentColor} metalness={0.3} roughness={0.2} />
      </mesh>

      {/* ── MIRRORS ── */}
      {[-0.35, 0.35].map((x, i) => (
        <group key={`mir${i}`}>
          <mesh position={[x, 0.3, -0.65]}>
            <boxGeometry args={[0.06, 0.04, 0.03]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.4} roughness={0.4} />
          </mesh>
          {/* Mirror glass */}
          <mesh position={[x, 0.3, -0.665]}>
            <boxGeometry args={[0.05, 0.03, 0.005]} />
            <meshStandardMaterial color="#6688aa" />
          </mesh>
          {/* Mirror stalk */}
          <mesh position={[x * 0.85, 0.28, -0.65]}>
            <boxGeometry args={[0.08, 0.012, 0.015]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.4} roughness={0.4} />
          </mesh>
        </group>
      ))}

      {/* ── ENGINE COVER & SHARK FIN ── */}
      <mesh position={[0, 0.2, 0.5]}>
        <boxGeometry args={[0.38, 0.14, 1.1]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.4} roughness={0.4} />
      </mesh>
      {/* Engine cover accent swoosh */}
      <mesh position={[0, 0.28, 0.3]}>
        <boxGeometry args={[0.36, 0.02, 0.8]} />
        <meshStandardMaterial color={accentColor} metalness={0.3} roughness={0.2} />
      </mesh>
      {/* Shark fin */}
      <mesh position={[0, 0.32, 0.7]}>
        <boxGeometry args={[0.015, 0.12, 0.6]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.4} roughness={0.4} />
      </mesh>

      {/* ── REAR WING ── */}
      {/* Main plane */}
      <mesh position={[0, 0.52, 1.3]}>
        <boxGeometry args={[0.82, 0.03, 0.22]} />
        <meshStandardMaterial color={accentColor} metalness={0.3} roughness={0.2} />
      </mesh>
      {/* DRS flap */}
      <mesh position={[0, 0.565, 1.25]}>
        <boxGeometry args={[0.78, 0.02, 0.12]} />
        <meshStandardMaterial color={accentColor} metalness={0.3} roughness={0.2} />
      </mesh>
      {/* Beam wing */}
      <mesh position={[0, 0.38, 1.28]}>
        <boxGeometry args={[0.6, 0.015, 0.1]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.4} roughness={0.4} />
      </mesh>
      {/* Endplates */}
      {[-0.42, 0.42].map((x, i) => (
        <mesh key={`rwe${i}`} position={[x, 0.47, 1.3]}>
          <boxGeometry args={[0.025, 0.22, 0.3]} />
          <meshStandardMaterial color={accentColor} metalness={0.3} roughness={0.2} />
        </mesh>
      ))}
      {/* Rear wing swan-neck mounts */}
      {[-0.1, 0.1].map((x, i) => (
        <mesh key={`rwm${i}`} position={[x, 0.38, 1.15]}>
          <boxGeometry args={[0.02, 0.28, 0.04]} />
          <meshStandardMaterial color="#333" />
        </mesh>
      ))}

      {/* ── FLOOR / GROUND EFFECT ── */}
      {/* Main floor */}
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[0.8, 0.012, 3.0]} />
        <meshStandardMaterial color="#111" metalness={0.3} roughness={0.5} />
      </mesh>
      {/* Floor edges - wider at rear */}
      {[-0.45, 0.45].map((x, i) => (
        <mesh key={`fe${i}`} position={[x, 0.02, 0.3]}>
          <boxGeometry args={[0.12, 0.01, 2.0]} />
          <meshStandardMaterial color="#111" metalness={0.3} roughness={0.5} />
        </mesh>
      ))}
      {/* Diffuser */}
      <mesh position={[0, 0.04, 1.35]} rotation={[-0.15, 0, 0]}>
        <boxGeometry args={[0.75, 0.015, 0.25]} />
        <meshStandardMaterial color="#111" metalness={0.3} roughness={0.5} />
      </mesh>
      {/* Diffuser fences */}
      {[-0.25, -0.08, 0.08, 0.25].map((x, i) => (
        <mesh key={`dff${i}`} position={[x, 0.06, 1.35]}>
          <boxGeometry args={[0.015, 0.08, 0.2]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.4} roughness={0.4} />
        </mesh>
      ))}
      {/* Rain light */}
      <mesh position={[0, 0.22, 1.42]}>
        <boxGeometry args={[0.2, 0.04, 0.025]} />
        <meshStandardMaterial color="#ff2200" emissive="#ff2200" emissiveIntensity={3} />
      </mesh>
      {/* Headlight lenses — emissive white on nose sides */}
      {[-0.14, 0.14].map((x, i) => (
        <mesh key={`hl${i}`} position={[x, 0.1, -1.52]}>
          <boxGeometry args={[0.07, 0.05, 0.02]} />
          <meshStandardMaterial color="#ddeeff" emissive="#aaccff" emissiveIntensity={5} roughness={0.1} />
        </mesh>
      ))}

      {/* ── FRONT WHEELS ── */}
      {[
        { x: -0.72, spinRef: flWheel, steerRef: flSteer },
        { x: 0.72,  spinRef: frWheel, steerRef: frSteer },
      ].map(({ x, spinRef, steerRef }, i) => {
        const outSign = x > 0 ? 1 : -1;
        return (
          <group key={`fwh${i}`} ref={steerRef} position={[x, 0.18, -1.4]}>
            <group ref={spinRef}>
              {/* Rubber tread (outer barrel) */}
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.22, 0.22, 0.14, 32]} />
                <meshStandardMaterial color="#2a2a2a" metalness={0.0} roughness={0.95} />
              </mesh>
              {/* Outer sidewall (red - soft compound) */}
              <mesh
                rotation={[0, 0, Math.PI / 2]}
                position={[outSign * 0.07, 0, 0]}
              >
                <cylinderGeometry args={[0.22, 0.22, 0.006, 32]} />
                <meshStandardMaterial color="#dd1111" />
              </mesh>
              {/* Inner sidewall (red) */}
              <mesh
                rotation={[0, 0, Math.PI / 2]}
                position={[-outSign * 0.07, 0, 0]}
              >
                <cylinderGeometry args={[0.22, 0.22, 0.006, 32]} />
                <meshStandardMaterial color="#dd1111" />
              </mesh>
              {/* Rim */}
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.13, 0.13, 0.15, 20]} />
                <meshStandardMaterial color="#c0c0c0" metalness={0.85} roughness={0.1} />
              </mesh>
              {/* Center lock nut */}
              <mesh
                rotation={[0, 0, Math.PI / 2]}
                position={[outSign * 0.076, 0, 0]}
              >
                <cylinderGeometry args={[0.035, 0.035, 0.015, 6]} />
                <meshStandardMaterial color="#e8e8e8" metalness={0.9} roughness={0.05} />
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
                <meshStandardMaterial color="#2a2a2a" metalness={0.0} roughness={0.95} />
              </mesh>
              {/* Outer sidewall (yellow - medium compound) */}
              <mesh
                rotation={[0, 0, Math.PI / 2]}
                position={[outSign * 0.1, 0, 0]}
              >
                <cylinderGeometry args={[0.25, 0.25, 0.006, 32]} />
                <meshStandardMaterial color="#e8c811" />
              </mesh>
              {/* Inner sidewall (yellow) */}
              <mesh
                rotation={[0, 0, Math.PI / 2]}
                position={[-outSign * 0.1, 0, 0]}
              >
                <cylinderGeometry args={[0.25, 0.25, 0.006, 32]} />
                <meshStandardMaterial color="#e8c811" />
              </mesh>
              {/* Rim */}
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.15, 0.15, 0.21, 20]} />
                <meshStandardMaterial color="#c0c0c0" metalness={0.85} roughness={0.1} />
              </mesh>
              {/* Center lock nut */}
              <mesh
                rotation={[0, 0, Math.PI / 2]}
                position={[outSign * 0.106, 0, 0]}
              >
                <cylinderGeometry args={[0.04, 0.04, 0.015, 6]} />
                <meshStandardMaterial color="#e8e8e8" metalness={0.9} roughness={0.05} />
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
            <meshStandardMaterial color="#555" />
          </mesh>
          <mesh position={[s * 0.48, 0.18, -1.5]}>
            <boxGeometry args={[0.3, 0.012, 0.025]} />
            <meshStandardMaterial color="#555" />
          </mesh>
          {/* Front lower wishbone */}
          <mesh position={[s * 0.48, 0.1, -1.3]}>
            <boxGeometry args={[0.3, 0.012, 0.025]} />
            <meshStandardMaterial color="#555" />
          </mesh>
          <mesh position={[s * 0.48, 0.1, -1.5]}>
            <boxGeometry args={[0.3, 0.012, 0.025]} />
            <meshStandardMaterial color="#555" />
          </mesh>
          {/* Push rod */}
          <mesh position={[s * 0.5, 0.15, -1.35]} rotation={[0, 0, s * 0.3]}>
            <boxGeometry args={[0.012, 0.12, 0.015]} />
            <meshStandardMaterial color="#666" />
          </mesh>
        </group>
      ))}
      {/* Rear suspension */}
      {[-1, 1].map((s, i) => (
        <group key={`rs${i}`}>
          <mesh position={[s * 0.47, 0.17, 0.85]}>
            <boxGeometry args={[0.28, 0.012, 0.025]} />
            <meshStandardMaterial color="#555" />
          </mesh>
          <mesh position={[s * 0.47, 0.17, 1.05]}>
            <boxGeometry args={[0.28, 0.012, 0.025]} />
            <meshStandardMaterial color="#555" />
          </mesh>
          <mesh position={[s * 0.47, 0.1, 0.9]}>
            <boxGeometry args={[0.28, 0.012, 0.025]} />
            <meshStandardMaterial color="#555" />
          </mesh>
        </group>
      ))}

      {/* ── BARGEBOARDS / TURNING VANES ── */}
      {[-0.3, 0.3].map((x, i) => (
        <group key={`bb${i}`}>
          <mesh position={[x, 0.12, -1.0]}>
            <boxGeometry args={[0.012, 0.1, 0.15]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.4} roughness={0.4} />
          </mesh>
          <mesh position={[x * 1.1, 0.1, -1.05]}>
            <boxGeometry args={[0.012, 0.08, 0.12]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.4} roughness={0.4} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* Rival Cars — same bicycle-model physics as player, AI-steered */
function RivalCar({
  path,
  offset,
  color,
  laneOffset,
  topSpeed,
}: {
  path: THREE.CatmullRomCurve3;
  offset: number;
  color: string;
  laneOffset: number;
  topSpeed: number;
}) {
  const carRef = useRef<THREE.Group>(null);

  // Initialise from track position so the car starts on track
  const state = useRef((() => {
    const t0 = Math.min(offset, 0.999);
    const p0 = path.getPointAt(t0);
    const left = getTrackLeft(path, t0);
    const fwd = path.getTangentAt(t0);
    return {
      pos: new THREE.Vector3(
        p0.x + left.x * laneOffset,
        0.17,
        p0.z + left.z * laneOffset,
      ),
      yaw: Math.atan2(fwd.x, fwd.z),
      speed: 0,
      steerAngle: 0,
      nearestT: t0,
    };
  })());

  // Pre-sampled track points for nearest-point search
  const samples = useMemo(() => {
    const out: { pos: THREE.Vector3; t: number }[] = [];
    for (let i = 0; i < 300; i++) {
      const t = i / 300;
      const p = path.getPointAt(t);
      const left = getTrackLeft(path, t);
      out.push({
        pos: new THREE.Vector3(
          p.x + left.x * laneOffset,
          0,
          p.z + left.z * laneOffset,
        ),
        t,
      });
    }
    return out;
  }, [path, laneOffset]);

  useFrame((_, delta) => {
    if (!carRef.current) return;
    const dt = Math.min(delta, 0.05);
    const s = state.current;

    const ACCEL = 32, BRAKE = 50, MAX_REV = 8;
    const DRAG = 0.975, MAX_STEER = 0.55, WHEELBASE = 2.8;
    const LOOKAHEAD = 12; // units ahead on track to steer toward

    // Find nearest track sample (search near last known t for speed)
    let bestD = Infinity;
    let bestT = s.nearestT;
    const searchStart = Math.max(0, s.nearestT - 0.05);
    const searchEnd = Math.min(0.999, s.nearestT + 0.1);
    for (const sample of samples) {
      if (sample.t < searchStart || sample.t > searchEnd) continue;
      const dx = s.pos.x - sample.pos.x;
      const dz = s.pos.z - sample.pos.z;
      const d = dx * dx + dz * dz;
      if (d < bestD) { bestD = d; bestT = sample.t; }
    }
    // If nothing found nearby (e.g. after crossing t=1→0), full scan
    if (bestD > 400) {
      for (const sample of samples) {
        const dx = s.pos.x - sample.pos.x;
        const dz = s.pos.z - sample.pos.z;
        const d = dx * dx + dz * dz;
        if (d < bestD) { bestD = d; bestT = sample.t; }
      }
    }
    s.nearestT = bestT;

    // Lookahead target: a point ahead on the lane
    const lookaheadT = (bestT + LOOKAHEAD / 1400) % 1;
    const lookaheadP = path.getPointAt(Math.min(lookaheadT, 0.999));
    const lookaheadLeft = getTrackLeft(path, Math.min(lookaheadT, 0.999));
    const target = new THREE.Vector3(
      lookaheadP.x + lookaheadLeft.x * laneOffset,
      0,
      lookaheadP.z + lookaheadLeft.z * laneOffset,
    );

    // Desired yaw toward target
    const dx = target.x - s.pos.x;
    const dz = target.z - s.pos.z;
    const desiredYaw = Math.atan2(dx, dz);

    // Yaw error → steer
    let yawErr = desiredYaw - s.yaw;
    while (yawErr > Math.PI) yawErr -= Math.PI * 2;
    while (yawErr < -Math.PI) yawErr += Math.PI * 2;
    const steerTarget = Math.max(-MAX_STEER, Math.min(MAX_STEER, yawErr * 1.5));
    s.steerAngle += (steerTarget - s.steerAngle) * Math.min(1, 6 * dt);

    // Throttle — ease off on tight corners
    const cornerFactor = 1 - Math.abs(s.steerAngle) / MAX_STEER * 0.4;
    const effectiveTop = topSpeed * cornerFactor;
    if (s.speed < effectiveTop) {
      s.speed += ACCEL * dt;
    } else {
      s.speed -= BRAKE * 0.3 * dt;
    }
    s.speed *= Math.pow(DRAG, dt * 60);
    s.speed = Math.max(-MAX_REV, Math.min(effectiveTop, s.speed));

    // Bicycle model yaw
    if (Math.abs(s.speed) > 0.1) {
      s.yaw += ((s.speed * Math.sin(s.steerAngle)) / WHEELBASE) * dt;
    }

    // Move
    s.pos.x += Math.sin(s.yaw) * s.speed * dt;
    s.pos.z += Math.cos(s.yaw) * s.speed * dt;
    s.pos.y = 0.17;

    carRef.current.position.copy(s.pos);
    carRef.current.rotation.y = s.yaw;
  });

  return (
    <group ref={carRef} scale={0.9}>
      <group rotation={[0, Math.PI, 0]}>
        <F1CarBody bodyColor={color} accentColor="#ddd" />
      </group>
      {/* Rear red light */}
      <pointLight position={[0, 0.2, -1.4]} color="#ff4444" intensity={2} distance={6} />
      {/* Front headlights */}
      <pointLight position={[-0.35, 0.15, 2.6]} color="#ffffff" intensity={10} distance={28} />
      <pointLight position={[ 0.35, 0.15, 2.6]} color="#ffffff" intensity={10} distance={28} />
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
        <meshStandardMaterial color="#1a1108" />
      </mesh>
      {/* LED screen */}
      <mesh position={[0, 2.8, -0.12]}>
        <planeGeometry args={[3.8, 2.4]} />
        <meshStandardMaterial color="#0a0806" />
      </mesh>
      {/* Frame border - top/bottom */}
      {[3.95, 1.65].map((y, i) => (
        <mesh key={`bh${i}`} position={[0, y, -0.12]}>
          <boxGeometry args={[3.9, 0.06, 0.03]} />
          <meshStandardMaterial color="#c4722a" />
        </mesh>
      ))}
      {/* Frame border - sides */}
      {[-1.93, 1.93].map((x, i) => (
        <mesh key={`bv${i}`} position={[x, 2.8, -0.12]}>
          <boxGeometry args={[0.06, 2.36, 0.03]} />
          <meshStandardMaterial color="#c4722a" />
        </mesh>
      ))}
      {/* Title bar - LED style */}
      <mesh position={[0, 3.5, -0.16]}>
        <boxGeometry args={[2.8, 0.35, 0.02]} />
        <meshStandardMaterial color="#f0a040" />
      </mesh>
      {/* LED pixel dots for label */}
      {title.split("").map((_, i) => (
        <mesh key={i} position={[-0.8 + i * 0.22, 2.7, -0.16]}>
          <boxGeometry args={[0.14, 0.14, 0.02]} />
          <meshStandardMaterial color="#f0a040" />
        </mesh>
      ))}
      {/* Support structure - metal poles */}
      {[-1.6, 1.6].map((x, i) => (
        <mesh key={`post${i}`} position={[x, 0.7, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 2.8, 6]} />
          <meshStandardMaterial color="#3a3028" />
        </mesh>
      ))}
      {/* Base plates */}
      {[-1.6, 1.6].map((x, i) => (
        <mesh key={`base${i}`} position={[x, -0.65, 0]}>
          <cylinderGeometry args={[0.25, 0.25, 0.08, 8]} />
          <meshStandardMaterial color="#2a2018" />
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

/* Ground & Sky */
function GroundGrid() {
  const path = useMemo(() => createTrackPath(), []);

  // Gravel runoff ribbon — sits just outside the asphalt, before the grass
  const gravelGeo = useMemo(
    () => buildRibbonGeometry(path, TRACK_HALF_WIDTH + 8, 0, 0.0, 300),
    [path],
  );

  return (
    <group>
      {/* Grass — large flat plane well below road level */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[272, -0.15, -240]}>
        <planeGeometry args={[3000, 3000, 1, 1]} />
        <meshStandardMaterial color="#0d1a0d" roughness={0.95} metalness={0} />
      </mesh>
      {/* Gravel / runoff strip around the track edges */}
      <mesh geometry={gravelGeo}>
        <meshStandardMaterial color="#1a1810" roughness={0.98} metalness={0} />
      </mesh>
    </group>
  );
}

/* Night sky — dark dome + instanced stars + moon */
const STAR_COUNT = 300;
const STAR_MATRICES = (() => {
  const dummy = new THREE.Object3D();
  const matrices: THREE.Matrix4[] = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI * 0.48;
    const r = 1000;
    dummy.position.set(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi) + 20,
      r * Math.sin(phi) * Math.sin(theta),
    );
    const s = 0.8 + Math.random() * 2.5;
    dummy.scale.setScalar(s);
    dummy.updateMatrix();
    matrices.push(dummy.matrix.clone());
  }
  return matrices;
})();

function NightSky() {
  const starsRef = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    if (!starsRef.current) return;
    STAR_MATRICES.forEach((m, i) => starsRef.current!.setMatrixAt(i, m));
    starsRef.current.instanceMatrix.needsUpdate = true;
  }, []);

  return (
    <group>
      {/* Sky dome */}
      <mesh>
        <sphereGeometry args={[1200, 24, 12]} />
        <meshStandardMaterial color="#05070f" side={THREE.BackSide} roughness={1} metalness={0} />
      </mesh>
      {/* Horizon glow */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1100, 1100, 120, 32, 1, true]} />
        <meshStandardMaterial color="#0d1a3a" side={THREE.BackSide} transparent opacity={0.5} roughness={1} />
      </mesh>
      {/* Moon */}
      <mesh position={[-300, 500, -800]}>
        <sphereGeometry args={[22, 16, 12]} />
        <meshStandardMaterial color="#e8e0cc" emissive="#c0b890" emissiveIntensity={0.6} roughness={1} />
      </mesh>
      <mesh position={[-300, 500, -800]}>
        <sphereGeometry args={[38, 10, 8]} />
        <meshStandardMaterial color="#c8d8ff" transparent opacity={0.12} emissive="#a0b8f0" emissiveIntensity={0.4} roughness={1} />
      </mesh>
      {/* Stars — single instanced mesh, 1 draw call */}
      <instancedMesh ref={starsRef} args={[undefined, undefined, STAR_COUNT]}>
        <sphereGeometry args={[1, 3, 3]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1} roughness={1} />
      </instancedMesh>
    </group>
  );
}

/* Floodlight poles along the track — visual poles every 1/16, lights only every 1/8 */
function TrackLights() {
  const path = useMemo(() => createTrackPath(), []);

  // 24 visual poles per side (48 total), 16 actual point lights for even coverage
  const { poles, lights } = useMemo(() => {
    const POLE_COUNT = 24;
    const LIGHT_COUNT = 16;
    const poleArr: { pos: [number, number, number]; side: number }[] = [];
    const lightArr: { pos: [number, number, number] }[] = [];

    for (let i = 0; i < POLE_COUNT; i++) {
      const t = i / POLE_COUNT;
      const p = path.getPointAt(t);
      const left = getTrackLeft(path, t);
      const offset = TRACK_HALF_WIDTH + 3;
      for (const side of [1, -1]) {
        poleArr.push({
          pos: [p.x + left.x * offset * side, 0.12, p.z + left.z * offset * side],
          side,
        });
      }
    }
    // 16 lights spaced evenly — ~87 units apart on a ~1400-unit circuit
    for (let i = 0; i < LIGHT_COUNT; i++) {
      const t = i / LIGHT_COUNT;
      const p = path.getPointAt(t);
      lightArr.push({ pos: [p.x, 20, p.z] });
    }
    return { poles: poleArr, lights: lightArr };
  }, [path]);

  return (
    <group>
      {/* Visual poles — no per-pole light */}
      {poles.map((pole, i) => (
        <group key={i}>
          <mesh position={[pole.pos[0], pole.pos[1] + 8, pole.pos[2]]}>
            <cylinderGeometry args={[0.12, 0.18, 16, 6]} />
            <meshStandardMaterial color="#2a2a2a" metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[pole.pos[0] + (pole.side === 1 ? -2.2 : 2.2), pole.pos[1] + 15.05, pole.pos[2]]}>
            <boxGeometry args={[0.8, 0.3, 0.6]} />
            <meshStandardMaterial color="#fff8e0" emissive="#fff0a0" emissiveIntensity={4} roughness={1} />
          </mesh>
        </group>
      ))}
      {/* 16 evenly-spaced lights — ~87 units apart, overlapping coverage */}
      {lights.map((l, i) => (
        <pointLight key={i} position={l.pos} intensity={500} distance={180} color="#fff4d0" />
      ))}
    </group>
  );
}

/* Environment */
function TrackEnvironment() {
  const path = useMemo(() => createTrackPath(), []);
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
                <meshStandardMaterial
                  color={row % 2 === 0 ? "#1e1608" : "#2a1e10"}
                />
              </mesh>
            ))}
            {/* Roof structure */}
            <mesh position={[0, 4.5, 2]}>
              <boxGeometry args={[11, 0.12, 4]} />
              <meshStandardMaterial color="#1a1108" />
            </mesh>
            {/* Roof support pillars */}
            {[-4.5, -1.5, 1.5, 4.5].map((x, i) => (
              <mesh key={`pillar${i}`} position={[x, 2.25, 2.5]}>
                <cylinderGeometry args={[0.08, 0.08, 4.5, 6]} />
                <meshStandardMaterial color="#2e2415" />
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
                  <meshStandardMaterial
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
                  <meshStandardMaterial color="#d4a574" />
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
                <meshStandardMaterial color={isCorner ? "#c4722a" : "#2a1e10"} />
              </mesh>
              {isCorner && (
                <mesh position={[0, 0.5, 0]}>
                  <cylinderGeometry args={[0.15, 0.15, 1.5, 8]} />
                  <meshStandardMaterial color="#1a1108" />
                </mesh>
              )}
            </group>
            {/* Right barrier */}
            <group position={[p.x - left.x * offset, 0, p.z - left.z * offset]}>
              <mesh position={[0, 0.25, 0]}>
                <boxGeometry args={[0.3, 0.5, 1.5]} />
                <meshStandardMaterial color={isCorner ? "#c4722a" : "#2a1e10"} />
              </mesh>
              {isCorner && (
                <mesh position={[0, 0.5, 0]}>
                  <cylinderGeometry args={[0.15, 0.15, 1.5, 8]} />
                  <meshStandardMaterial color="#1a1108" />
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
            <meshStandardMaterial color="#2e2415" />
          </mesh>
          {/* Light housing */}
          <mesh position={[0, 12.2, 0]}>
            <boxGeometry args={[1.2, 0.4, 0.5]} />
            <meshStandardMaterial color="#e8e8e8" metalness={0.9} roughness={0.05} />
          </mesh>
          {/* Light panels */}
          {[-0.35, 0, 0.35].map((x, j) => (
            <mesh key={j} position={[x, 12.1, -0.3]}>
              <boxGeometry args={[0.25, 0.25, 0.05]} />
              <meshStandardMaterial color="#ffe8b0" />
            </mesh>
          ))}
          <pointLight
            position={[0, 12, 0]}
            color="#f0e8d0"
            intensity={120}
            distance={80}
          />
          {/* Base plate */}
          <mesh position={[0, 0.05, 0]}>
            <cylinderGeometry args={[0.5, 0.5, 0.1, 8]} />
            <meshStandardMaterial color="#1a1108" />
          </mesh>
        </group>
      ))}
      {/* Start/Finish gantry */}
      <group position={[15, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        {/* Main pillars - thick steel */}
        {[-21.5, 21.5].map((x, i) => (
          <mesh key={`gp${i}`} position={[x, 5.5, 0]}>
            <boxGeometry args={[0.7, 11, 0.7]} />
            <meshStandardMaterial color="#555" />
          </mesh>
        ))}
        {/* Crossbar - wide overhead beam */}
        <mesh position={[0, 11.2, 0]}>
          <boxGeometry args={[43.7, 0.7, 1.2]} />
          <meshStandardMaterial color="#444" />
        </mesh>
        {/* FIA lights panel - dark background */}
        <mesh position={[0, 10.6, -0.6]}>
          <boxGeometry args={[16, 1.0, 0.14]} />
          <meshStandardMaterial color="#111" metalness={0.3} roughness={0.5} />
        </mesh>
        {/* Start lights - 5 columns of lights */}
        {[-3.2, -1.6, 0, 1.6, 3.2].map((x, i) => (
          <group key={`sl${i}`} position={[x, 10.6, -0.66]}>
            {/* Top light */}
            <mesh position={[0, 0.2, 0]}>
              <sphereGeometry args={[0.12, 12, 8]} />
              <meshStandardMaterial color={i < 2 ? "#22cc22" : "#ff2200"} />
            </mesh>
            {/* Bottom light */}
            <mesh position={[0, -0.2, 0]}>
              <sphereGeometry args={[0.12, 12, 8]} />
              <meshStandardMaterial color={i < 2 ? "#22cc22" : "#ff2200"} />
            </mesh>
          </group>
        ))}
        {/* Sponsor banner */}
        <mesh position={[0, 11.8, -0.3]}>
          <boxGeometry args={[14, 0.7, 0.08]} />
          <meshStandardMaterial color="#f0a040" />
        </mesh>
        {/* Checkered flag strip on road */}
        {Array.from({ length: 40 }).map((_, i) => (
          <mesh
            key={`chk${i}`}
            position={[(i - 19.5) * 1, 0.01, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[0.9, 0.7]} />
            <meshStandardMaterial color={i % 2 === 0 ? "#fff" : "#111"} />
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
              <meshStandardMaterial color="#3a2510" />
            </mesh>
            {/* Canopy - layered cones */}
            <mesh position={[0, 3.8, 0]}>
              <coneGeometry args={[1.4, 2.0, 8]} />
              <meshStandardMaterial color="#1a5a14" />
            </mesh>
            <mesh position={[0, 4.8, 0]}>
              <coneGeometry args={[1.1, 1.6, 8]} />
              <meshStandardMaterial color="#228a1e" />
            </mesh>
            <mesh position={[0, 5.6, 0]}>
              <coneGeometry args={[0.7, 1.2, 8]} />
              <meshStandardMaterial color="#2aaa24" />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/* Particle Sparks */
const SPARK_COUNT = 80;
const SPARK_PARTICLES = Array.from({ length: SPARK_COUNT }, () => ({
  x: (Math.random() - 0.5) * 60 + 15,
  y: Math.random() * 6 + 0.5,
  z: (Math.random() - 0.5) * 80 - 20,
  speed: Math.random() * 0.5 + 0.2,
  phase: Math.random() * Math.PI * 2,
  scale: Math.random() * 0.08 + 0.03,
}));

function Sparks() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const particles = SPARK_PARTICLES;
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
    <instancedMesh ref={ref} args={[undefined, undefined, SPARK_COUNT]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#f0a040" transparent opacity={0.6} />
    </instancedMesh>
  );
}

/* ── Chase Camera — reads CAR_STATE directly, no scroll dependency ── */
function ChaseCamera() {
  const camPos = useRef(new THREE.Vector3(-4, 3.5, 0));
  const camTarget = useRef(new THREE.Vector3(7, 0.8, 0));
  // Pre-allocated — never recreated per frame
  const fwd = useRef(new THREE.Vector3());
  const tPos = useRef(new THREE.Vector3());
  const tLook = useRef(new THREE.Vector3());

  useFrame(({ camera }) => {
    fwd.current.set(Math.sin(CAR_STATE.yaw), 0, Math.cos(CAR_STATE.yaw));
    tPos.current.set(
      CAR_STATE.position.x - fwd.current.x * 8,
      CAR_STATE.position.y + 3.5,
      CAR_STATE.position.z - fwd.current.z * 8,
    );
    tLook.current.set(
      CAR_STATE.position.x + fwd.current.x * 3,
      CAR_STATE.position.y + 0.8,
      CAR_STATE.position.z + fwd.current.z * 3,
    );
    camPos.current.lerp(tPos.current, 0.1);
    camTarget.current.lerp(tLook.current, 0.1);
    camera.position.copy(camPos.current);
    camera.lookAt(camTarget.current);
  });

  return null;
}

const CameraController = ChaseCamera;

/* ── Player Car — keyboard-driven with steering physics ── */
function PlayerCar({ path }: { path: THREE.CatmullRomCurve3 }) {
  const carRef = useRef<THREE.Group>(null);
  const wheelRef = useRef<THREE.Group>(null);
  const keys = useRef(new Set<string>());

  const setSpeed = useScrollStore((s) => s.setSpeed);
  const setNitro = useScrollStore((s) => s.setNitro);
  const setActiveSection = useScrollStore((s) => s.setActiveSection);
  const setProgress = useScrollStore((s) => s.setProgress);
  const setLap = useScrollStore((s) => s.setLap);
  const prevSection = useRef("hero");
  const prevT = useRef(0);
  const lapRef = useRef(1);

  const billboards = useMemo(() => {
    const stops = [
      { t: 0.05, id: "hero" },
      { t: 0.18, id: "about" },
      { t: 0.35, id: "projects" },
      { t: 0.52, id: "skills" },
      { t: 0.7, id: "experience" },
      { t: 0.88, id: "contact" },
    ];
    return stops.map((s) => {
      const p = path.getPointAt(Math.min(s.t, 0.999));
      const left = getTrackLeft(path, Math.min(s.t, 0.999));
      return {
        id: s.id,
        pos: new THREE.Vector3(
          p.x + left.x * (TRACK_HALF_WIDTH + 5),
          0,
          p.z + left.z * (TRACK_HALF_WIDTH + 5),
        ),
      };
    });
  }, [path]);

  const trackSamples = useMemo(() => {
    const out: { pos: THREE.Vector3; t: number }[] = [];
    for (let i = 0; i < 300; i++) {
      const t = i / 300;
      out.push({ pos: path.getPointAt(t), t });
    }
    return out;
  }, [path]);

  useEffect(() => {
    const dn = (e: KeyboardEvent) => keys.current.add(e.key);
    const up = (e: KeyboardEvent) => keys.current.delete(e.key);
    window.addEventListener("keydown", dn);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", dn);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const nitro = useRef(1.0); // 0–1, full tank

  useFrame((_, delta) => {
    if (!carRef.current) return;
    const k = keys.current;
    const dt = Math.min(delta, 0.05);

    const ACCEL = 32, BRAKE = 50, MAX_SPD = 80, MAX_REV = 12;
    const BOOST_EXTRA = 60, BOOST_DRAIN = 0.117, NITRO_REGEN = 0.12;
    const DRAG = 0.975, MAX_STEER = 0.32, WHEELBASE = 2.8;

    const thr   = k.has("w") || k.has("W") || k.has("ArrowUp") ? 1 : 0;
    const brk   = k.has("s") || k.has("S") || k.has("ArrowDown") ? 1 : 0;
    const sl    = k.has("a") || k.has("A") || k.has("ArrowLeft") ? 1 : 0;
    const sr    = k.has("d") || k.has("D") || k.has("ArrowRight") ? 1 : 0;
    const boost = (k.has("Shift") || k.has("shift")) && nitro.current > 0 && thr ? 1 : 0;

    // Nitro tank
    if (boost) {
      nitro.current = Math.max(0, nitro.current - BOOST_DRAIN * dt);
    } else {
      nitro.current = Math.min(1, nitro.current + NITRO_REGEN * dt);
    }

    // Steering
    const si = sl - sr;
    if (si !== 0) {
      CAR_STATE.steerAngle += si * 1.4 * dt;
    } else {
      CAR_STATE.steerAngle *= Math.max(0, 1 - 6 * dt);
    }
    CAR_STATE.steerAngle = Math.max(-MAX_STEER, Math.min(MAX_STEER, CAR_STATE.steerAngle));

    // Speed
    const effectiveAccel = ACCEL + (boost ? BOOST_EXTRA : 0);
    const effectiveMax   = MAX_SPD + (boost ? BOOST_EXTRA * 0.8 : 0);
    if (thr) {
      CAR_STATE.speed += effectiveAccel * dt;
    } else if (brk) {
      if (CAR_STATE.speed > 0.5) {
        CAR_STATE.speed -= BRAKE * dt;
      } else {
        CAR_STATE.speed -= ACCEL * 0.4 * dt;
      }
    }
    CAR_STATE.speed *= Math.pow(DRAG, dt * 60);
    CAR_STATE.speed = Math.max(-MAX_REV, Math.min(effectiveMax, CAR_STATE.speed));
    if (Math.abs(CAR_STATE.speed) < 0.05) CAR_STATE.speed = 0;

    // Yaw — bicycle model
    if (Math.abs(CAR_STATE.speed) > 0.1) {
      CAR_STATE.yaw +=
        ((CAR_STATE.speed * Math.sin(CAR_STATE.steerAngle)) / WHEELBASE) * dt;
    }

    // Position
    CAR_STATE.position.x += Math.sin(CAR_STATE.yaw) * CAR_STATE.speed * dt;
    CAR_STATE.position.z += Math.cos(CAR_STATE.yaw) * CAR_STATE.speed * dt;

    // Apply to mesh
    carRef.current.position.copy(CAR_STATE.position);
    carRef.current.rotation.y = CAR_STATE.yaw;

    // Steering wheel visual — amplified quarter-turn
    if (wheelRef.current) {
      wheelRef.current.rotation.z = -CAR_STATE.steerAngle * (Math.PI / MAX_STEER);
    }

    // HUD speed + nitro
    setSpeed(Math.min(Math.abs(Math.round(CAR_STATE.speed * 2.8)), 350));
    setNitro(nitro.current, boost === 1);

    // Section proximity
    let closestId = prevSection.current;
    let closestDist = Infinity;
    for (const b of billboards) {
      const dx = CAR_STATE.position.x - b.pos.x;
      const dz = CAR_STATE.position.z - b.pos.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < closestDist) { closestDist = d; closestId = b.id; }
    }
    if (closestDist < 90 && prevSection.current !== closestId) {
      prevSection.current = closestId;
      setActiveSection(closestId);
      try { getAudioEngine().playSwoosh(); } catch {}
    }

    // Track progress + lap detection
    let bestT = prevT.current;
    let bestD = Infinity;
    for (const s of trackSamples) {
      const dx = CAR_STATE.position.x - s.pos.x;
      const dz = CAR_STATE.position.z - s.pos.z;
      const d = dx * dx + dz * dz;
      if (d < bestD) { bestD = d; bestT = s.t; }
    }
    if (prevT.current > 0.9 && bestT < 0.1) {
      lapRef.current += 1;
      setLap(lapRef.current);
    } else if (prevT.current < 0.1 && bestT > 0.9) {
      lapRef.current = Math.max(1, lapRef.current - 1);
      setLap(lapRef.current);
    }
    prevT.current = bestT;
    setProgress(bestT);
  });

  return (
    <group ref={carRef}>
      <group rotation={[0, Math.PI, 0]}>
        <F1CarBody bodyColor="#ff8000" accentColor="#ffffff" isPlayer={true} />
        {/* Steering wheel inside cockpit (F1CarBody local space, nose at -Z) */}
        <group ref={wheelRef} position={[0, 0.27, -0.68]} rotation={[0.4, 0, 0]}>
          <mesh>
            <torusGeometry args={[0.07, 0.009, 8, 20]} />
            <meshStandardMaterial color="#0a0a0a" metalness={0.5} roughness={0.4} />
          </mesh>
          {([0, (Math.PI * 2) / 3, (Math.PI * 4) / 3] as number[]).map((a, i) => (
            <mesh key={i} rotation={[0, 0, a]}>
              <boxGeometry args={[0.006, 0.062, 0.006]} />
              <meshStandardMaterial color="#1a1a1a" metalness={0.4} roughness={0.5} />
            </mesh>
          ))}
          <mesh>
            <cylinderGeometry args={[0.02, 0.02, 0.015, 12]} />
            <meshStandardMaterial color="#ff8000" metalness={0.3} roughness={0.3} />
          </mesh>
        </group>
      </group>
      {/* Rear red light */}
      <pointLight position={[0, 0.2, -1.4]} color="#ff2200" intensity={3} distance={8} />
      {/* Front headlights — white, illuminate track ahead */}
      <pointLight position={[-0.35, 0.15, 2.6]} color="#ffffff" intensity={12} distance={30} />
      <pointLight position={[ 0.35, 0.15, 2.6]} color="#ffffff" intensity={12} distance={30} />
    </group>
  );
}

/* Main export */
export { createTrackPath };

export default function RacingWorld() {
  const path = useMemo(() => createTrackPath(), []);
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
      camera={{ position: [0, 4, 12], fov: 65, near: 0.05, far: 2000 }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 0.9,
      }}
      style={{ position: "absolute", inset: 0, zIndex: 1 }}
    >
      <color attach="background" args={["#05070f"]} />
      <fog attach="fog" args={["#05070f", 200, 900]} />
      <hemisphereLight args={["#0a1020", "#000000", 0.4]} />
      <ambientLight intensity={0.25} color="#1a2040" />
      {/* Moon — cold blue-white directional */}
      <directionalLight position={[-80, 120, -60]} intensity={1.8} color="#b0c8ff" />
      {/* Track floodlights — warm orange glow */}
      <pointLight position={[272, 40, -240]} intensity={80} color="#f0a040" distance={600} />
      <pointLight position={[100, 30, -100]} intensity={40} color="#f0a040" distance={400} />
      <pointLight position={[450, 30, -380]} intensity={40} color="#f0a040" distance={400} />
      <NightSky />
      <GroundGrid />
      <TrackSurface />
      <TrackEdges />
      <CurbBlocks />
      <TrackFencing />
      <PlayerCar path={path} />
      <RivalCar path={path} offset={0.12} color="#3178c6" laneOffset={8}  topSpeed={62} />
      <RivalCar path={path} offset={0.38} color="#dc382d" laneOffset={-8} topSpeed={68} />
      <RivalCar path={path} offset={0.62} color="#22c55e" laneOffset={-4} topSpeed={58} />
      {pitStops.map((stop) => (
        <PitStopBillboard key={stop.sectionId} {...stop} />
      ))}
      <TrackLights />
      <TrackEnvironment />
      <Sparks />
      <CameraController />
    </Canvas>
  );
}
