import { noise2D } from "@remotion/noise";
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { clamp, ease, inOut, useScene } from "./context";
import type { Camera as Move } from "./timeline";

type Focus = { x: number; y: number };

/**
 * "Câmera virtual" sobre qualquer conteúdo (foto, vídeo, print, cena inteira).
 * O movimento cobre a cena toda (do início da transição ao corte), então nunca para.
 *
 * in/out: Ken Burns · left/right/up/down: pan · push/pull: aproximação rápida ao foco / revelação
 * orbit: giro 3D lateral · tilt: grua · handheld: câmera na mão · dolly: avanço com perspectiva
 * whip: chicote de entrada com desfoque de movimento
 */
export const Camera: React.FC<{
  move: Move;
  focus?: Focus;
  intensity?: number;
  /** frames do movimento; padrão: a cena inteira */
  frames?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ move, focus = { x: 0.5, y: 0.45 }, intensity = 1, frames, children, style }) => {
  const frame = useCurrentFrame();
  const sc = useScene();
  const dur = frames ?? sc.frames;
  const p = interpolate(frame, [0, dur], [0, 1], clamp);
  const k = intensity;
  let s = 1;
  let x = 0; // % da largura
  let y = 0;
  let rx = 0;
  let ry = 0;
  let rz = 0;
  let blur = 0;

  switch (move) {
    case "static":
    case "auto":
      s = 1 + 0.025 * k * p;
      break;
    case "in":
      s = 1.06 + 0.16 * k * inOut(p);
      break;
    case "out":
      s = 1.24 - 0.17 * k * inOut(p);
      break;
    case "left":
    case "right": {
      const d = move === "left" ? -1 : 1;
      s = 1.16 + 0.04 * k;
      x = d * interpolate(inOut(p), [0, 1], [-5, 5]) * k;
      break;
    }
    case "up":
    case "down": {
      const d = move === "up" ? -1 : 1;
      s = 1.16 + 0.04 * k;
      y = d * interpolate(inOut(p), [0, 1], [-5, 5]) * k;
      break;
    }
    case "push": {
      const q = interpolate(frame, [sc.landLocal * 0.5, sc.landLocal + dur * 0.45], [0, 1], { ...clamp, easing: inOut });
      s = 1.02 + 0.4 * k * q + 0.03 * p;
      break;
    }
    case "pull": {
      const q = interpolate(frame, [0, sc.landLocal + dur * 0.5], [0, 1], { ...clamp, easing: ease });
      s = 1.45 - 0.38 * k * q;
      break;
    }
    case "orbit":
      s = 1.22;
      ry = interpolate(inOut(p), [0, 1], [-7, 7]) * k;
      x = interpolate(inOut(p), [0, 1], [2, -2]) * k;
      break;
    case "tilt":
      s = 1.2;
      rx = interpolate(inOut(p), [0, 1], [9, -5]) * k;
      y = interpolate(inOut(p), [0, 1], [3, -2]) * k;
      break;
    case "dolly": {
      s = 1.04 + 0.26 * k * inOut(p);
      rx = interpolate(p, [0, 1], [4, 0]) * k;
      break;
    }
    case "handheld": {
      s = 1.12;
      const t = frame / 40;
      x = noise2D("hx", t, 0) * 0.9 * k;
      y = noise2D("hy", t, 3) * 0.7 * k;
      rz = noise2D("hr", t, 7) * 0.5 * k;
      break;
    }
    case "whip": {
      const q = interpolate(frame, [0, sc.landLocal + 6], [0, 1], { ...clamp, easing: ease });
      x = (1 - q) * 35 * k;
      blur = (1 - q) * 22;
      s = 1.1 + 0.08 * inOut(p);
      break;
    }
  }

  return (
    <AbsoluteFill style={{ overflow: "hidden", perspective: 1600, ...style }}>
      <AbsoluteFill
        style={{
          transformOrigin: `${focus.x * 100}% ${focus.y * 100}%`,
          transform: `translate(${x}%, ${y}%) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${s})`,
          filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
        }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Paralaxe: camadas se movem em velocidades diferentes (0 = fundo parado, 1 = primeiro plano). */
export const Parallax: React.FC<{ depth: number; dir?: "x" | "y"; amount?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  depth,
  dir = "x",
  amount = 60,
  children,
  style,
}) => {
  const frame = useCurrentFrame();
  const sc = useScene();
  const d = interpolate(frame, [0, sc.frames], [1, -1], clamp) * amount * depth;
  return <div style={{ translate: dir === "x" ? `${d}px 0px` : `0px ${d}px`, ...style }}>{children}</div>;
};
