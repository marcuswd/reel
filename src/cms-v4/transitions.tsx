import type { TransitionPresentation, TransitionPresentationComponentProps } from "@remotion/transitions";
import type React from "react";
import { AbsoluteFill, Easing, interpolate } from "remotion";
import { c, clamp } from "./theme";

type NoProps = Record<string, never>;
const io = Easing.bezier(0.7, 0, 0.2, 1);

/**
 * "Lift": a cena que sai recua e escurece; a nova sobe por cima com
 * cantos que se fecham, como um cartão a ser empurrado para a frente.
 */
const LiftComp: React.FC<TransitionPresentationComponentProps<NoProps>> = ({ children, presentationDirection, presentationProgress }) => {
  const p = io(presentationProgress);
  if (presentationDirection === "exiting") {
    return (
      <AbsoluteFill style={{ scale: String(interpolate(p, [0, 1], [1, 0.9])), filter: `brightness(${interpolate(p, [0, 1], [1, 0.55])})` }}>
        {children}
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill
      style={{
        translate: `0px ${interpolate(p, [0, 1], [100, 0])}%`,
        borderRadius: interpolate(p, [0.6, 1], [48, 0], clamp),
        overflow: "hidden",
        boxShadow: "0 -40px 120px rgba(2,12,58,0.45)",
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
export const lift = (): TransitionPresentation<NoProps> => ({ component: LiftComp, props: {} });

/**
 * "Faixas": três faixas nas cores da TIS (ciano, azul, navy) varrem o ecrã
 * e revelam a cena seguinte. Usada antes das capas de capítulo.
 */
const BandsComp: React.FC<TransitionPresentationComponentProps<NoProps>> = ({ children, presentationDirection, presentationProgress }) => {
  const colors = [c.cyan, c.blue, c.navy];
  if (presentationDirection === "exiting") {
    return <AbsoluteFill style={{ translate: `${interpolate(presentationProgress, [0, 1], [0, -12])}% 0px` }}>{children}</AbsoluteFill>;
  }
  // A cena nova aparece por trás da última faixa
  const reveal = interpolate(presentationProgress, [0.35, 1], [100, 0], { ...clamp, easing: io });
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ clipPath: `inset(0% 0% 0% ${reveal}%)` }}>{children}</AbsoluteFill>
      {colors.map((col, i) => {
        const d = i * 0.1;
        const x = interpolate(presentationProgress, [d, d + 0.6], [100, -100], { ...clamp, easing: io });
        return <AbsoluteFill key={col} style={{ backgroundColor: col, translate: `${x}% 0px`, opacity: x <= -100 ? 0 : 1 }} />;
      })}
    </AbsoluteFill>
  );
};
export const bands = (): TransitionPresentation<NoProps> => ({ component: BandsComp, props: {} });

/** "Mergulho": a cena que sai cresce e desfoca; a nova chega de trás, a focar. */
const DiveComp: React.FC<TransitionPresentationComponentProps<NoProps>> = ({ children, presentationDirection, presentationProgress }) => {
  const p = io(presentationProgress);
  if (presentationDirection === "exiting") {
    return (
      <AbsoluteFill style={{ scale: String(interpolate(p, [0, 1], [1, 1.25])), opacity: interpolate(p, [0.3, 0.8], [1, 0], clamp), filter: `blur(${interpolate(p, [0, 1], [0, 18])}px)` }}>
        {children}
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ scale: String(interpolate(p, [0, 1], [0.82, 1])), opacity: interpolate(p, [0.15, 0.6], [0, 1], clamp), filter: `blur(${interpolate(p, [0, 1], [14, 0])}px)` }}>
      {children}
    </AbsoluteFill>
  );
};
export const dive = (): TransitionPresentation<NoProps> => ({ component: DiveComp, props: {} });

/** "Círculo": revela a cena seguinte num círculo azul que cresce a partir do centro. */
const IrisComp: React.FC<TransitionPresentationComponentProps<NoProps>> = ({ children, presentationDirection, presentationProgress }) => {
  if (presentationDirection === "exiting") return <AbsoluteFill>{children}</AbsoluteFill>;
  const r = interpolate(presentationProgress, [0, 1], [0, 120], { ...clamp, easing: io });
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ backgroundColor: c.blue, clipPath: `circle(${Math.min(120, r * 1.15)}% at 50% 55%)` }} />
      <AbsoluteFill style={{ clipPath: `circle(${r}% at 50% 55%)` }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};
export const iris = (): TransitionPresentation<NoProps> => ({ component: IrisComp, props: {} });
