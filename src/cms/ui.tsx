import type React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { c, clamp, ease, font } from "./theme";

/** Fundo da marca: navy, grelha de pontos e um brilho azul que deriva devagar. */
export const Backdrop: React.FC<{ tone?: "dark" | "brand"; children?: React.ReactNode }> = ({
  tone = "dark",
  children,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const drift = interpolate(frame, [0, durationInFrames], [0, 1], clamp);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: tone === "brand" ? c.brand : c.ink,
        fontFamily: font,
        color: c.white,
        overflow: "hidden",
      }}
    >
      <AbsoluteFill
        style={{
          background:
            tone === "brand"
              ? `radial-gradient(circle at ${30 + drift * 30}% ${40 - drift * 10}%, ${c.sky} 0%, transparent 55%)`
              : `radial-gradient(circle at ${70 - drift * 25}% ${30 + drift * 20}%, rgba(0,101,237,0.45) 0%, transparent 50%), linear-gradient(160deg, ${c.navy} 0%, ${c.ink} 70%)`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(${tone === "brand" ? "rgba(255,255,255,0.18)" : "rgba(159,179,214,0.14)"} 1.5px, transparent 1.5px)`,
          backgroundSize: "36px 36px",
          backgroundPosition: `${drift * 36}px 0px`,
        }}
      />
      {children}
    </AbsoluteFill>
  );
};

export const Eyebrow: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; color?: string }> = ({
  children,
  style,
  color = c.sky,
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 16,
      fontSize: 26,
      fontWeight: 600,
      letterSpacing: 4,
      textTransform: "uppercase",
      color,
      ...style,
    }}
  >
    <div style={{ width: 40, height: 3, borderRadius: 2, backgroundColor: c.amber }} />
    {children}
  </div>
);

/** Janela de browser com um print dentro. `pan` desloca o print na vertical (0 = topo, 1 = fundo). */
export const BrowserFrame: React.FC<{
  src: string;
  width: number;
  height: number;
  pan?: number;
  style?: React.CSSProperties;
}> = ({ src, width, height, pan = 0, style }) => {
  const bar = Math.round(height * 0.055);
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 18,
        overflow: "hidden",
        backgroundColor: "#fff",
        boxShadow: "0 40px 90px rgba(3,10,30,0.55), 0 0 0 1px rgba(255,255,255,0.08)",
        display: "flex",
        flexDirection: "column",
        ...style,
      }}
    >
      <div
        style={{
          height: bar,
          minHeight: bar,
          backgroundColor: "#eef2f8",
          display: "flex",
          alignItems: "center",
          gap: bar * 0.22,
          paddingLeft: bar * 0.5,
        }}
      >
        {["#ff5f57", "#febc2e", "#28c840"].map((col) => (
          <div key={col} style={{ width: bar * 0.32, height: bar * 0.32, borderRadius: 99, backgroundColor: col }} />
        ))}
        <div
          style={{
            marginLeft: bar * 0.5,
            height: bar * 0.5,
            width: "42%",
            borderRadius: 99,
            backgroundColor: "#fff",
          }}
        />
      </div>
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        <Img
          src={staticFile(src)}
          style={{
            position: "absolute",
            width: "100%",
            top: 0,
            translate: `0px ${-pan * 100}%`,
          }}
        />
      </div>
    </div>
  );
};

/** Linha de destaque que se desenha da esquerda para a direita. */
export const Rule: React.FC<{ start: number; width: number; color?: string }> = ({ start, width, color = c.amber }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        height: 6,
        borderRadius: 3,
        backgroundColor: color,
        width: interpolate(frame, [start, start + 20], [0, width], { ...clamp, easing: ease }),
      }}
    />
  );
};
