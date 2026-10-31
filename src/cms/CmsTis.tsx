import { TransitionSeries, linearTiming, springTiming, type TransitionPresentation } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import React from "react";
import { closing, cover, groups, screens, whatIs } from "./content";
import { ClosingScene, CoverScene, FeatureScene, GroupCoverScene, ScreensScene, TechScene, WhatIsScene } from "./scenes";

const FPS = 30;
const T = 18; // duração de cada transição, em frames

// Durações (segundos)
const D = { cover: 5, whatIs: 7.5, screens: 10.5, groupCover: 3, tech: 7, feature: 7.5, closing: 5.5 };

type Item = { name: string; seconds: number; node: React.ReactNode };

// A timeline é gerada a partir do roteiro (content.ts): um template único.
const timeline: Item[] = [
  { name: "Capa", seconds: D.cover, node: <CoverScene {...cover} /> },
  { name: "O que é", seconds: D.whatIs, node: <WhatIsScene {...whatIs} /> },
  { name: "Telas", seconds: D.screens, node: <ScreensScene screens={screens} /> },
  ...groups.flatMap((g): Item[] => [
    { name: `${g.title}: capa`, seconds: D.groupCover, node: <GroupCoverScene number={g.number} title={g.title} tagline={g.tagline} /> },
    ...(g.tech ? [{ name: `${g.title}: tecnologias`, seconds: D.tech, node: <TechScene group={g} items={g.tech} /> }] : []),
    ...(g.features ?? []).map((f, i) => ({
      name: `${g.title}: ${i + 1}`,
      seconds: f.items.length > 5 ? D.feature + 1.5 : D.feature,
      node: <FeatureScene group={g} {...f} />,
    })),
  ]),
  { name: "Fecho", seconds: D.closing, node: <ClosingScene {...closing} /> },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const transitionFor = (next: Item): TransitionPresentation<any> => {
  if (next.name.endsWith(": capa")) return wipe({ direction: "from-left" });
  if (next.name === "Fecho") return fade();
  return slide({ direction: "from-right" });
};

export const CMS_TIS_DURATION =
  timeline.reduce((sum, it) => sum + Math.round(it.seconds * FPS), 0) - (timeline.length - 1) * T;

export const CmsTis: React.FC = () => {
  return (
    <TransitionSeries>
      {timeline.map((it, i) => (
        <React.Fragment key={it.name}>
          {i > 0 ? (
            <TransitionSeries.Transition
              presentation={transitionFor(it)}
              timing={
                it.name.endsWith(": capa")
                  ? linearTiming({ durationInFrames: T })
                  : springTiming({ config: { damping: 200 }, durationInFrames: T })
              }
            />
          ) : null}
          <TransitionSeries.Sequence name={it.name} durationInFrames={Math.round(it.seconds * FPS)} premountFor={FPS}>
            {it.node}
          </TransitionSeries.Sequence>
        </React.Fragment>
      ))}
    </TransitionSeries>
  );
};
