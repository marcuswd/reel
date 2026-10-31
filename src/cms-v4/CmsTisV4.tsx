import { TransitionSeries, linearTiming, type TransitionPresentation } from "@remotion/transitions";
import React from "react";
import { chapters, closing, cover, people, platform, security, whatIs } from "./content";
import { ChapterScene, ClosingScene, CoverScene, PeopleScene, PlatformScene, SecurityScene, ShotScene, SplitScene, WhatIsScene } from "./scenes";
import { countWords, readingSeconds } from "./theme";
import { bands, dive, iris, lift } from "./transitions";

const FPS = 30;
const T = 24; // frames de cada transição

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Item = { name: string; seconds: number; node: React.ReactNode; enter: () => TransitionPresentation<any> };
const names = chapters.map((ch) => ch.title);

// Cada duração = entrada + palavras ÷ 3 por segundo + respiro (theme.ts), com um mínimo por tipo de cena.
const timeline: Item[] = [
  { name: "Capa", enter: dive, seconds: readingSeconds(countWords(cover.title, cover.support), 7, 3), node: <CoverScene {...cover} /> },
  {
    name: "O que é",
    enter: lift,
    seconds: readingSeconds(countWords(whatIs.headline, ...whatIs.pillars.flatMap((p) => [p.name, p.text])), 9),
    node: <WhatIsScene {...whatIs} />,
  },
  { name: "Pessoas", enter: dive, seconds: readingSeconds(countWords(people.title, people.line), 7.5), node: <PeopleScene {...people} /> },
  ...chapters.flatMap((ch, ci): Item[] => [
    {
      name: `${ch.number} ${ch.title}`,
      enter: bands,
      seconds: readingSeconds(countWords(ch.title, ch.tagline), 5.5, 2.5),
      node: <ChapterScene number={ch.number} title={ch.title} tagline={ch.tagline} photo={ch.photo} index={ci} names={names} />,
    },
    ...ch.beats.map((b, bi): Item => {
      const label = `${ch.number} · ${ch.title}`;
      return b.kind === "shot"
        ? {
            name: `${ch.number}.${bi + 1} ${b.title}`,
            enter: bi === 0 ? lift : dive,
            seconds: readingSeconds(countWords(b.title, b.text), 9),
            node: <ShotScene chapter={label} shot={b.shot} title={b.title} text={b.text} />,
          }
        : {
            name: `${ch.number}.${bi + 1} ${b.title}`,
            enter: bi === 0 ? lift : dive,
            seconds: readingSeconds(countWords(b.title, ...b.items), 9, 2.6),
            node: <SplitScene chapter={label} title={b.title} items={b.items} shot={b.shot} photo={b.photo} card={b.card} />,
          };
    }),
  ]),
  {
    name: "Segurança",
    enter: iris,
    seconds: readingSeconds(countWords(security.title, security.note, ...security.stats.map((s) => `${s.n} ${s.label}`)), 10, 2.8),
    node: <SecurityScene {...security} />,
  },
  { name: "Plataforma", enter: lift, seconds: readingSeconds(countWords(platform.title, platform.line) + platform.tech.length / 2, 8), node: <PlatformScene {...platform} /> },
  { name: "Fecho", enter: dive, seconds: readingSeconds(countWords(closing.title, closing.line, closing.cta), 7, 3), node: <ClosingScene {...closing} /> },
];

const frames = (s: number) => Math.round(s * FPS);
export const CMS_TIS_V4_DURATION = timeline.reduce((sum, it) => sum + frames(it.seconds), 0) - (timeline.length - 1) * T;

export const CmsTisV4: React.FC = () => (
  <TransitionSeries>
    {timeline.map((it, i) => (
      <React.Fragment key={it.name}>
        {i > 0 ? <TransitionSeries.Transition presentation={it.enter()} timing={linearTiming({ durationInFrames: T })} /> : null}
        <TransitionSeries.Sequence name={it.name} durationInFrames={frames(it.seconds)} premountFor={FPS}>
          {it.node}
        </TransitionSeries.Sequence>
      </React.Fragment>
    ))}
  </TransitionSeries>
);

/** Início e duração de cada cena (para conferência). */
export const V4_TIMELINE = timeline.map((it, i) => ({
  name: it.name,
  start: timeline.slice(0, i).reduce((s, x) => s + frames(x.seconds) - T, 0),
  frames: frames(it.seconds),
}));
