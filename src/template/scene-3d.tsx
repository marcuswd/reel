// Objeto 3D (Three.js via @remotion/three): cartão, celular ou caixa com a imagem do job como textura,
// ou o logo SVG da marca extrudado. Toda rotação sai de useCurrentFrame() (nada de useFrame do R3F).
import { ThreeCanvas } from "@remotion/three";
import React, { useEffect, useMemo, useState } from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useDelayRender, useVideoConfig } from "remotion";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { isLight, src, useBrand, useLayout, useScene } from "../core/context";
import { Heading, SceneBg, useIn, type Of } from "./scenes-extra";
import { Safe } from "./ui";

/** Carrega uma textura (segura o render até carregar). */
const useTexture = (url: string | undefined) => {
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [handle] = useState(() => (url ? delayRender(`textura ${url}`) : null));
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    if (!url || handle === null) return;
    new THREE.TextureLoader().load(
      src(url),
      (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; setTex(t); continueRender(handle); },
      undefined,
      (e) => cancelRender(e instanceof Error ? e : new Error(`textura não carregou: ${url}`)),
    );
  }, [url, handle, continueRender, cancelRender]);
  return tex;
};

/** Ajusta a textura para cobrir uma face de proporção `aspect` (como object-fit: cover). */
const cover = (tex: THREE.Texture, aspect: number) => {
  const img = tex.image as { width: number; height: number };
  const ia = img.width / img.height;
  const t = tex.clone();
  t.needsUpdate = true;
  if (ia > aspect) { t.repeat.set(aspect / ia, 1); t.offset.set((1 - aspect / ia) / 2, 0); }
  else { t.repeat.set(1, ia / aspect); t.offset.set(0, (1 - ia / aspect) / 2); }
  return t;
};

/** Logo SVG da marca como geometria extrudada (null se o logo não for SVG). */
const useLogoShapes = (url: string | undefined) => {
  const isSvg = !!url && /\.svg$/i.test(url);
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [handle] = useState(() => (isSvg ? delayRender(`logo ${url}`) : null));
  const [data, setData] = useState<{ shapes: THREE.Shape[]; colors: string[] } | null>(null);
  useEffect(() => {
    if (!isSvg || handle === null) return;
    fetch(src(url!))
      .then((r) => r.text())
      .then((text) => {
        const parsed = new SVGLoader().parse(text);
        const shapes: THREE.Shape[] = [];
        const colors: string[] = [];
        for (const p of parsed.paths) for (const s of SVGLoader.createShapes(p)) { shapes.push(s); colors.push(`#${p.color.getHexString()}`); }
        setData({ shapes, colors });
        continueRender(handle);
      })
      .catch((e) => cancelRender(e));
  }, [isSvg, url, handle, continueRender, cancelRender]);
  return { isSvg, data };
};

