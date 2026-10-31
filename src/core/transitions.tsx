import type { TransitionPresentation, TransitionPresentationComponentProps } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { flip } from "@remotion/transitions/flip";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import React from "react";
import { AbsoluteFill, interpolate, random } from "remotion";
import { clamp, hexA, io } from "./context";
import type { Brand } from "./schema";
import type { Transition } from "./timeline";

type P = { colors: string[]; seed: number };
type Comp = React.FC<TransitionPresentationComponentProps<P>>;
const make = (component: Comp, props: P): TransitionPresentation<P> => ({ component, props });

/** Corte seco no meio da transição. */
const Cut: Comp = ({ children, presentationDirection, presentationProgress }) => {
  const show = presentationDirection === "exiting" ? presentationProgress < 0.5 : presentationProgress >= 0.5;
  return <AbsoluteFill style={{ opacity: show ? 1 : 0 }}>{children}</AbsoluteFill>;
};

/** Cartão que sobe por cima; a cena anterior recua e escurece. */
const Lift: Comp = ({ children, presentationDirection, presentationProgress }) => {
  const p = io(presentationProgress);
  if (presentationDirection === "exiting")
    return <AbsoluteFill style={{ scale: String(interpolate(p, [0, 1], [1, 0.9])), filter: `brightness(${interpolate(p, [0, 1], [1, 0.5])})` }}>{children}</AbsoluteFill>;
  return (
    <AbsoluteFill style={{ translate: `0px ${interpolate(p, [0, 1], [100, 0])}%`, borderRadius: interpolate(p, [0.6, 1], [48, 0], clamp), overflow: "hidden", boxShadow: "0 -40px 120px rgba(0,0,0,0.4)" }}>
      {children}
    </AbsoluteFill>
  );
};

/** Mergulho: a anterior cresce e desfoca; a nova chega de trás, focando. */
const Dive: Comp = ({ children, presentationDirection, presentationProgress }) => {
  const p = io(presentationProgress);
  if (presentationDirection === "exiting")
    return (
      <AbsoluteFill style={{ scale: String(interpolate(p, [0, 1], [1, 1.25])), opacity: interpolate(p, [0.3, 0.8], [1, 0], clamp), filter: `blur(${interpolate(p, [0, 1], [0, 18])}px)` }}>
        {children}
      </AbsoluteFill>
    );
  return (
    <AbsoluteFill style={{ scale: String(interpolate(p, [0, 1], [0.82, 1])), opacity: interpolate(p, [0.15, 0.6], [0, 1], clamp), filter: `blur(${interpolate(p, [0, 1], [14, 0])}px)` }}>
      {children}
    </AbsoluteFill>
  );
};

/** Zoom através: a anterior "voa" para a câmera, a nova vem do fundo. */
const Zoom: Comp = ({ children, presentationDirection, presentationProgress }) => {
  const p = io(presentationProgress);
  if (presentationDirection === "exiting")
    return <AbsoluteFill style={{ scale: String(interpolate(p, [0, 1], [1, 3])), opacity: interpolate(p, [0.4, 0.7], [1, 0], clamp), filter: `blur(${interpolate(p, [0, 1], [0, 10])}px)` }}>{children}</AbsoluteFill>;
  return <AbsoluteFill style={{ scale: String(interpolate(p, [0, 1], [0.4, 1])), opacity: interpolate(p, [0.35, 0.7], [0, 1], clamp) }}>{children}</AbsoluteFill>;
};

/** Chicote: pan horizontal muito rápido com desfoque de movimento. */
const Whip: Comp = ({ children, presentationDirection, presentationProgress }) => {
  const p = io(presentationProgress);
  const blur = Math.sin(Math.PI * presentationProgress) * 28;
  const x = presentationDirection === "exiting" ? interpolate(p, [0, 1], [0, -100]) : interpolate(p, [0, 1], [100, 0]);
  return <AbsoluteFill style={{ translate: `${x}% 0px`, filter: `blur(${blur}px)` }}>{children}</AbsoluteFill>;
};

/** Círculo na cor da marca que revela a próxima cena. */
const Iris: Comp = ({ children, presentationDirection, presentationProgress, passedProps }) => {
  if (presentationDirection === "exiting") return <AbsoluteFill>{children}</AbsoluteFill>;
  const r = interpolate(presentationProgress, [0, 1], [0, 120], { ...clamp, easing: io });
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ backgroundColor: passedProps.colors[0], clipPath: `circle(${Math.min(120, r * 1.15)}% at 50% 55%)` }} />
      <AbsoluteFill style={{ clipPath: `circle(${r}% at 50% 55%)` }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Três faixas nas cores da marca varrem o quadro. */
const Bands: Comp = ({ children, presentationDirection, presentationProgress, passedProps }) => {
  if (presentationDirection === "exiting") return <AbsoluteFill style={{ translate: `${interpolate(presentationProgress, [0, 1], [0, -12])}% 0px` }}>{children}</AbsoluteFill>;
  const reveal = interpolate(presentationProgress, [0.35, 1], [100, 0], { ...clamp, easing: io });
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ clipPath: `inset(0% 0% 0% ${reveal}%)` }}>{children}</AbsoluteFill>
      {passedProps.colors.slice(0, 3).map((col, i) => {
        const d = i * 0.1;
        const x = interpolate(presentationProgress, [d, d + 0.6], [100, -100], { ...clamp, easing: io });
        return <AbsoluteFill key={i} style={{ backgroundColor: col, translate: `${x}% 0px`, opacity: x <= -100 ? 0 : 1 }} />;
      })}
    </AbsoluteFill>
  );
};

