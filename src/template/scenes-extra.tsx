// Cenas que fogem do visual de "slide": gráfico animado, tipografia cinética, Lottie, objeto 3D e mapa.
// Todas genéricas, configuradas pelo job; toda animação sai de useCurrentFrame().
import { Lottie, type LottieAnimationData } from "@remotion/lottie";
import React, { useEffect, useState } from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useDelayRender, useVideoConfig } from "remotion";
import { clamp, ease, fontStack, hexA, src, springFor, useBrand, useLayout, useScene, useVideo } from "../core/context";
import { Background } from "../core/media";
import type { Scene } from "../core/schema";
import { Counter, Eyebrow, Words, autoSize, parseMarks } from "../core/text";
import { itemAt } from "../core/timeline";
import { Body, Safe } from "./ui";

export type Of<T extends Scene["type"]> = Extract<Scene, { type: T }>;

export const SceneBg: React.FC<{ scene: Scene }> = ({ scene }) => {
  const { job } = useVideo();
  const { index, camera } = useScene();
  return <Background bg={scene.background ?? job.defaults.background} index={index} camera={camera} />;
};
export const useIn = () => Math.round(useScene().landLocal * 0.6);

/** Eyebrow + título + texto, empilhados (usado ao lado de gráfico, Lottie, 3D e mapa). */
export const Heading: React.FC<{ eyebrow?: string; title?: string; text?: string; start: number; align?: "left" | "center"; size?: number }> = ({ eyebrow, title, text, start, align = "left", size }) => {
  const { u, vertical } = useLayout();
  const brand = useBrand();
  if (!eyebrow && !title && !text) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: align === "center" ? "center" : "flex-start", textAlign: align }}>
      {eyebrow ? <Eyebrow label={eyebrow} start={start} align={align} style={{ marginBottom: 22 * u }} /> : null}
      {title ? <Words text={title} start={start + 4} size={(size ?? autoSize(title, vertical ? 84 : 76, 24)) * u} align={align} /> : null}
      {text ? (
        <Body size={(vertical ? 38 : 34) * u} start={start + 14} align={align} color={brand.colors.muted} style={{ marginTop: 22 * u }}>
          {text}
        </Body>
      ) : null}
    </div>
  );
};

/** Texto de um lado, visual do outro (em pé: texto em cima). */
const Split: React.FC<{ head: React.ReactNode; visual: React.ReactNode; hasHead: boolean }> = ({ head, visual, hasHead }) => {
  const { u, vertical } = useLayout();
  if (!hasHead) return <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>{visual}</AbsoluteFill>;
  return (
    <Safe justify="center" align="stretch">
      <div style={{ display: "flex", flexDirection: vertical ? "column" : "row", alignItems: "center", gap: 70 * u, width: "100%", height: "100%" }}>
        <div style={{ flex: vertical ? "0 0 auto" : "0 0 42%" }}>{head}</div>
        <div style={{ flex: 1, alignSelf: "stretch", position: "relative", minHeight: vertical ? "50%" : undefined }}>{visual}</div>
      </div>
    </Safe>
  );
};

