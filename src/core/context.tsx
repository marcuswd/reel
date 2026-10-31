import { loadFont } from "@remotion/fonts";
import React, { createContext, useContext } from "react";
import { Easing, staticFile, useVideoConfig } from "remotion";
import type { Brand, VideoProps } from "./schema";
import type { Plan, PlannedScene } from "./timeline";

// ── Utilidades de animação ──
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const ease = Easing.bezier(0.16, 1, 0.3, 1);
export const inOut = Easing.bezier(0.65, 0, 0.35, 1);
export const io = Easing.bezier(0.7, 0, 0.2, 1);

/** Caminho em public/ ou URL. */
export const src = (p: string) => (/^(https?:|data:|blob:)/.test(p) ? p : staticFile(p.replace(/^\/?public\//, "").replace(/^\//, "")));

// ── Fontes da marca (carregadas uma vez por arquivo) ──
const loaded = new Set<string>();
export const loadBrandFonts = (brand: Brand) => {
  for (const f of [brand.fonts.heading, brand.fonts.body]) {
    for (const [weight, file] of Object.entries(f.files)) {
      const key = `${f.family}:${weight}:${file}`;
      if (loaded.has(key)) continue;
      loaded.add(key);
      loadFont({ family: f.family, url: src(file), weight }).catch((e) => console.warn("fonte", key, e));
    }
  }
};
export const fontStack = (family: string) => `"${family}", "Inter", system-ui, sans-serif`;

// ── Layout responsivo ──
export type Layout = {
  w: number;
  h: number;
  /** 1 unidade de design = 1 px num quadro de 1080 de lado menor */
  u: number;
  vertical: boolean;
  square: boolean;
  /** margens seguras (px), já descontando a faixa das legendas */
  pad: { x: number; top: number; bottom: number };
  /** altura reservada para legendas (0 sem legendas queimadas) */
  captionBand: number;
};
export const useLayout = (): Layout => {
  const { width: w, height: h } = useVideoConfig();
  const { job, plan } = useVideo();
  const u = Math.min(w, h) / 1080;
  const vertical = h / w > 1.2;
  const square = !vertical && w / h < 1.3;
  const x = (vertical ? 80 : square ? 90 : 130) * u;
  const y = (vertical ? 150 : 90) * u;
  // faixa reservada para legendas queimadas: o conteúdo nunca fica embaixo delas
  const burn = plan.captions.length > 0 && (job.captions.mode === "burn" || job.captions.mode === "both");
  const band = burn ? (vertical ? h * 0.2 : square ? 170 * u : 120 * u) : 0;
  return { w, h, u, vertical, square, captionBand: band, pad: { x, top: y + job.safe.top, bottom: y + job.safe.bottom + band } };
};

// ── Contextos ──
type VideoCtx = VideoProps & { plan: Plan };
const Ctx = createContext<VideoCtx | null>(null);
export const VideoProvider: React.FC<{ value: VideoCtx; children: React.ReactNode }> = ({ value, children }) => (
  <Ctx.Provider value={value}>{children}</Ctx.Provider>
);
export const useVideo = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useVideo fora do VideoProvider");
  return v;
};
export const useBrand = () => useVideo().brand;

const SceneCtx = createContext<PlannedScene | null>(null);
export const SceneProvider = SceneCtx.Provider;
/** Cena atual: frames, frame local do "assentar" (= T) etc. */
export const useScene = () => {
  const s = useContext(SceneCtx);
  if (!s) throw new Error("useScene fora de uma cena");
  return { ...s, landLocal: s.land - s.start };
};

/** Molas por energia da marca. */
export const springFor = (energy: Brand["motion"]["energy"]) =>
  energy === "playful" ? { damping: 10, mass: 0.6, stiffness: 160 } : energy === "calm" ? { damping: 200, mass: 1, stiffness: 80 } : { damping: 18, mass: 0.8, stiffness: 120 };

/** Cor com alfa: hexA("#ff0000", 0.5) */
export const hexA = (hex: string, a: number) => {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
/** Luminância relativa, para escolher texto claro/escuro sobre uma cor. */
export const isLight = (hex: string) => {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45;
};
