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
  readonly title: string;
  readonly subtitle: string;
  readonly accentColor: string;
  readonly style?: React.CSSProperties;
};

const OpeningSceneInner: React.FC<Props> = ({
  title,
  subtitle,
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
        justifyContent: "center",
        alignItems: "center",
        ...style,
      }}
    >
      {/* Barra de acento: wipe horizontal */}
      <div
        style={{
          height: 10,
          borderRadius: 5,
          backgroundColor: accentColor,
          marginBottom: 48,
          width: interpolate(frame, [0, 0.8 * fps], [0, 220], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      />

      {/* Título: letras entram em cascata (um template, não editável por letra) */}
      <div style={{ display: "flex", fontSize: 150, fontWeight: 800, letterSpacing: -4 }}>
        {title.split("").map((char, i) => {
          const start = 0.3 * fps + i * 2;
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                whiteSpace: "pre",
                opacity: interpolate(frame, [start, start + 10], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
                translate: interpolate(frame, [start, start + 0.7 * fps], ["0px 80px", "0px 0px"], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.spring({ damping: 14 }),
                }),
              }}
            >
              {char}
            </span>
          );
        })}
      </div>

      <Interactive.Div
        name="Subtitle"
        style={{
          marginTop: 24,
          fontSize: 44,
          fontWeight: 400,
          color: theme.muted,
          opacity: interpolate(frame, [1.2 * fps, 1.8 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          translate: interpolate(frame, [1.2 * fps, 1.8 * fps], ["0px 20px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        {subtitle}
      </Interactive.Div>
    </AbsoluteFill>
  );
};

const schema = {
  title: { type: "text-content", default: "", description: "Título" },
  subtitle: { type: "text-content", default: "", description: "Subtítulo" },
  accentColor: { type: "color", default: theme.accent, description: "Cor de acento" },
} as const satisfies InteractivitySchema;

export const OpeningScene = Interactive.withSchema({
  Component: OpeningSceneInner,
  componentName: "<OpeningScene>",
  schema,
  wrapInSequence: true,
});
