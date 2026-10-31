import { TransitionSeries, linearTiming, springTiming, type TransitionPresentation } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import React from "react";
import { chapters, closing, cover, people, pessoas, platform, security, whatIs } from "./content";
import { ChapterScene, ClosingScene, CoverScene, PeopleScene, PlatformScene, SecurityScene, ShotScene, SplitScene, WhatIsScene } from "./scenes";

const FPS = 30;
const T = 20; // frames de cada transição

// Durações em segundos
const D = { cover: 6.5, whatIs: 9, people: 8.5, chapter: 4, shot: 8.5, split: 9, security: 9, platform: 8, closing: 6.5 };

type Kind = "cover" | "chapter" | "beat" | "end";
type Item = { name: string; kind: Kind; seconds: number; node: React.ReactNode };

const names = chapters.map((ch) => ch.title);

// Timeline gerada a partir do roteiro (content.ts)
const timeline: Item[] = [
  { name: "Capa", kind: "cover", seconds: D.cover, node: <CoverScene {...cover} /> },
  { name: "O que é", kind: "beat", seconds: D.whatIs, node: <WhatIsScene {...whatIs} /> },
  ...(pessoas.length
    ? [{ name: "Pessoas", kind: "beat" as Kind, seconds: D.people, node: <PeopleScene {...people} photos={pessoas} /> }]
    : []),
  ...chapters.flatMap((ch, ci): Item[] => [
    {
      name: `${ch.number} ${ch.title}`,
      kind: "chapter",
      seconds: D.chapter,
      node: <ChapterScene number={ch.number} title={ch.title} tagline={ch.tagline} index={ci} total={chapters.length} names={names} />,
    },
    ...ch.beats.map((b, bi): Item => ({
      name: `${ch.number}.${bi + 1} ${b.title}`,
      kind: "beat",
      seconds: b.kind === "shot" ? D.shot : D.split,
      node:
        b.kind === "shot" ? (
          <ShotScene chapter={`${ch.number} · ${ch.title}`} shot={b.shot} title={b.title} text={b.text} />
        ) : (
          <SplitScene chapter={`${ch.number} · ${ch.title}`} shot={b.shot} card={b.card} title={b.title} items={b.items} />
        ),
    })),
  ]),
  { name: "Segurança", kind: "chapter", seconds: D.security, node: <SecurityScene {...security} /> },
  { name: "Plataforma", kind: "beat", seconds: D.platform, node: <PlatformScene {...platform} /> },
  { name: "Fecho", kind: "end", seconds: D.closing, node: <ClosingScene {...closing} /> },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const transitionFor = (next: Item, i: number): TransitionPresentation<any> => {
  if (next.kind === "chapter" || next.kind === "end") return fade();
  return slide({ direction: i % 2 ? "from-right" : "from-bottom" });
};

export const CMS_TIS_V2_DURATION =
  timeline.reduce((sum, it) => sum + Math.round(it.seconds * FPS), 0) - (timeline.length - 1) * T;

export const CmsTisV2: React.FC = () => (
  <TransitionSeries>
    {timeline.map((it, i) => (
      <React.Fragment key={it.name}>
        {i > 0 ? (
          <TransitionSeries.Transition
            presentation={transitionFor(it, i)}
            timing={it.kind === "beat" ? springTiming({ config: { damping: 200 }, durationInFrames: T }) : linearTiming({ durationInFrames: T })}
          />
        ) : null}
        <TransitionSeries.Sequence name={it.name} durationInFrames={Math.round(it.seconds * FPS)} premountFor={FPS}>
          {it.node}
        </TransitionSeries.Sequence>
      </React.Fragment>
    ))}
  </TransitionSeries>
);

// Início de cada cena (frames), útil para conferir frames
export const V2_STARTS = timeline.map((it, i) => ({
  name: it.name,
  start: timeline.slice(0, i).reduce((s, x) => s + Math.round(x.seconds * FPS) - T, 0),
}));