// ── Gráfico ──
export const ChartScene: React.FC<{ scene: Of<"chart"> }> = ({ scene }) => {
  const { u, vertical } = useLayout();
  const { fps } = useVideoConfig();
  const { landLocal } = useScene();
  const { job } = useVideo();
  const brand = useBrand();
  const frame = useCurrentFrame();
  const t0 = useIn();
  const kind = scene.kind ?? "bar";
  const n = scene.items.length;
  const max = Math.max(...scene.items.map((i) => Math.abs(i.value)), 1);
  const colors = [brand.colors.primary, ...brand.colors.palette];
  const top = scene.items.reduce((b, it, i) => (it.value > scene.items[b].value ? i : b), 0);
  const at = (i: number) => landLocal + itemAt(i, n, fps);
  const grow = (i: number) => interpolate(frame, [at(i), at(i) + Math.round(fps * 0.9)], [0, 1], { ...clamp, easing: ease });
  const color = (i: number) => (i === top ? brand.colors.highlight : colors[i % colors.length]);
  const label = { fontFamily: fontStack(brand.fonts.body.family), fontWeight: 600, color: brand.colors.text, fontSize: (vertical ? 42 : 38) * u };
  const value = { fontWeight: 800, color: brand.colors.text };
  const num = (i: number) => (
    <Counter value={scene.items[i].value} start={at(i)} dur={Math.round(fps * 0.9)} decimals={scene.decimals} prefix={scene.prefix} suffix={scene.suffix} locale={job.lang} />
  );

  let chart: React.ReactNode;
  if (kind === "bar") {
    chart = (
      <div style={{ display: "flex", flexDirection: "column", gap: 40 * u, width: "100%" }}>
        {scene.items.map((it, i) => (
          <div key={i} style={{ opacity: interpolate(frame, [at(i) - 6, at(i) + 4], [0, 1], clamp) }}>
            <div style={{ ...label, display: "flex", justifyContent: "space-between", marginBottom: 10 * u }}>
              <span>{it.label}</span>
              <span style={value}>{num(i)}</span>
            </div>
            <div style={{ height: 34 * u, borderRadius: 17 * u, background: hexA(brand.colors.text, 0.12), overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(Math.abs(it.value) / max) * 100 * grow(i)}%`, background: color(i), borderRadius: 17 * u }} />
            </div>
          </div>
        ))}
      </div>
    );
  } else if (kind === "column") {
    const H = (vertical ? 760 : 480) * u;
    chart = (
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 28 * u, height: H + 120 * u, width: "100%" }}>
        {scene.items.map((it, i) => (
          <div key={i} style={{ flex: 1, maxWidth: 170 * u, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
            <div style={{ ...label, ...value, whiteSpace: "nowrap", fontSize: (vertical ? 36 : 32) * u, marginBottom: 12 * u, opacity: grow(i) }}>{num(i)}</div>
            <div style={{ width: "100%", height: (Math.abs(it.value) / max) * H * grow(i), background: color(i), borderRadius: `${12 * u}px ${12 * u}px 0 0` }} />
            <div style={{ ...label, marginTop: 14 * u, textAlign: "center" }}>{it.label}</div>
          </div>
        ))}
      </div>
    );
  } else if (kind === "line") {
    const W = 1000;
    const H = 520;
    const min = Math.min(...scene.items.map((i) => i.value), 0);
    const pts = scene.items.map((it, i) => [n === 1 ? W / 2 : (i / (n - 1)) * W, H - ((it.value - min) / (max - min || 1)) * (H - 40) - 20] as const);
    const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ");
    const len = pts.reduce((s, [x, y], i) => (i ? s + Math.hypot(x - pts[i - 1][0], y - pts[i - 1][1]) : 0), 0);
    const draw = interpolate(frame, [at(0), at(n - 1) + fps], [0, 1], { ...clamp, easing: ease });
    chart = (
      <div style={{ width: "100%" }}>
        <svg viewBox={`-30 -30 ${W + 60} ${H + 60}`} preserveAspectRatio="none" style={{ width: "100%", height: (vertical ? 700 : 440) * u, overflow: "visible" }}>
          <path d={`${d} L${W},${H} L0,${H} Z`} fill={hexA(brand.colors.primary, 0.18 * draw)} />
          <path d={d} fill="none" stroke={brand.colors.primary} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={len} strokeDashoffset={len * (1 - draw)} />
          {pts.map(([x, y], i) => {
            const s = spring({ frame: frame - at(i) - 8, fps, config: springFor(brand.motion.energy) });
            return <circle key={i} cx={x} cy={y} r={14 * s} fill={color(i)} stroke={brand.colors.bg} strokeWidth={5} />;
          })}
        </svg>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 * u }}>
          {scene.items.map((it, i) => (
            <div key={i} style={{ ...label, textAlign: "center", opacity: grow(i) }}>
              <div style={value}>{num(i)}</div>
              <div style={{ color: brand.colors.muted }}>{it.label}</div>
            </div>
          ))}
        </div>
      </div>
    );
  } else {
    const total = scene.items.reduce((s, i) => s + Math.abs(i.value), 0) || 1;
    const R = 160;
    const C = 2 * Math.PI * R;
    const sweep = interpolate(frame, [at(0), at(n - 1) + fps], [0, 1], { ...clamp, easing: ease });
    let acc = 0;
    chart = (
      <div style={{ display: "flex", flexDirection: vertical ? "column" : "row", alignItems: "center", gap: 50 * u, justifyContent: "center", width: "100%" }}>
        <svg viewBox="-200 -200 400 400" style={{ width: (vertical ? 620 : 520) * u, transform: "rotate(-90deg)" }}>
          <circle r={R} fill="none" stroke={hexA(brand.colors.text, 0.08)} strokeWidth={70} />
          {scene.items.map((it, i) => {
            const frac = Math.abs(it.value) / total;
            const startF = acc;
            acc += frac;
            const shown = Math.max(0, Math.min(frac, sweep - startF));
            return <circle key={i} r={R} fill="none" stroke={color(i)} strokeWidth={70} strokeDasharray={`${shown * C} ${C}`} strokeDashoffset={-startF * C} />;
          })}
        </svg>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 * u }}>
          {scene.items.map((it, i) => (
            <div key={i} style={{ ...label, display: "flex", alignItems: "center", gap: 14 * u, opacity: grow(i) }}>
              <span style={{ width: 30 * u, height: 30 * u, borderRadius: 8 * u, background: color(i) }} />
              <span>{it.label}</span>
              <span style={value}>{num(i)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  const hasHead = !!(scene.eyebrow || scene.title);
  return (
    <AbsoluteFill>
      <SceneBg scene={scene} />
      {vertical || !hasHead || kind === "column" || kind === "line" ? (
        <Safe>
          <Heading eyebrow={scene.eyebrow} title={scene.title} start={t0} align="center" />
          <div style={{ width: "100%", marginTop: hasHead ? 60 * u : 0 }}>{chart}</div>
        </Safe>
      ) : (
        <Split hasHead head={<Heading eyebrow={scene.eyebrow} title={scene.title} start={t0} />} visual={<AbsoluteFill style={{ justifyContent: "center" }}>{chart}</AbsoluteFill>} />
      )}
    </AbsoluteFill>
  );
};

// ── Tipografia cinética ──
export const KineticScene: React.FC<{ scene: Of<"kinetic"> }> = ({ scene }) => {
  const { u, vertical } = useLayout();
  const { fps } = useVideoConfig();
  const { plan } = useVideo();
  const brand = useBrand();
  const frame = useCurrentFrame();
  const { landLocal, frames } = useScene();
  const segs = parseMarks(scene.text);
  const style = scene.style ?? "pop";
  // uma palavra por tempo da música; se não couber na cena, meio tempo
  const room = frames - landLocal - fps * 0.6;
  const step = Math.max(4, plan.beat * segs.length <= room ? plan.beat : plan.beat / 2);
  const wordAt = (i: number) => Math.round(landLocal * 0.5 + i * step);
  const font = brand.fonts.heading;
  const weight = Number(Object.keys(font.files).sort().at(-1) ?? 900);
  const color = (hl: boolean) => (hl ? brand.colors.highlight : brand.colors.text);
  const base = { fontFamily: fontStack(font.family), fontWeight: weight, lineHeight: 0.95, textTransform: font.uppercase ? ("uppercase" as const) : undefined };

  if (style === "pop") {
    let cur = 0;
    segs.forEach((_, i) => { if (frame >= wordAt(i)) cur = i; });
    const s = segs[cur];
    const local = frame - wordAt(cur);
    const pop = spring({ frame: local, fps, config: { damping: 11, mass: 0.5 } });
    const size = Math.min((vertical ? 230 : 260) * u, ((vertical ? 980 : 1700) * u) / Math.max(3, s.word.length * 0.62)) * (font.scale ?? 1);
    return (
      <AbsoluteFill>
        <SceneBg scene={scene} />
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div style={{ ...base, fontSize: size, color: color(s.hl), transform: `scale(${interpolate(pop, [0, 1], [1.6, 1])}) rotate(${(1 - pop) * (cur % 2 ? 6 : -6)}deg)`, opacity: interpolate(local, [0, 3], [0, 1], clamp) }}>
            {s.word}
          </div>
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }
  const size = autoSize(scene.text, vertical ? 150 : 170, 14, 0.4) * u * (font.scale ?? 1);
  return (
    <AbsoluteFill>
      <SceneBg scene={scene} />
      <Safe align={style === "stack" ? "flex-start" : "center"}>
        <div style={{ ...base, fontSize: size, display: "flex", flexDirection: style === "stack" ? "column" : "row", flexWrap: "wrap", gap: style === "stack" ? 0 : `0 ${size * 0.28}px`, justifyContent: "center" }}>
          {segs.map((s, i) => {
            const p = spring({ frame: frame - wordAt(i), fps, config: { damping: 14, mass: 0.6 } });
            const tr = style === "stack" ? `translateY(${(1 - p) * 0.6}em)` : `translateX(${(1 - p) * 1.2}em)`;
            return (
              <span key={i} style={{ display: "inline-block", overflow: "hidden", color: color(s.hl), opacity: p > 0.01 ? 1 : 0 }}>
                <span style={{ display: "inline-block", transform: tr }}>{s.word}</span>
              </span>
            );
          })}
        </div>
      </Safe>
    </AbsoluteFill>
  );
};

// ── Lottie ──
export const LottieScene: React.FC<{ scene: Of<"lottie"> }> = ({ scene }) => {
  const { u, vertical } = useLayout();
  const t0 = useIn();
  const frame = useCurrentFrame();
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [handle] = useState(() => delayRender(`Lottie ${scene.src}`));
  const [data, setData] = useState<LottieAnimationData | null>(null);
  useEffect(() => {
    fetch(src(scene.src))
      .then((r) => r.json())
      .then((json) => { setData(json); continueRender(handle); })
      .catch((e) => cancelRender(e));
  }, [handle, scene.src, continueRender, cancelRender]);
  const hasHead = !!(scene.eyebrow || scene.title || scene.text);
  const appear = interpolate(frame, [t0, t0 + 10], [0, 1], clamp);
  const anim = data ? (
    <Lottie animationData={data} loop={scene.loop ?? true} playbackRate={scene.speed ?? 1} style={{ width: "100%", height: "100%", opacity: appear }} />
  ) : null;
  return (
    <AbsoluteFill>
      <SceneBg scene={scene} />
      <Split
        hasHead={hasHead}
        head={<Heading eyebrow={scene.eyebrow} title={scene.title} text={scene.text} start={t0} align={vertical ? "center" : "left"} />}
        visual={hasHead ? <AbsoluteFill>{anim}</AbsoluteFill> : <div style={{ width: (vertical ? 900 : 880) * u, height: (vertical ? 900 : 880) * u }}>{anim}</div>}
      />
    </AbsoluteFill>
  );
};
