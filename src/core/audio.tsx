import { Audio } from "@remotion/media";
import React from "react";
import { Sequence, interpolate } from "remotion";
import { clamp, src, useVideo } from "./context";

/**
 * Mix inteiro do vídeo a partir do plano: trilha (fade in/out + ducking nas falas),
 * locução por cena e efeitos sonoros alinhados aos eventos.
 */
export const Soundtrack: React.FC = () => {
  const { plan, job, voice, musicSrc } = useVideo();
  const { fps, total, speech } = plan;
  const hasVoice = speech.length > 0;
  const base = (hasVoice ? 0.35 : 1) * job.music.volume;
  const fadeIn = Math.round(fps * 0.6);
  const fadeOut = Math.round(fps * 1.8);
  const duck = Math.round(fps * 0.25);

  const musicVolume = (f: number) => {
    let v = base * interpolate(f, [0, fadeIn], [0, 1], clamp) * interpolate(f, [total - fadeOut, total], [1, 0], clamp);
    // ducking: abaixa mais durante a fala
    for (const s of speech) {
      const d = interpolate(f, [s.from - duck, s.from, s.to, s.to + duck], [0, 1, 1, 0], clamp);
      if (d > 0) v *= 1 - 0.45 * d;
    }
    return v;
  };

  return (
    <>
      {musicSrc && job.music.mode !== "none" ? <Audio src={src(musicSrc)} volume={musicVolume} name="trilha" /> : null}
      {plan.scenes.map((p) => {
        const v = voice[p.id];
        if (!v) return null;
        return (
          <Sequence key={`v-${p.id}`} from={p.start + p.voiceAt} durationInFrames={Math.ceil(v.seconds * fps) + 6} name={`voz ${p.id}`} layout="none">
            <Audio src={src(v.src)} volume={job.voice.volume} />
          </Sequence>
        );
      })}
      {plan.sfx.map((e, i) => (
        <Sequence key={`s-${i}`} from={Math.max(0, e.frame)} durationInFrames={Math.round(fps * 2.5)} name={`sfx ${e.name}`} layout="none">
          <Audio src={src(`${job.sfx.pack}/${e.name}.mp3`)} volume={e.volume * job.sfx.volume} />
        </Sequence>
      ))}
    </>
  );
};