const Logo3D: React.FC<{ shapes: THREE.Shape[]; colors: string[]; fallback: string }> = ({ shapes, colors, fallback }) => {
  const meshes = useMemo(() => {
    const geos = shapes.map((s) => new THREE.ExtrudeGeometry(s, { depth: 18, bevelEnabled: true, bevelThickness: 3, bevelSize: 2, bevelSegments: 3 }));
    const box = new THREE.Box3();
    for (const g of geos) { g.computeBoundingBox(); box.union(g.boundingBox!); }
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    return { geos, scale: 3.2 / Math.max(size.x, size.y), center };
  }, [shapes]);
  return (
    // SVG tem y para baixo: espelha em y
    <group scale={[meshes.scale, -meshes.scale, meshes.scale]}>
      <group position={[-meshes.center.x, -meshes.center.y, -meshes.center.z]}>
        {meshes.geos.map((g, i) => (
          <mesh key={i} geometry={g}>
            <meshStandardMaterial color={colors[i] === "#000000" ? fallback : colors[i]} metalness={0.35} roughness={0.3} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

export const Object3DScene: React.FC<{ scene: Of<"object3d"> }> = ({ scene }) => {
  const { width, height, fps } = useVideoConfig();
  const { u, vertical } = useLayout();
  const brand = useBrand();
  const frame = useCurrentFrame();
  const { frames } = useScene();
  const t0 = useIn();
  const object = scene.object ?? (scene.media ? "card" : "logo");
  const logoFile = isLight(brand.colors.bg) ? (brand.logo.dark ?? brand.logo.light) : (brand.logo.light ?? brand.logo.dark);
  const logo = useLogoShapes(object === "logo" ? logoFile : undefined);
  // logo que não é SVG vira cartão com o logo como imagem
  const texUrl = object === "logo" ? (logo.isSvg ? undefined : logoFile) : scene.media;
  const tex = useTexture(texUrl);
  const hasHead = !!(scene.eyebrow || scene.title || scene.text);

  // entrada com mola + giro contínuo e flutuação, tudo pelo frame
  const enter = spring({ frame: frame - t0, fps, config: { damping: 15, mass: 0.9 } });
  const p = frame / Math.max(1, frames);
  const rotY = interpolate(enter, [0, 1], [-1.4, 0]) + Math.sin(p * Math.PI * 1.4) * 0.35 + (object === "box" ? p * 1.2 : 0);
  const rotX = 0.12 + Math.sin(p * Math.PI * 2) * 0.05;
  const floatY = Math.sin(p * Math.PI * 2) * 0.08;
  const pos: [number, number, number] = [hasHead && !vertical ? 1.55 : 0, (hasHead && vertical ? -0.75 : 0) + floatY, 0];
  // a lente é a mesma em todo formato: em pé (quadro estreito) o objeto encolhe para caber na largura
  const fit = Math.min(1, (width / height) * 1.25);

  const geo = useMemo(() => ({
    phone: new RoundedBoxGeometry(1.7, 3.5, 0.18, 6, 0.22),
    box: new RoundedBoxGeometry(2.2, 2.2, 2.2, 6, 0.16),
  }), []);
  const img = tex?.image as { width: number; height: number } | undefined;
  const aspect = img ? img.width / img.height : 16 / 10;
  const cardW = aspect >= 1 ? 3.4 : 3.4 * aspect;
  const cardGeo = useMemo(() => new RoundedBoxGeometry(cardW + 0.08, cardW / aspect + 0.08, 0.06, 4, 0.06), [cardW, aspect]);
  const phoneTex = useMemo(() => (tex ? cover(tex, 1.54 / 3.3) : null), [tex]);
  const boxTex = useMemo(() => (tex ? cover(tex, 1) : null), [tex]);

  let body: React.ReactNode = null;
  if (object === "logo" && logo.data) body = <Logo3D shapes={logo.data.shapes} colors={logo.data.colors} fallback={brand.colors.primary} />;
  else if (object === "phone") {
    body = (
      <group>
        <mesh geometry={geo.phone}><meshStandardMaterial color="#121316" metalness={0.6} roughness={0.25} /></mesh>
        <mesh position={[0, 0, 0.092]}>
          <planeGeometry args={[1.54, 3.3]} />
          <meshBasicMaterial map={phoneTex} color={tex ? "#ffffff" : brand.colors.surface} toneMapped={false} />
        </mesh>
      </group>
    );
  } else if (object === "box") {
    body = (
      <mesh geometry={geo.box}>
        <meshStandardMaterial map={boxTex} color={tex ? "#ffffff" : brand.colors.primary} metalness={0.15} roughness={0.4} />
      </mesh>
    );
  } else {
    const w = cardW;
    const h = w / aspect;
    body = (
      <group>
        <mesh geometry={cardGeo}><meshStandardMaterial color={brand.colors.surface} metalness={0.2} roughness={0.5} /></mesh>
        <mesh position={[0, 0, 0.032]}>
          <planeGeometry args={[w, h]} />
          <meshBasicMaterial map={tex} toneMapped={false} />
        </mesh>
      </group>
    );
  }

  const [rim1, rim2] = [brand.colors.palette[0] ?? brand.colors.primary, brand.colors.palette[1] ?? brand.colors.accent];
  return (
    <AbsoluteFill>
      <SceneBg scene={scene} />
      <ThreeCanvas width={width} height={height} camera={{ fov: 32, position: [0, 0, 8] }} gl={{ antialias: true, preserveDrawingBuffer: true }}>
        <ambientLight intensity={0.55} />
        <directionalLight position={[4, 5, 6]} intensity={1.6} />
        <pointLight position={[-5, -2, 3]} intensity={30} color={rim1} />
        <pointLight position={[5, -3, -2]} intensity={25} color={rim2} />
        <group position={pos} rotation={[rotX, rotY, 0]} scale={interpolate(enter, [0, 1], [0.6, 1]) * fit}>
          {body}
        </group>
      </ThreeCanvas>
      {hasHead ? (
        <Safe justify={vertical ? "flex-start" : "center"} align="flex-start">
          <div style={{ width: vertical ? "100%" : "44%", marginTop: vertical ? 40 * u : 0 }}>
            <Heading eyebrow={scene.eyebrow} title={scene.title} text={scene.text} start={t0} align={vertical ? "center" : "left"} />
          </div>
        </Safe>
      ) : null}
    </AbsoluteFill>
  );
};
