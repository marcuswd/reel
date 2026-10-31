import React from "react";
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { clamp, fontStack, hexA, inOut, isLight, springFor, src, useBrand, useLayout, useScene } from "../core/context";

/** Entrada com mola (respeita a energia da marca). */
export const usePop = (start: number) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const brand = useBrand();
  return spring({ frame: frame - start, fps, config: springFor(brand.motion.energy) });
};

/** Saída suave nos últimos frames da cena (a transição cuida do resto). */
export const useExit = (dur = 8) => {
  const frame = useCurrentFrame();
  const { frames } = useScene();
  return interpolate(frame, [frames - dur, frames], [1, 0.0], clamp);
};

/** Área útil (respeita margens seguras) com flex. */
export const Safe: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; justify?: React.CSSProperties["justifyContent"]; align?: React.CSSProperties["alignItems"] }> = ({
  children,
  style,
  justify = "center",
  align = "center",
}) => {
  const { pad } = useLayout();
  return (
    <AbsoluteFill style={{ padding: `${pad.top}px ${pad.x}px ${pad.bottom}px`, display: "flex", flexDirection: "column", justifyContent: justify, alignItems: align, ...style }}>
      {children}
    </AbsoluteFill>
  );
};

/** Logo da marca, escolhendo a versão que contrasta com o fundo. */
export const Logo: React.FC<{ height: number; onLight?: boolean; style?: React.CSSProperties }> = ({ height: h0, onLight, style }) => {
  const brand = useBrand();
  const { u } = useLayout();
  const height = brand.logo.maxHeight ? Math.min(h0, brand.logo.maxHeight * u) : h0;
  const light = onLight ?? isLight(brand.colors.bg);
  const file = light ? (brand.logo.dark ?? brand.logo.light) : (brand.logo.light ?? brand.logo.dark);
  if (!file) {
    return (
      <div style={{ fontFamily: fontStack(brand.fonts.heading.family), fontWeight: 900, fontSize: height * 0.6, color: brand.colors.text, ...style }}>{brand.name}</div>
    );
  }
  const plate = brand.logo.plate;
  if (plate === "none") return <Img src={src(file)} style={{ height, objectFit: "contain", ...style }} />;
  return (
    <div
      style={{
        height,
        width: plate === "circle" ? height : undefined,
        padding: plate === "circle" ? height * 0.04 : `${height * 0.12}px ${height * 0.22}px`,
        borderRadius: plate === "circle" ? "50%" : height * 0.18,
        background: brand.logo.plateColor ?? "#ffffff",
        boxShadow: `0 ${height * 0.08}px ${height * 0.25}px rgba(0,0,0,0.3)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
        ...style,
      }}
    >
      <Img src={src(file)} style={{ height: "100%", width: "100%", objectFit: "contain" }} />
    </div>
  );
};

/** Cartão de mídia com cantos da marca e sombra. */
export const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => {
  const brand = useBrand();
  const { u } = useLayout();
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: (brand.shape.style === "square" ? 4 : brand.shape.radius) * u,
        boxShadow: `0 ${30 * u}px ${80 * u}px rgba(0,0,0,0.35)`,
        background: brand.colors.surface,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** Botão/pílula. */
export const Pill: React.FC<{ children: React.ReactNode; bg?: string; color?: string; size: number; style?: React.CSSProperties }> = ({ children, bg, color, size, style }) => {
  const brand = useBrand();
  const b = bg ?? brand.colors.primary;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: size * 0.4,
        padding: `${size * 0.42}px ${size * 0.9}px`,
        borderRadius: brand.shape.style === "square" ? size * 0.15 : 999,
        background: b,
        color: color ?? (isLight(b) ? "#111" : "#fff"),
        fontFamily: fontStack(brand.fonts.heading.family),
        fontWeight: 800,
        fontSize: size,
        boxShadow: `0 ${size * 0.3}px ${size * 0.8}px ${hexA("#000000", 0.25)}`,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** Texto de apoio (corpo). */
export const Body: React.FC<{ children: React.ReactNode; size: number; color?: string; align?: "left" | "center"; style?: React.CSSProperties; start?: number }> = ({
  children,
  size,
  color,
  align = "left",
  style,
  start = 0,
}) => {
  const frame = useCurrentFrame();
  const brand = useBrand();
  return (
    <div
      style={{
        fontFamily: fontStack(brand.fonts.body.family),
        fontWeight: 500,
        fontSize: size,
        lineHeight: 1.4,
        color: color ?? brand.colors.muted,
        textAlign: align,
        opacity: interpolate(frame, [start, start + 14], [0, 1], clamp),
        transform: `translateY(${interpolate(frame, [start, start + 18], [size * 0.6, 0], { ...clamp, easing: inOut })}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
