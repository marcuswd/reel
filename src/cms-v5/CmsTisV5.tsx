import { TransitionSeries, linearTiming, type TransitionPresentation } from "@remotion/transitions";
import React from "react";
import { AbsoluteFill, Html5Audio, Sequence, interpolate, staticFile } from "remotion";
import { ChapterScene, ClosingScene, CoverScene, SplitScene } from "../cms-v4/scenes";
import { bands, dive, iris, lift } from "../cms-v4/transitions";
import { chapters, closing, cover, rush } from "./content";
import { BuilderScene, CardsScene, RushScene, ShotScene } from "./scenes";
import { BEAT, CMS_TIS_V5_DURATION, PLACED, T, type Placed, type Transition } from "./timeline";

export { CMS_TIS_V5_DURATION };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PRESENT: Record<Transition, () => TransitionPresentation<any>> = { dive, lift, bands, iris };
const names = chapters.map((ch) => ch.title);

const scene = (p: Placed): React.ReactNode => {
  if (p.kind === "cover") return <CoverScene {...cover} />;
  if (p.kind === "rush") return <RushScene {...rush} />;
  if (p.kind === "closing") return <ClosingScene {...closing} />;
  const ci = p.chapter ?? 0;
  const ch = chapters[ci];
  if (p.kind === "chapter") return <ChapterScene number={ch.number} title={ch.title} tagline={ch.tagline} photo={ch.photo} index={ci} names={names} />;
  const label = `${ch.number} · ${ch.title}`;
  const b = ch.beat;
  if (b.kind === "shot") return <ShotScene chapter={label} shot={b.shot} title={b.title} text={b.text} />;
  if (b.kind === "split") return <SplitScene chapter={label} title={b.title} items={b.items} photo={b.photo} card={b.card} />;
  if (b.kind === "builder") return <BuilderScene chapter={label} title={b.title} items={b.items} />;
  return <CardsScene chapter={label} title={b.title} cards={b.cards} />;
};

// ── Efeitos sonoros (gerados por scripts/trilha-v5.ts, alinhados aos mesmos tempos) ──
const SFX = { whoosh: "cms/audio/v5-whoosh.wav", impact: "cms/audio/v5-impact.wav", tick: "cms/audio/v5-tick.wav", pop: "cms/audio/v5-pop.wav" };
const WHOOSH_PEAK = 12; // frame do pico dentro do ficheiro do whoosh (0,4 s)

type Hit = { at: number; src: string; volume: number };
const hits: Hit[] = PLACED.flatMap((p, i): Hit[] => {
  const out: Hit[] = [];
  if (i > 0) out.push({ at: p.land - WHOOSH_PEAK, src: SFX.whoosh, volume: p.kind === "chapter" ? 0.5 : 0.32 });
  if (p.kind === "chapter" || p.kind === "closing") out.push({ at: p.land, src: SFX.impact, volume: 0.55 });
  for (const b of p.ticks) out.push({ at: p.land + b * BEAT, src: p.kind === "rush" ? SFX.tick : SFX.pop, volume: p.kind === "rush" ? 0.3 : 0.38 });
  return out;
});

const Soundtrack: React.FC = () => (
  <>
    <Html5Audio
      src={staticFile("cms/audio/v5-trilha.wav")}
      volume={(f) => interpolate(f, [0, 6, CMS_TIS_V5_DURATION - 45, CMS_TIS_V5_DURATION], [0, 0.85, 0.85, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
    />
    {hits.map((h, i) => (
      <Sequence key={i} from={Math.max(0, h.at)} durationInFrames={90} name={`sfx ${h.src.split("-").pop()}`} layout="none">
        <Html5Audio src={staticFile(h.src)} volume={h.volume} />
      </Sequence>
    ))}
  </>
);

export const CmsTisV5: React.FC = () => (
  <AbsoluteFill>
    <TransitionSeries>
      {PLACED.map((p, i) => (
        <React.Fragment key={p.id}>
          {i > 0 && p.enter ? <TransitionSeries.Transition presentation={PRESENT[p.enter]()} timing={linearTiming({ durationInFrames: T })} /> : null}
          <TransitionSeries.Sequence name={p.id} durationInFrames={p.frames} premountFor={30}>
            {scene(p)}
          </TransitionSeries.Sequence>
        </React.Fragment>
      ))}
    </TransitionSeries>
    <Soundtrack />
  </AbsoluteFill>
);
