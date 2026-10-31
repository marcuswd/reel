import { TransitionSeries, linearTiming, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { useVideoConfig } from "remotion";
import { ClosingScene } from "./scenes/ClosingScene";
import { FeatureScene } from "./scenes/FeatureScene";
import { OpeningScene } from "./scenes/OpeningScene";

// Duração total = 90 + 120 + 90 - 20 (slide) - 18 (fade) = 262 frames
export const Intro = () => {
  const { fps } = useVideoConfig();

  return (
    <TransitionSeries>
      <TransitionSeries.Sequence name="Opening" durationInFrames={90} premountFor={fps}>
        <OpeningScene
          title="Remotion"
          subtitle="Motion graphics com React"
          accentColor="#ff5a36"
        />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={slide({ direction: "from-right" })}
        timing={springTiming({ config: { damping: 200 }, durationInFrames: 20 })}
      />
      <TransitionSeries.Sequence name="Feature" durationInFrames={120} premountFor={fps}>
        <FeatureScene
          heading="Vídeo como código"
          stat={60}
          statLabel="fps, frame a frame"
          accentColor="#ff5a36"
        />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 18 })}
      />
      <TransitionSeries.Sequence name="Closing" durationInFrames={90} premountFor={fps}>
        <ClosingScene cta="Bora renderizar" url="marcuswd.dev" accentColor="#ff5a36" />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
