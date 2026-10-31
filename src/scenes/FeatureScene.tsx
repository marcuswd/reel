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
  readonly heading: string;
  readonly stat: number;
  readonly statLabel: string;
  readonly accentColor: string;
  readonly style?: React.CSSProperties;
};

const cards = ["React + TypeScript", "Render em MP4", "Dados dinâmicos"];

const FeatureSceneInner: React.FC<Props> = ({
  heading,
  stat,
  statLabel,
  accentColor,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.bg,
        color: theme.text,
        fontFamily,
        padding: 120,
        justifyContent: "center",
        ...style,
      }}
    >
      <div
        style={{
          fontSize: 72,
          fontWeight: 800,
          letterSpacing: -2,
          opacity: interpolate(frame, [0, 0.5 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        {heading}
      </div>

      {/* Contador animado */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 24, marginTop: 24 }}>
        <span style={{ fontSize: 180, fontWeight: 800, color: accentColor, fontVariantNumeric: "tabular-nums" }}>
          {Math.round(
            interpolate(frame, [0.3 * fps, 2 * fps], [0, stat], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.33, 1, 0.68, 1),
            }),
          )}
        </span>
        <span style={{ fontSize: 44, color: theme.muted }}>{statLabel}</span>
      </div>

      {/* Cards em stagger */}
      <div style={{ display: "flex", gap: 32, marginTop: 64 }}>
        {cards.map((label, i) => {
          const start = 0.6 * fps + i * 6;
          return (
            <div
              key={label}
              style={{
                flex: 1,
                padding: "40px 44px",
                borderRadius: 24,
                backgroundColor: theme.surface,
                borderTop: `6px solid ${accentColor}`,
                fontSize: 40,
                fontWeight: 600,
                opacity: interpolate(frame, [start, start + 12], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
                translate: interpolate(frame, [start, start + 0.8 * fps], ["0px 120px", "0px 0px"], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.spring({ damping: 16 }),
                }),
              }}
            >
              {label}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const schema = {
  heading: { type: "text-content", default: "", description: "Título" },
  stat: { type: "number", default: 60, min: 0, integer: true, hiddenFromList: false, description: "Número do contador" },
  statLabel: { type: "text-content", default: "", description: "Legenda do número" },
  accentColor: { type: "color", default: theme.accent, description: "Cor de acento" },
} as const satisfies InteractivitySchema;

export const FeatureScene = Interactive.withSchema({
  Component: FeatureSceneInner,
  componentName: "<FeatureScene>",
  schema,
  wrapInSequence: true,
});
