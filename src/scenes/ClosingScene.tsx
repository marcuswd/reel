import type React from "react";
import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  type InteractivitySchema,
} from "remotion";
import { fontFamily, theme } from "../fonts";

type Props = {
  readonly cta: string;
  readonly url: string;
  readonly accentColor: string;
  readonly style?: React.CSSProperties;
};

const ClosingSceneInner: React.FC<Props> = ({ cta, url, accentColor, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg, fontFamily, ...style }}>
      {/* Reveal circular, tipo máscara animada no AE */}
      <AbsoluteFill
        style={{
          backgroundColor: accentColor,
          clipPath: `circle(${interpolate(frame, [0, 0.9 * fps], [0, 120], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.65, 0, 0.35, 1),
          })}% at 50% 50%)`,
        }}
      />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", color: "#fff" }}>
        <div
          style={{
            fontSize: 120,
            fontWeight: 800,
            letterSpacing: -3,
            scale: interpolate(frame, [0.5 * fps, 1.3 * fps], [0.6, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.spring({ damping: 12 }),
              output: "perceptual-scale",
            }),
            opacity: interpolate(frame, [0.5 * fps, 0.8 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          {cta}
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 44,
            fontWeight: 600,
            padding: "14px 36px",
            borderRadius: 999,
            backgroundColor: "rgba(0,0,0,0.25)",
            opacity: interpolate(frame, [1.2 * fps, 1.6 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          {url}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const schema = {
  cta: { type: "text-content", default: "", description: "Chamada" },
  url: { type: "text-content", default: "", description: "URL" },
  accentColor: { type: "color", default: theme.accent, description: "Cor de acento" },
} as const satisfies InteractivitySchema;

export const ClosingScene = Interactive.withSchema({
  Component: ClosingSceneInner,
  componentName: "<ClosingScene>",
  schema,
  wrapInSequence: true,
});