/** Bolha de cor que cresce de um canto e se abre no canto oposto. */
const Bubble: Comp = ({ children, presentationDirection, presentationProgress, passedProps }) => {
  const flip = passedProps.seed % 2 === 1;
  const p = presentationProgress;
  const col = passedProps.colors[passedProps.seed % passedProps.colors.length];
  if (presentationDirection === "exiting") {
    const r = interpolate(p, [0, 0.5], [0, 160], { ...clamp, easing: io });
    return (
      <AbsoluteFill>
        {children}
        <AbsoluteFill style={{ background: col, clipPath: `circle(${r}% at ${flip ? "100% 100%" : "0% 100%"})`, opacity: p < 0.5 ? 1 : 0 }} />
      </AbsoluteFill>
    );
  }
  const r = interpolate(p, [0.5, 1], [160, 0], { ...clamp, easing: io });
  return (
    <AbsoluteFill style={{ opacity: p >= 0.5 ? 1 : 0 }}>
      {children}
      <AbsoluteFill style={{ background: col, clipPath: `circle(${r}% at ${flip ? "0% 0%" : "100% 0%"})` }} />
      <AbsoluteFill style={{ background: "rgba(0,0,0,0.15)", clipPath: `circle(${Math.max(0, r - 12)}% at ${flip ? "0% 0%" : "100% 0%"})` }} />
    </AbsoluteFill>
  );
};

/** "Light leak" em CSS: clarão quente sobre um crossfade (sem WebGL, renderiza em qualquer máquina). */
const Leak: Comp = ({ children, presentationDirection, presentationProgress, passedProps }) => {
  const p = presentationProgress;
  if (presentationDirection === "exiting") return <AbsoluteFill style={{ opacity: interpolate(p, [0.3, 0.7], [1, 0], clamp) }}>{children}</AbsoluteFill>;
  const flash = Math.sin(Math.PI * p);
  const [a, b] = [passedProps.colors[1] ?? "#ffb36b", passedProps.colors[2] ?? "#ff5f6d"];
  const x = interpolate(p, [0, 1], [-20, 120]);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: interpolate(p, [0.3, 0.7], [0, 1], clamp) }}>{children}</AbsoluteFill>
      <AbsoluteFill
        style={{
          mixBlendMode: "screen",
          opacity: flash * 0.95,
          background: `radial-gradient(ellipse 60% 80% at ${x}% 40%, ${hexA("#fff4e0", 0.95)} 0%, ${hexA(a, 0.7)} 30%, ${hexA(b, 0.35)} 55%, transparent 75%)`,
          filter: "blur(30px)",
        }}
      />
    </AbsoluteFill>
  );
};

/** Glitch: fatias deslocadas + separação RGB por poucos frames. */
const Glitch: Comp = ({ children, presentationDirection, presentationProgress, passedProps }) => {
  const p = presentationProgress;
  const show = presentationDirection === "exiting" ? p < 0.5 : p >= 0.5;
  const k = Math.sin(Math.PI * p);
  const step = Math.floor(p * 12);
  const slices = 7;
  return (
    <AbsoluteFill style={{ opacity: show ? 1 : 0 }}>
      {new Array(slices).fill(0).map((_, i) => {
        const off = (random(`g${passedProps.seed}-${step}-${i}`) - 0.5) * 18 * k;
        return (
          <AbsoluteFill key={i} style={{ clipPath: `inset(${(i / slices) * 100}% 0% ${100 - ((i + 1) / slices) * 100}% 0%)`, translate: `${off}% 0px` }}>
            {children}
          </AbsoluteFill>
        );
      })}
      <AbsoluteFill style={{ mixBlendMode: "screen", opacity: 0.5 * k, translate: `${8 * k}px 0px`, background: hexA(passedProps.colors[0] ?? "#ff0050", 0.35) }} />
    </AbsoluteFill>
  );
};

/** Transição (apresentação) a partir do nome, nas cores da marca. */
export const presentation = (name: Transition, brand: Brand, seed: number): TransitionPresentation<Record<string, unknown>> => {
  const props: P = { colors: [brand.colors.primary, ...brand.colors.palette], seed };
  const any = <T extends Record<string, unknown>>(x: TransitionPresentation<T>) => x as unknown as TransitionPresentation<Record<string, unknown>>;
  switch (name) {
    case "fade": return any(fade());
    case "slide": return any(slide({ direction: seed % 2 ? "from-bottom" : "from-right" }));
    case "push": return any(slide({ direction: seed % 2 ? "from-left" : "from-right" }));
    case "wipe": return any(wipe({ direction: seed % 2 ? "from-top-left" : "from-bottom-right" }));
    case "flip": return any(flip({ direction: "from-right" }));
    case "lift": return any(make(Lift, props));
    case "dive": return any(make(Dive, props));
    case "zoom": return any(make(Zoom, props));
    case "whip": return any(make(Whip, props));
    case "iris": return any(make(Iris, props));
    case "bands": return any(make(Bands, props));
    case "bubble": return any(make(Bubble, props));
    case "leak": return any(make(Leak, props));
    case "glitch": return any(make(Glitch, props));
    case "none":
    case "auto":
    default: return any(make(Cut, props));
  }
};
