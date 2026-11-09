// Cena `dark3d` (canal dark): fundo 3D escuro sem IA de imagem. Tudo sai de useCurrentFrame()
// (nada de useFrame, Math.random ou relógio); posições por PRNG com semente; sem estado entre quadros.
// Brilho falso por sprites aditivos (sem pós-processamento); texto sempre 2D por cima.
import { ThreeCanvas } from "@remotion/three";
import React, { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { clamp, useLayout } from "../core/context";
import { DARK_DEFAULTS as D, clampCount, flicker, particlePositions, ribBars, travel } from "../core/dark3d";
import { Eyebrow, Words, autoSize } from "../core/text";
import { SceneBg, useIn, type Of } from "./scenes-extra";
import { Safe } from "./ui";

/** Textura de brilho radial (círculo suave), para sprites aditivos. */
const glowTexture = () => {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.25, "rgba(255,255,255,0.45)");
  grad.addColorStop(0.6, "rgba(255,255,255,0.1)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

/** Sprite de brilho aditivo (a névoa não o afeta). */
const Glow: React.FC<{ tex: THREE.Texture; color: string; position: [number, number, number]; scale: number; opacity: number }> = ({ tex, color, position, scale, opacity }) => (
  <sprite position={position} scale={[scale, scale, 1]}>
    <spriteMaterial map={tex} color={color} transparent opacity={opacity} blending={THREE.AdditiveBlending} depthWrite={false} fog={false} />
  </sprite>
);

/** Nervuras do corredor: 4 barras por nervura numa única InstancedMesh, fixas; o grupo anda e repete no passo. */
const Ribs: React.FC<{ bars: ReturnType<typeof ribBars>; offset: number }> = ({ bars, offset }) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    bars.forEach((b, i) => {
      o.position.set(b.x, b.y, b.z);
      o.scale.set(b.sx, b.sy, b.sz);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [bars]);
  return (
    <group position={[0, 0, offset]}>
      <instancedMesh ref={ref} args={[undefined, undefined, bars.length]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#2a3640" metalness={0.3} roughness={0.55} />
      </instancedMesh>
    </group>
  );
};

/** Pontos de poeira (uma chamada de desenho só), brilho por sprite redondo aditivo. */
const Dust: React.FC<{ positions: Float32Array; size: number; color: string; tex: THREE.Texture; opacity: number }> = ({ positions, size, color, tex, opacity }) => {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, [positions]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <points geometry={geo} frustumCulled={false}>
      <pointsMaterial map={tex} color={color} size={size * 4} sizeAttenuation transparent opacity={opacity} blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  );
};

export const Dark3DScene: React.FC<{ scene: Of<"dark3d"> }> = ({ scene }) => {
  const { width, height, fps } = useVideoConfig();
  const { u, vertical } = useLayout();
  const frame = useCurrentFrame();
  const t0 = useIn();
  const env = scene.env;
  const d = D[env];
  const seed = scene.seed ?? D.seed;
  const light = scene.lightColor ?? D.light;
  const fog = scene.fogDensity ?? d.fog;
  const speed = scene.speed ?? d.speed;
  const fl = flicker(frame, fps, seed);
  const tex = useMemo(() => glowTexture(), []);
  useEffect(() => () => tex.dispose(), [tex]);
  const fadeIn = interpolate(frame, [0, Math.round(fps * 0.5)], [0, 1], clamp);

  const corr = D.corredor;
  const depth = scene.depth ?? corr.depth;
  const ribs = scene.ribs ?? corr.ribs;
  const bars = useMemo(() => (env === "corredor" ? ribBars(seed, ribs, depth, corr.width, corr.height) : []), [env, seed, ribs, depth, corr.width, corr.height]);
  const step = depth / Math.max(1, Math.min(200, Math.round(ribs)));
  const offset = travel(frame, fps, speed) % step;

  const dust = D.poeira;
  const dustCount = env === "poeira" ? clampCount(scene.count, dust.count) : env === "vazio" ? clampCount(scene.count, D.vazio.count) : clampCount(scene.count, 600);
  const dustSize = scene.size ?? (env === "vazio" ? D.vazio.size : dust.size);
  const drift = scene.drift ?? (env === "vazio" ? D.vazio.drift : dust.drift);
  const spread = env === "corredor" ? ([corr.width * 1.7, corr.height * 1.7, depth * 0.5] as const) : dust.spread;
  const pos = useMemo(() => particlePositions(seed + 101, dustCount, spread), [seed, dustCount, spread[0], spread[1], spread[2]]);
  // poeira desenha 2 camadas: o teto (dustCount <= 19000) é repartido entre elas, nunca somado
  const layer1 = env === "poeira" ? Math.ceil(dustCount / 2) : dustCount;
  const pos1 = useMemo(() => (env === "poeira" ? pos.slice(0, layer1 * 3) : pos), [env, pos, layer1]);
  const pos2 = useMemo(() => (env === "poeira" ? pos.slice(layer1 * 3).map((v, i) => (i % 3 === 2 ? v - 6 : v)) : pos), [env, pos, layer1]);
  const t = frame / fps;

  let world: React.ReactNode;
  if (env === "corredor") {
    world = (
      <>
        <Ribs bars={bars} offset={offset} />
        <Glow tex={tex} color={light} position={[0, 0, -depth * 0.55]} scale={14 + 2 * fl} opacity={0.9 * fadeIn} />
        <Glow tex={tex} color={light} position={[0, 0, -depth * 0.2]} scale={5} opacity={0.18 * fl * fadeIn} />
        <group position={[0, 0, t * speed * 1.5]}>
          <Dust positions={pos} size={dustSize * 1.5} color="#b8d4dc" tex={tex} opacity={0.55} />
        </group>
      </>
    );
  } else if (env === "poeira") {
    world = (
      <group position={[Math.sin(t * 0.3) * drift * 2, t * drift * 0.6, t * speed * 0.8]} rotation={[0, Math.sin(t * 0.2) * 0.12, t * drift * 0.02]}>
        <Dust positions={pos1} size={dustSize * 1.3} color={light} tex={tex} opacity={(0.8 + 0.15 * Math.sin(t * 1.3)) * fadeIn} />
        <Dust positions={pos2} size={dustSize * 0.6} color="#d6e6ec" tex={tex} opacity={0.35 * fadeIn} />
      </group>
    );
  } else {
    // vazio: névoa de manchas aditivas que respiram + poucas partículas, foco de luz atrás do texto
    const blobs = [0, 1, 2, 3, 4, 5].map((i) => {
      const a = t * 0.18 * (1 + i * 0.15) + i * 1.9 + seed;
      return { p: [Math.sin(a) * 3.2, Math.cos(a * 0.8) * 1.6, -5 - i * 1.4] as [number, number, number], s: 9 + i * 1.2, o: 0.1 + 0.02 * Math.sin(t * 0.7 + i) };
    });
    world = (
      <>
        {blobs.map((b, i) => <Glow key={i} tex={tex} color={light} position={b.p} scale={b.s} opacity={b.o * fadeIn} />)}
        <Glow tex={tex} color={light} position={[0, 0.2, -4]} scale={7 * fl} opacity={0.26 * fadeIn} />
        <group position={[Math.sin(t * 0.25) * drift, t * drift * 0.4, 0]}>
          <Dust positions={pos} size={dustSize} color="#d6e6ec" tex={tex} opacity={0.5 * fadeIn} />
        </group>
      </>
    );
  }

  const hasHead = !!(scene.eyebrow || scene.title || scene.text);
  const big = env === "vazio";
  const bigText = !scene.title && !!scene.text;
  const titleSize = (scene.title ? autoSize(scene.title, vertical ? (big ? 120 : 84) : (big ? 112 : 76), 24) : 0) * u;
  return (
    <AbsoluteFill style={{ backgroundColor: D.bg }}>
      {scene.background ? <SceneBg scene={scene} /> : null}
      <ThreeCanvas width={width} height={height} camera={{ fov: 62, position: [0, 0, 0], near: 0.1, far: 400 }} gl={{ antialias: true, preserveDrawingBuffer: true, alpha: true }}>
        <fogExp2 attach="fog" args={[D.bg, fog]} />
        <ambientLight intensity={0.35} color="#8aa6b4" />
        <pointLight position={[0, 0.3, -3]} intensity={70 * fl} color={light} distance={40} decay={2} />
        <pointLight position={[0, 0, -depth * 0.3]} intensity={60 * fl} color={light} distance={80} decay={2} />
        {world}
      </ThreeCanvas>
      {/* vinheta: escurece as bordas para o texto e o brilho respirarem */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(7,9,13,0) 45%, rgba(7,9,13,0.75) 100%)" }} />
      {hasHead ? (
        <Safe justify="center" align="center">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", width: vertical ? "100%" : big ? "80%" : "62%" }}>
            {scene.eyebrow ? <Eyebrow label={scene.eyebrow} start={t0} color={light} align="center" style={{ marginBottom: 22 * u }} /> : null}
            {scene.title ? <Words text={scene.title} start={t0 + 4} size={titleSize} color={D.text} align="center" style={{ textShadow: "0 2px 24px rgba(0,0,0,0.85)" }} /> : null}
            {bigText ? (
              <Words text={scene.text!} start={t0 + 4} size={autoSize(scene.text!, vertical ? (big ? 110 : 96) : (big ? 104 : 88), 24) * u} color={D.text} align="center" style={{ textShadow: "0 2px 28px rgba(0,0,0,0.9)" }} />
            ) : scene.text ? (
              <Words text={scene.text} start={t0 + 14} size={autoSize(scene.text, vertical ? 52 : 46, 28) * u} color={D.muted} align="center" style={{ marginTop: 22 * u, textShadow: "0 2px 18px rgba(0,0,0,0.85)" }} />
            ) : null}
          </div>
        </Safe>
      ) : null}
    </AbsoluteFill>
  );
};
