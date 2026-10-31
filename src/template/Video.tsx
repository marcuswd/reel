import { TransitionSeries, linearTiming } from "@remotion/transitions";
import React, { useMemo } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, type CalculateMetadataFunction } from "remotion";
import { Soundtrack } from "../core/audio";
import { Captions } from "../core/captions";
import { SceneProvider, VideoProvider, loadBrandFonts, useLayout, useVideo } from "../core/context";
import { Grain, Vignette } from "../core/media";
import { FORMATS, type VideoProps } from "../core/schema";
import { planTimeline } from "../core/timeline";
import { presentation } from "../core/transitions";
import { SceneView } from "./scenes";
import { Logo } from "./ui";

/** Duração e dimensões vêm do roteiro (tempo de leitura, locução, BPM) e do formato. */
export const calculateMetadata: CalculateMetadataFunction<VideoProps> = ({ props }) => {
  const plan = planTimeline(props);
  const [width, height] = FORMATS[props.format];
  return { durationInFrames: plan.total, fps: props.job.fps, width, height };
};

const LogoBug: React.FC = () => {
  const { job } = useVideo();
  const { u, pad } = useLayout();
  const frame = useCurrentFrame();
  const pos = job.overlays.logo;
  if (pos === "none") return null;
  const [v, h] = pos.split("-");
  return (
    <AbsoluteFill style={{ pointerEvents: "none", padding: `${pad.top * 0.6}px ${pad.x * 0.7}px ${pad.bottom * 0.6}px`, display: "flex", justifyContent: v === "top" ? "flex-start" : "flex-end", alignItems: h === "left" ? "flex-start" : "flex-end" }}>
      <Logo height={56 * u} style={{ opacity: interpolate(frame, [20, 40], [0, 0.85], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }} />
    </AbsoluteFill>
  );
};

const Progress: React.FC = () => {
  const { job, brand, plan } = useVideo();
  const { u } = useLayout();
  const frame = useCurrentFrame();
  if (!job.overlays.progress) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", justifyContent: "flex-end" }}>
      <div style={{ height: 6 * u, width: `${(frame / plan.total) * 100}%`, background: brand.colors.highlight }} />
    </AbsoluteFill>
  );
};

/**
 * Composição genérica: recebe as props resolvidas de um job (roteiro + marca + idioma
 * + formato + locução) e monta cenas, transições, overlays, legendas e áudio.
 */
export const Video: React.FC<VideoProps> = (props) => {
  loadBrandFonts(props.brand);
  const plan = useMemo(() => planTimeline(props), [props]);
  const { job, brand } = props;
  return (
    <VideoProvider value={{ ...props, plan }}>
      <AbsoluteFill style={{ background: brand.colors.bg }}>
        <TransitionSeries>
          {plan.scenes.map((p, i) => {
            const items = [];
            if (i > 0) {
              items.push(
                <TransitionSeries.Transition
                  key={`t-${p.id}`}
                  presentation={presentation(p.transition, brand, i)}
                  timing={linearTiming({ durationInFrames: plan.T })}
                />,
              );
            }
            items.push(
              <TransitionSeries.Sequence key={p.id} durationInFrames={p.frames} name={`${i + 1}. ${p.scene.type} ${p.id}`} premountFor={30}>
                <SceneProvider value={p}>
                  <SceneView scene={p.scene} />
                </SceneProvider>
              </TransitionSeries.Sequence>,
            );
            return items;
          })}
        </TransitionSeries>
        {job.overlays.vignette ? <Vignette /> : null}
        {job.overlays.grain ? <Grain /> : null}
        <LogoBug />
        <Progress />
        {plan.burn.length ? <Captions captions={plan.burn} style={job.captions.style} /> : null}
        <Soundtrack />
      </AbsoluteFill>
    </VideoProvider>
  );
};
