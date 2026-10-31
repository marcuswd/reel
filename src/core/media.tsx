import { Video } from "@remotion/media";
import { noise2D } from "@remotion/noise";
import React from "react";
import { AbsoluteFill, Img, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import { Camera } from "./camera";
import { hexA, src, useBrand, useScene } from "./context";
import type { BackgroundInput, MediaInput, MediaObj } from "./schema";
import type { Camera as Move } from "./timeline";

const VIDEO_EXT = /\.(mp4|webm|mov|m4v|mkv)(\?|$)/i;
export const toMedia = (m: MediaInput): MediaObj => (typeof m === "string" ? { src: m } : m);
export const isVideo = (m: MediaObj) => m.kind === "video" || (!m.kind && VIDEO_EXT.test(m.src));

/** Foto ou vídeo preenchendo o pai, com câmera opcional. */
export const Media: React.FC<{ media: MediaInput; camera?: Move; intensity?: number; style?: React.CSSProperties; fit?: "cover" | "contain" }> = ({
  media,
  camera,
  intensity,
  style,
  fit,
}) => {
  const m = toMedia(media);
  const { fps } = useVideoConfig();
  const f = m.focus ?? { x: 0.5, y: 0.45 };
  const objectFit = fit ?? m.fit ?? "cover";
  const pos = `${f.x * 100}% ${f.y * 100}%`;
  const inner = isVideo(m) ? (
    <Video
      src={src(m.src)}
      muted={m.muted !== false}
      volume={m.muted === false ? 1 : 0}
      trimBefore={m.trim ? Math.round(m.trim * fps) : undefined}
      loop={m.muted !== false}
      objectFit={objectFit}
      style={{ width: "100%", height: "100%" }}
    />
  ) : (
    <Img src={src(m.src)} style={{ width: "100%", height: "100%", objectFit, objectPosition: pos }} />
  );
  return (
    <AbsoluteFill style={{ overflow: "hidden", ...style }}>
      {camera && camera !== "static" ? (
        <Camera move={camera} focus={f} intensity={intensity}>
          {inner}
        </Camera>
      ) : (
        inner
      )}
    </AbsoluteFill>
  );
};

// ── Fundos generativos (não dependem de banco de imagens) ──

/** Bolhas de cor desfocadas que se movem devagar (gradiente "mesh"). */
const Mesh: React.FC<{ colors: string[]; seed: string }> = ({ colors, seed }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const R = Math.max(width, height);
  return (
    <AbsoluteFill style={{ background: colors[0], overflow: "hidden" }}>
      {colors.slice(1).concat(colors.slice(1)).slice(0, 4).map((c, i) => {
        const t = frame / 140;
        const x = (0.5 + 0.42 * noise2D(`${seed}x${i}`, t, i)) * width;
        const y = (0.5 + 0.42 * noise2D(`${seed}y${i}`, t, i + 9)) * height;
        const r = R * (0.38 + 0.12 * i);
        return (
          <div
            key={i}
            style={{ position: "absolute", left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: "50%", background: `radial-gradient(circle, ${hexA(c, 0.85)} 0%, ${hexA(c, 0)} 65%)` }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** Aurora: faixas de luz diagonais. */
const Aurora: React.FC<{ colors: string[]; seed: string }> = ({ colors, seed }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, ${colors[0]}, ${colors[1] ?? colors[0]})`, overflow: "hidden" }}>
      {colors.slice(2).concat(colors.slice(1, 2)).map((c, i) => {
        const shift = noise2D(`${seed}a${i}`, frame / 180, i) * 25;
        return (
          <AbsoluteFill
            key={i}
            style={{
              background: `linear-gradient(${110 + i * 25 + shift}deg, transparent 30%, ${hexA(c, 0.55)} 50%, transparent 70%)`,
              filter: "blur(60px)",
              transform: `translateY(${shift * 2}%) scale(1.4)`,
              mixBlendMode: "screen",
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** Partículas (bolhas com brilho) subindo devagar. Determinístico. */
const Particles: React.FC<{ colors: string[]; seed: string; count?: number }> = ({ colors, seed, count = 16 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const u = Math.min(width, height) / 1080;
  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, ${colors[0]} 0%, ${colors[1] ?? colors[0]} 100%)`, overflow: "hidden" }}>
      {new Array(count).fill(0).map((_, i) => {
        const r = (k: string) => random(`${seed}-${i}-${k}`);
        const size = (30 + r("s") * 130) * u;
        const speed = (0.4 + r("v") * 1.2) * u;
        const span = height + size * 2;
        const y = ((r("y") * span - frame * speed) % span + span) % span - size;
        const x = r("x") * width + Math.sin((frame + r("p") * 300) / 35) * 16 * u;
        const c = colors[2 + (i % Math.max(1, colors.length - 2))] ?? colors[1];
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x - size / 2,
              top: y,
              width: size,
              height: size,
              borderRadius: "50%",
              opacity: 0.25 + r("o") * 0.4,
              filter: size < 70 * u ? "blur(3px)" : undefined,
              background: `radial-gradient(circle at 32% 30%, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 20%), radial-gradient(circle, ${c} 0%, ${hexA(c, 0.2)} 100%)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** Grade em perspectiva (tech). */
const Grid: React.FC<{ colors: string[] }> = ({ colors }) => {
  const frame = useCurrentFrame();
  const line = hexA(colors[2] ?? "#ffffff", 0.18);
  const off = (frame * 1.2) % 80;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 30%, ${colors[1] ?? colors[0]} 0%, ${colors[0]} 70%)`, overflow: "hidden" }}>
      <AbsoluteFill style={{ perspective: 900 }}>
        <div
          style={{
            position: "absolute",
            left: "-50%",
            width: "200%",
            top: "45%",
            height: "120%",
            transform: "rotateX(65deg)",
            transformOrigin: "50% 0%",
            backgroundImage: `linear-gradient(${line} 2px, transparent 2px), linear-gradient(90deg, ${line} 2px, transparent 2px)`,
            backgroundSize: "80px 80px",
            backgroundPosition: `0px ${off}px`,
            maskImage: "linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)",
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Formas geométricas grandes flutuando. */
const Shapes: React.FC<{ colors: string[]; seed: string; radius: number }> = ({ colors, seed, radius }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const u = Math.min(width, height) / 1080;
  return (
    <AbsoluteFill style={{ background: colors[0], overflow: "hidden" }}>
      {new Array(6).fill(0).map((_, i) => {
        const r = (k: string) => random(`${seed}-sh-${i}-${k}`);
        const size = (220 + r("s") * 420) * u;
        const x = r("x") * width + noise2D(`${seed}sx${i}`, frame / 160, 0) * 60 * u;
        const y = r("y") * height + noise2D(`${seed}sy${i}`, frame / 160, 4) * 60 * u;
        const c = colors[1 + (i % (colors.length - 1))];
        const kind = i % 3;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x - size / 2,
              top: y - size / 2,
              width: size,
              height: kind === 2 ? size * 0.28 : size,
              borderRadius: kind === 0 ? "50%" : radius * u,
              background: hexA(c, 0.16 + r("o") * 0.14),
              transform: `rotate(${r("r") * 90 + frame * (r("d") - 0.5) * 0.3}deg)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** Fundo da cena: generativo, cor, gradiente ou mídia (com escurecimento). */
export const Background: React.FC<{ bg?: BackgroundInput; index?: number; camera?: Move }> = ({ bg, index = 0, camera }) => {
  const brand = useBrand();
  const { id } = useScene();
  const b = typeof bg === "string" || bg === undefined ? { type: bg ?? "auto" } : bg;
  let type = b.type;
  if (type === "auto") type = (brand.motion.background as typeof type) ?? (brand.motion.energy === "playful" ? "particles" : brand.motion.energy === "calm" ? "gradient" : "mesh");
  // fundos não usam cores próximas do destaque: o texto [destacado] precisa contrastar
  const pal = brand.colors.palette.filter((c) => hueDistance(c, brand.colors.highlight) > 35 || saturation(c) < 0.25);
  const colors = ("colors" in b && b.colors) || [index % 2 ? brand.colors.bg2 : brand.colors.bg, index % 2 ? brand.colors.bg : brand.colors.bg2, ...pal];
  const seed = `${id}`;
  if (type === "media" && "media" in b && b.media) {
    const dim = b.dim ?? 0.45;
    return (
      <AbsoluteFill style={{ background: brand.colors.bg }}>
        <Media media={b.media} camera={("camera" in b && b.camera) || camera || "in"} />
        <AbsoluteFill style={{ background: `linear-gradient(180deg, ${hexA(brand.colors.bg, dim * 0.6)} 0%, ${hexA(brand.colors.bg, dim)} 60%, ${hexA(brand.colors.bg, Math.min(0.95, dim + 0.35))} 100%)` }} />
      </AbsoluteFill>
    );
  }
  switch (type) {
    case "solid":
      return <AbsoluteFill style={{ background: colors[0] }} />;
    case "gradient":
      return <AbsoluteFill style={{ background: `linear-gradient(160deg, ${colors[0]} 0%, ${colors[1]} 100%)` }} />;
    case "particles":
      return <Particles colors={colors} seed={seed} />;
    case "grid":
      return <Grid colors={colors} />;
    case "shapes":
      return <Shapes colors={colors} seed={seed} radius={brand.shape.radius} />;
    case "aurora":
      return <Aurora colors={colors} seed={seed} />;
    case "mesh":
    default:
      return <Mesh colors={colors} seed={seed} />;
  }
};

const rgb = (hex: string) => {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
};
const hue = (hex: string) => {
  const [r, g, b] = rgb(hex);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (!d) return 0;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
};
const saturation = (hex: string) => {
  const [r, g, b] = rgb(hex);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
};
const hueDistance = (a: string, b: string) => {
  const d = Math.abs(hue(a) - hue(b));
  return Math.min(d, 360 - d);
};

/** Granulação de filme (ruído animado) e vinheta, por cima de tudo. */
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.06 }) => {
  const frame = useCurrentFrame();
  const seed = Math.floor(frame / 2) % 8;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity, mixBlendMode: "overlay" }}>
      <svg width="100%" height="100%">
        <filter id={`grain${seed}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={seed} stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#grain${seed})`} />
      </svg>
    </AbsoluteFill>
  );
};
export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.35 }) => (
  <AbsoluteFill style={{ pointerEvents: "none", background: `radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0,0,0,${strength}) 100%)` }} />
);

/** Fade de opacidade simples (entrada). */
export const useFadeIn = (start: number, dur = 12) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [start, start + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
};
