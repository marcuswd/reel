import type React from "react";
import { Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { clamp, ease, inOut } from "./theme";

export type Focus = { x: number; y: number; w: number; h: number };
export type Shot = {
  src: string;
  iw: number; // dimensões originais do print
  ih: number;
  focus?: Focus; // em fracções da imagem
  pan?: boolean; // percorre a imagem de cima a baixo (prints compridos)
  panTo?: number; // fracção máxima de pan (default 1)
};

/**
 * "Câmera" sobre um print num browser:
 *  1. entra em perspectiva 3D e assenta de frente
 *  2. faz push-in até `focus` (ou pan vertical)
 */
export const Screen: React.FC<{
  shot: Shot;
  width: number;
  start?: number; // frame da entrada
  zoomAt?: number; // frame em que o push-in começa
  zoomDur?: number;
  maxZoom?: number;
  panFrom?: number;
  panUntil?: number;
  tilt?: "left" | "right";
  ratio?: number; // altura/largura da área visível
  style?: React.CSSProperties;
}> = ({ shot, width: W, ratio = 10 / 16, start = 0, zoomAt = 40, zoomDur = 40, maxZoom = 1.9, panFrom = 30, panUntil = 170, tilt = "right", style }) => {
  const frame = useCurrentFrame();
  const Hv = Math.round(W * ratio);
  const bar = Math.round(W * 0.028);
  const imgH = (W * shot.ih) / shot.iw;
  const overflow = Math.max(0, imgH - Hv);

  // 1. Entrada 3D
  const enter = interpolate(frame, [start, start + 48], [0, 1], { ...clamp, easing: ease });
  const dir = tilt === "right" ? 1 : -1;
  const rotY = (1 - enter) * -22 * dir;
  const rotX = (1 - enter) * 14;
  const lift = (1 - enter) * 160;

  // 2a. Pan
  const pan = shot.pan
    ? interpolate(frame, [panFrom, panUntil], [0, shot.panTo ?? 1], { ...clamp, easing: inOut }) * overflow
    : 0;

  // 2b. Push-in até ao foco
  const z = shot.focus ? interpolate(frame, [zoomAt, zoomAt + zoomDur], [0, 1], { ...clamp, easing: inOut }) : 0;
  let s = 1;
  let tx = 0;
  let ty = 0;
  let fr = { x: 0, y: 0, w: 0, h: 0 };
  if (shot.focus) {
    const f = shot.focus;
    fr = { x: f.x * W, y: bar + f.y * imgH - pan, w: f.w * W, h: f.h * imgH };
    const target = Math.min(maxZoom, (0.92 * W) / fr.w, (0.9 * (Hv + bar)) / fr.h);
    s = 1 + (Math.max(1, target) - 1) * z;
    const cx = fr.x + fr.w / 2 - W / 2;
    const cy = fr.y + fr.h / 2 - (Hv + bar) / 2;
    tx = -cx * s * z;
    ty = -cy * s * z;
  }
  // deriva lenta, para a imagem nunca estar parada
  const drift = interpolate(frame, [start, start + 240], [1, 1.035], clamp);

  return (
    <div
      style={{
        width: W,
        height: Hv + bar,
        opacity: interpolate(frame, [start, start + 10], [0, 1], clamp),
        transform: `perspective(2400px) translateY(${lift}px) rotateX(${rotX}deg) rotateY(${rotY}deg) translate(${tx}px, ${ty}px) scale(${s * drift})`,
        transformOrigin: "50% 50%",
        ...style,
      }}
    >
      <div
        style={{
          width: W,
          height: Hv + bar,
          borderRadius: 8,
          overflow: "hidden",
          backgroundColor: "#fff",
          boxShadow: `0 ${30 + 30 * (1 - enter)}px 80px rgba(19,38,85,0.18), 0 0 0 1px rgba(19,38,85,0.08)`,
          position: "relative",
        }}
      >
        <div style={{ height: bar, backgroundColor: "#eef2f8", display: "flex", alignItems: "center", gap: bar * 0.25, paddingLeft: bar * 0.55 }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((col) => (
            <div key={col} style={{ width: bar * 0.3, height: bar * 0.3, borderRadius: 99, backgroundColor: col }} />
          ))}
          <div style={{ marginLeft: bar * 0.6, height: bar * 0.48, width: "38%", borderRadius: 99, backgroundColor: "#fff" }} />
        </div>
        <div style={{ position: "absolute", top: bar, left: 0, width: W, height: Hv, overflow: "hidden" }}>
          <Img src={staticFile(shot.src)} style={{ width: W, position: "absolute", top: -pan, left: 0 }} />
        </div>

      </div>
    </div>
  );
};
