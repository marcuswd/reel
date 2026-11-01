import React from "react";
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Camera } from "../core/camera";
import { clamp, ease, fontStack, hexA, inOut, isLight, src, useBrand, useLayout, useScene, useVideo } from "../core/context";
import { CheckIcon, ContactIcon } from "../core/icons";
import { Background, Media, toMedia } from "../core/media";
import type { Scene } from "../core/schema";
import { itemAt } from "../core/timeline";
import { Counter, Eyebrow, Words, autoSize, wordsFrames } from "../core/text";
import { Body, Card, Logo, Pill, Safe, usePop } from "./ui";
import { Object3DScene } from "./scene-3d";
import { MapScene } from "./scene-map";
import { ChartScene, KineticScene, LottieScene } from "./scenes-extra";

type Of<T extends Scene["type"]> = Extract<Scene, { type: T }>;

/** Fundo da cena (o da cena, o padrão do job ou o automático da marca). */
const SceneBg: React.FC<{ scene: Scene }> = ({ scene }) => {
  const { job } = useVideo();
  const { index, camera } = useScene();
  return <Background bg={scene.background ?? job.defaults.background} index={index} camera={camera} />;
};

/** Momento em que o conteúdo começa a entrar (um pouco antes de a transição terminar). */
const useIn = () => Math.round(useScene().landLocal * 0.6);

// ── Capa ──
export const CoverScene: React.FC<{ scene: Of<"cover"> }> = ({ scene }) => {
  const { u, vertical } = useLayout();
  const { camera } = useScene();
  const brand = useBrand();
  const t0 = useIn();
  const logoPop = usePop(t0);
  const titleAt = t0 + (scene.logo ? 8 : 0) + (scene.eyebrow ? 6 : 0);
  const size = autoSize(scene.title, vertical ? 120 : 132, 20) * u;
  return (
    <AbsoluteFill>
      {scene.media ? <SceneBg scene={{ ...scene, background: { type: "media", media: scene.media, camera: camera === "auto" ? "in" : camera, dim: 0.55 } }} /> : <SceneBg scene={scene} />}
      <Safe>
        {scene.logo ? <Logo height={(vertical ? 300 : 230) * u} style={{ marginBottom: 50 * u, transform: `scale(${logoPop})`, opacity: logoPop }} /> : null}
        {scene.eyebrow ? <Eyebrow label={scene.eyebrow} start={t0} align="center" style={{ marginBottom: 28 * u }} /> : null}
        <Words text={scene.title} start={titleAt} size={size} align="center" style={{ maxWidth: vertical ? "100%" : "80%" }} />
        {scene.subtitle ? (
          <Body size={(vertical ? 40 : 38) * u} align="center" start={titleAt + wordsFrames(scene.title) - 6} color={brand.colors.muted} style={{ marginTop: 34 * u, maxWidth: vertical ? "100%" : "62%" }}>
            {scene.subtitle}
          </Body>
        ) : null}
      </Safe>
    </AbsoluteFill>
  );
};

// ── Frase de impacto ──
export const StatementScene: React.FC<{ scene: Of<"statement"> }> = ({ scene }) => {
  const { u, vertical } = useLayout();
  const t0 = useIn();
  const align = scene.align ?? (vertical ? "center" : "left");
  return (
    <AbsoluteFill>
      <SceneBg scene={scene} />
      <Safe align={align === "center" ? "center" : "flex-start"}>
        {scene.eyebrow ? <Eyebrow label={scene.eyebrow} start={t0} align={align} style={{ marginBottom: 30 * u }} /> : null}
        <Words text={scene.text} start={t0 + (scene.eyebrow ? 6 : 0)} size={autoSize(scene.text, vertical ? 104 : 110, 34, 0.5) * u} align={align} style={{ maxWidth: vertical ? "100%" : "85%" }} />
      </Safe>
    </AbsoluteFill>
  );
};

// ── Foto/vídeo em tela cheia ──
export const MediaScene: React.FC<{ scene: Of<"media"> }> = ({ scene }) => {
  const { u, vertical } = useLayout();
  const { camera } = useScene();
  const brand = useBrand();
  const t0 = useIn();
  const pos = scene.position ?? "bottom";
  const hasText = scene.title || scene.text;
  return (
    <AbsoluteFill style={{ background: brand.colors.bg }}>
      <Media media={scene.media} camera={camera} />
      {hasText ? (
        <AbsoluteFill
          style={{
            background:
              pos === "center"
                ? "rgba(0,0,0,0.45)"
                : `linear-gradient(${pos === "top" ? "0deg" : "180deg"}, transparent 40%, rgba(0,0,0,0.45) 65%, rgba(0,0,0,0.82) 100%)`,
          }}
        />
      ) : null}
      <Safe justify={pos === "top" ? "flex-start" : pos === "center" ? "center" : "flex-end"} align={pos === "center" ? "center" : "flex-start"}>
        {scene.eyebrow ? <Eyebrow label={scene.eyebrow} start={t0} style={{ marginBottom: 22 * u }} /> : null}
        {scene.title ? <Words text={scene.title} start={t0 + 4} size={autoSize(scene.title, vertical ? 92 : 96, 24) * u} align={pos === "center" ? "center" : "left"} style={{ maxWidth: vertical ? "100%" : "70%" }} /> : null}
        {scene.text ? (
          <Body size={(vertical ? 38 : 36) * u} start={t0 + 4 + (scene.title ? wordsFrames(scene.title) : 0)} align={pos === "center" ? "center" : "left"} color={brand.colors.text} style={{ marginTop: 22 * u, maxWidth: vertical ? "100%" : "60%", opacity: 0.9 }}>
            {scene.text}
          </Body>
        ) : null}
      </Safe>
    </AbsoluteFill>
  );
};

// ── Texto + mídia ──
export const SplitScene: React.FC<{ scene: Of<"split"> }> = ({ scene }) => {
  const { u, vertical, w, h, pad } = useLayout();
  const { camera } = useScene();
  const brand = useBrand();
  const t0 = useIn();
  const pop = usePop(t0);
  const right = (scene.side ?? "right") === "right";
  const titleSize = autoSize(scene.title, vertical ? 84 : 80, 26) * u;
  const after = t0 + 6 + wordsFrames(scene.title);
  const text = (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 * u, flex: 1, justifyContent: "center" }}>
      {scene.eyebrow ? <Eyebrow label={scene.eyebrow} start={t0} /> : null}
      <Words text={scene.title} start={t0 + 6} size={titleSize} />
      {scene.text ? <Body size={(vertical ? 36 : 32) * u} start={after}>{scene.text}</Body> : null}
      {scene.bullets?.length ? <Bullets items={scene.bullets} start={after + 6} size={(vertical ? 36 : 32) * u} /> : null}
    </div>
  );
  const mediaW = vertical ? w - pad.x * 2 : w * 0.42;
  const mediaH = vertical ? h * 0.36 : h - pad.top - pad.bottom;
  const card = (
    <Card style={{ width: mediaW, height: mediaH, flexShrink: 0, transform: `translateY(${(1 - pop) * 80 * u}px) scale(${0.92 + 0.08 * pop})`, opacity: Math.min(1, pop * 1.4) }}>
      <Media media={scene.media} camera={toMedia(scene.media).fit === "contain" ? "static" : camera === "static" ? "in" : camera} />
    </Card>
  );
  return (
    <AbsoluteFill>
      <SceneBg scene={scene} />
      <Safe style={{ flexDirection: vertical ? "column" : right ? "row" : "row-reverse", gap: (vertical ? 50 : 80) * u }} align={vertical ? "stretch" : "center"} justify="center">
        {vertical ? card : null}
        {text}
        {vertical ? null : card}
      </Safe>
    </AbsoluteFill>
  );
};

const Bullets: React.FC<{ items: string[]; start: number; size: number; icon?: "check" | "number" | "dot" }> = ({ items, start, size, icon = "check" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const brand = useBrand();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: size * 0.55 }}>
      {items.map((it, i) => {
        const at = start + itemAt(i, items.length, fps) - Math.round(fps * 0.5);
        const p = interpolate(frame, [at, at + 14], [0, 1], { ...clamp, easing: ease });
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: size * 0.55, opacity: p, transform: `translateX(${(1 - p) * -40}px)` }}>
            {icon === "check" ? (
              <CheckIcon size={size * 1.15} color={isLight(brand.colors.highlight) ? brand.colors.textOnSurface : brand.colors.bg} bg={brand.colors.highlight} />
            ) : icon === "number" ? (
              <div style={{ width: size * 1.3, height: size * 1.3, borderRadius: 999, background: brand.colors.primary, color: "#fff", fontFamily: fontStack(brand.fonts.heading.family), fontWeight: 800, fontSize: size * 0.7, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {i + 1}
              </div>
            ) : (
              <div style={{ width: size * 0.4, height: size * 0.4, borderRadius: 99, background: brand.colors.highlight, flexShrink: 0 }} />
            )}
            <span style={{ fontFamily: fontStack(brand.fonts.body.family), fontWeight: 600, fontSize: size, color: brand.colors.text, lineHeight: 1.25 }}>{it.replace(/[[\]]/g, "")}</span>
          </div>
        );
      })}
    </div>
  );
};

// ── Lista ──
export const ListScene: React.FC<{ scene: Of<"list"> }> = ({ scene }) => {
  const { u, vertical, w, h } = useLayout();
  const { camera, landLocal } = useScene();
  const t0 = useIn();
  const size = (vertical ? 46 : 40) * u * (scene.items.length > 5 ? 0.82 : 1);
  return (
    <AbsoluteFill>
      <SceneBg scene={scene} />
      <Safe style={{ flexDirection: vertical || !scene.media ? "column" : "row", gap: 70 * u }} align={vertical || !scene.media ? "flex-start" : "center"}>
        <div style={{ display: "flex", flexDirection: "column", gap: 34 * u, flex: 1, justifyContent: "center" }}>
          {scene.eyebrow ? <Eyebrow label={scene.eyebrow} start={t0} /> : null}
          <Words text={scene.title} start={t0 + 4} size={autoSize(scene.title, vertical ? 84 : 78, 24) * u} />
          <Bullets items={scene.items} start={landLocal} size={size} icon={scene.icon} />
        </div>
        {scene.media && !vertical ? (
          <Card style={{ width: w * 0.36, height: h * 0.7 }}>
            <Media media={scene.media} camera={camera === "static" ? "in" : camera} />
          </Card>
        ) : null}
      </Safe>
    </AbsoluteFill>
  );
};

// ── Números ──
export const StatsScene: React.FC<{ scene: Of<"stats"> }> = ({ scene }) => {
  const { u, vertical } = useLayout();
  const { fps } = useVideoConfig();
  const { landLocal } = useScene();
  const { job } = useVideo();
  const brand = useBrand();
  const frame = useCurrentFrame();
  const t0 = useIn();
  const n = scene.items.length;
  const cols = vertical ? (n > 3 ? 2 : 1) : Math.min(n, 4);
  return (
    <AbsoluteFill>
      <SceneBg scene={scene} />
      <Safe>
        {scene.eyebrow ? <Eyebrow label={scene.eyebrow} start={t0} align="center" style={{ marginBottom: 24 * u }} /> : null}
        {scene.title ? <Words text={scene.title} start={t0 + 4} size={autoSize(scene.title, vertical ? 76 : 72, 26) * u} align="center" style={{ marginBottom: 70 * u }} /> : null}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: `${60 * u}px ${70 * u}px`, width: "100%" }}>
          {scene.items.map((it, i) => {
            const at = landLocal + itemAt(i, n, fps);
            const p = interpolate(frame, [at - 4, at + 12], [0, 1], { ...clamp, easing: ease });
            return (
              <div key={i} style={{ textAlign: "center", opacity: p, transform: `translateY(${(1 - p) * 40 * u}px)` }}>
                <div style={{ fontFamily: fontStack(brand.fonts.heading.family), fontWeight: 900, fontSize: (vertical ? (cols === 1 ? 150 : 110) : n > 3 ? 110 : 140) * u, color: brand.shape.highlight === "marker" ? brand.colors.text : brand.colors.highlight, lineHeight: 1 }}>
                  <Counter value={it.value} start={at} dur={Math.round(fps * 1.3)} decimals={it.decimals} prefix={it.prefix} suffix={it.suffix} locale={job.lang} />
                </div>
                <div style={{ marginTop: 16 * u, height: 4 * u, width: interpolate(frame, [at, at + 30], [0, 80 * u], { ...clamp, easing: ease }), background: brand.colors.accent, marginInline: "auto" }} />
                <div style={{ marginTop: 16 * u, fontFamily: fontStack(brand.fonts.body.family), fontWeight: 600, fontSize: (vertical ? 38 : 32) * u, color: brand.colors.text }}>{it.label}</div>
              </div>
            );
          })}
        </div>
      </Safe>
    </AbsoluteFill>
  );
};

// ── Galeria ──
export const GalleryScene: React.FC<{ scene: Of<"gallery"> }> = ({ scene }) => {
  const { u, vertical, w, h, pad } = useLayout();
  const { fps } = useVideoConfig();
  const { landLocal, frames } = useScene();
  const frame = useCurrentFrame();
  const t0 = useIn();
  const items = scene.items.map(toMedia);
  const n = items.length;
  const layout = scene.layout ?? (n <= 3 ? "stack" : "grid");
  const moves = ["in", "left", "out", "right", "up"] as const;
  const header = (
    <>
      {scene.eyebrow ? <Eyebrow label={scene.eyebrow} start={t0} align="center" style={{ marginBottom: 20 * u }} /> : null}
      {scene.title ? <Words text={scene.title} start={t0 + 4} size={autoSize(scene.title, vertical ? 72 : 66, 26) * u} align="center" style={{ marginBottom: 46 * u }} /> : null}
    </>
  );
  if (layout === "carousel") {
    const cardW = vertical ? w * 0.72 : w * 0.34;
    const cardH = vertical ? h * 0.5 : h * 0.58;
    const gap = 40 * u;
    const travel = (cardW + gap) * (n - 1);
    const x = interpolate(frame, [landLocal, frames - 10], [0, -travel], { ...clamp, easing: inOut });
    return (
      <AbsoluteFill>
        <SceneBg scene={scene} />
        <Safe>
          {header}
          <div style={{ width: "100%", height: cardH, position: "relative" }}>
            <div style={{ position: "absolute", left: `calc(50% - ${cardW / 2}px)`, display: "flex", gap, transform: `translateX(${x}px)` }}>
              {items.map((m, i) => {
                const center = Math.abs((i * (cardW + gap) + x) / (cardW + gap));
                return (
                  <Card key={i} style={{ width: cardW, height: cardH, flexShrink: 0, transform: `scale(${interpolate(center, [0, 1], [1, 0.82], clamp)})`, opacity: interpolate(center, [0, 1.6], [1, 0.4], clamp) }}>
                    <Media media={m} camera="in" />
                  </Card>
                );
              })}
            </div>
          </div>
        </Safe>
      </AbsoluteFill>
    );
  }
  if (layout === "stack") {
    const cardW = vertical ? w * 0.7 : w * 0.3;
    const cardH = cardW * 1.2;
    return (
      <AbsoluteFill>
        <SceneBg scene={scene} />
        <Safe>
          {header}
          <div style={{ position: "relative", width: "100%", height: cardH * 1.05 }}>
            {items.map((m, i) => {
              const at = landLocal + itemAt(i, n, fps) - 6;
              const p = interpolate(frame, [at, at + 16], [0, 1], { ...clamp, easing: ease });
              const spread = vertical ? 0.16 : 0.9;
              const off = (i - (n - 1) / 2) * cardW * spread;
              return (
                <Card
                  key={i}
                  style={{
                    position: "absolute",
                    left: `calc(50% - ${cardW / 2}px + ${off}px)`,
                    top: vertical ? i * 40 * u : 0,
                    width: cardW,
                    height: cardH,
                    border: `${8 * u}px solid #fff`,
                    transform: `translateY(${(1 - p) * h * 0.6}px) rotate(${(i - (n - 1) / 2) * 5 * p}deg)`,
                  }}
                >
                  <Media media={m} camera={moves[i % moves.length]} />
                </Card>
              );
            })}
          </div>
        </Safe>
      </AbsoluteFill>
    );
  }
  const cols = vertical ? 2 : n <= 4 ? 2 : 3;
  const rows = Math.ceil(n / cols);
  const gap = 26 * u;
  const gridH = (vertical ? h * 0.62 : h - pad.top - pad.bottom - (scene.title ? 160 * u : 0)) ;
  return (
    <AbsoluteFill>
      <SceneBg scene={scene} />
      <Safe>
        {header}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)`, gap, width: vertical ? "100%" : Math.min(w - pad.x * 2, gridH * 1.6), height: gridH }}>
          {items.map((m, i) => {
            const at = landLocal + itemAt(i, n, fps) - 6;
            const p = interpolate(frame, [at, at + 14], [0, 1], { ...clamp, easing: ease });
            return (
              <Card key={i} style={{ width: "100%", height: "100%", transform: `scale(${0.7 + 0.3 * p})`, opacity: p }}>
                <Media media={m} camera={moves[i % moves.length]} intensity={0.6} />
              </Card>
            );
          })}
        </div>
      </Safe>
    </AbsoluteFill>
  );
};

// ── Print de tela (browser/celular) com push-in e pan ──
export const ScreenScene: React.FC<{ scene: Of<"screen"> }> = ({ scene }) => {
  const { u, vertical, w, h, pad } = useLayout();
  const { fps } = useVideoConfig();
  const { landLocal, frames } = useScene();
  const brand = useBrand();
  const frame = useCurrentFrame();
  const t0 = useIn();
  const device = scene.device ?? "browser";
  const enter = interpolate(frame, [t0, t0 + 40], [0, 1], { ...clamp, easing: ease });
  const zoomAt = landLocal + Math.round(fps * 1.2);
  const z = scene.focus ? interpolate(frame, [zoomAt, zoomAt + Math.round(fps * 1.3)], [0, 1], { ...clamp, easing: inOut }) : 0;
  const f = scene.focus ?? { x: 0.5, y: 0.5, w: 1, h: 1 };
  const fw = f.w ?? 0.4;
  const zoom = 1 + (Math.min(2.2, 0.9 / fw) - 1) * z;
  const panY = scene.pan ? interpolate(frame, [landLocal + 10, frames - 10], [0, 100], { ...clamp, easing: inOut }) : 0;
  const hasText = scene.title || scene.text;
  const availH = h - pad.top - pad.bottom - (hasText ? (vertical ? 340 : 120) * u : 0);
  const devW = device === "phone" ? Math.min(availH * 0.48, w * 0.6) : Math.min(w - pad.x * 2, availH * 1.6);
  const devH = device === "phone" ? devW * 2.05 : devW * 0.625;
  const bar = device === "browser" ? 34 * u : 0;
  const screen = (
    <div style={{ position: "absolute", top: bar, left: 0, right: 0, bottom: 0, overflow: "hidden" }}>
      <div style={{ width: "100%", height: "100%", transformOrigin: `${(f.x + fw / 2) * 100}% ${(f.y + (f.h ?? fw) / 2) * 100}%`, transform: `scale(${zoom})` }}>
        <Img src={src(scene.src)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `50% ${panY}%` }} />
      </div>
      {scene.focus ? (
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at ${(f.x + fw / 2) * 100}% ${(f.y + (f.h ?? fw) / 2) * 100}%, transparent 30%, ${hexA("#000000", (isLight(brand.colors.bg) ? 0.14 : 0.35) * z)} 75%)` }} />
      ) : null}
    </div>
  );
  return (
    <AbsoluteFill>
      <SceneBg scene={scene} />
      <Safe justify={hasText ? "space-between" : "center"} style={{ gap: 30 * u }}>
        {hasText ? (
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 16 * u, alignItems: vertical ? "center" : "flex-start" }}>
            {scene.eyebrow ? <Eyebrow label={scene.eyebrow} start={t0} align={vertical ? "center" : "left"} /> : null}
            {scene.title ? <Words text={scene.title} start={t0 + 4} size={autoSize(scene.title, vertical ? 70 : 60, 30) * u} align={vertical ? "center" : "left"} /> : null}
            {scene.text ? <Body size={(vertical ? 34 : 30) * u} start={t0 + 14} align={vertical ? "center" : "left"}>{scene.text}</Body> : null}
          </div>
        ) : null}
        <div style={{ perspective: 2400 }}>
          <div
            style={{
              width: devW,
              height: devH,
              position: "relative",
              borderRadius: device === "phone" ? 56 * u : 14 * u,
              overflow: "hidden",
              background: "#fff",
              border: device === "phone" ? `${12 * u}px solid #111` : undefined,
              boxShadow: `0 ${40 * u}px ${100 * u}px rgba(0,0,0,0.4)`,
              opacity: enter,
              transform: `translateY(${(1 - enter) * 160 * u}px) rotateX(${(1 - enter) * 14}deg) rotateY(${(1 - enter) * -18}deg)`,
            }}
          >
            {device === "browser" ? (
              <div style={{ height: bar, background: "#eef1f6", display: "flex", alignItems: "center", gap: 9 * u, paddingLeft: 16 * u }}>
                {["#ff5f57", "#febc2e", "#28c840"].map((c) => <div key={c} style={{ width: 12 * u, height: 12 * u, borderRadius: 99, background: c }} />)}
                <div style={{ marginLeft: 18 * u, height: 16 * u, width: "36%", borderRadius: 99, background: "#fff" }} />
              </div>
            ) : null}
            {screen}
            {device === "phone" ? <div style={{ position: "absolute", top: 14 * u, left: "50%", width: devW * 0.3, height: 26 * u, marginLeft: -devW * 0.15, borderRadius: 99, background: "#111" }} /> : null}
          </div>
        </div>
      </Safe>
    </AbsoluteFill>
  );
};

// ── Depoimento ──
export const QuoteScene: React.FC<{ scene: Of<"quote"> }> = ({ scene }) => {
  const { u, vertical } = useLayout();
  const brand = useBrand();
  const t0 = useIn();
  const pop = usePop(t0);
  const frame = useCurrentFrame();
  const after = t0 + 8 + wordsFrames(scene.text, 2);
  return (
    <AbsoluteFill>
      <SceneBg scene={scene} />
      <Safe align={vertical ? "center" : "flex-start"}>
        <div style={{ fontFamily: "Georgia, serif", fontSize: 260 * u, lineHeight: 0.6, height: 120 * u, color: brand.colors.highlight, transform: `scale(${pop})`, transformOrigin: "left bottom" }}>“</div>
        <Words text={scene.text} start={t0 + 8} stagger={2} size={autoSize(scene.text, vertical ? 70 : 72, 60, 0.6) * u} align={vertical ? "center" : "left"} font="body" weight={600} lineHeight={1.25} style={{ maxWidth: vertical ? "100%" : "82%" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 24 * u, marginTop: 50 * u, opacity: interpolate(frame, [after, after + 14], [0, 1], clamp) }}>
          {scene.avatar ? <Img src={src(scene.avatar)} style={{ width: 96 * u, height: 96 * u, borderRadius: 999, objectFit: "cover", border: `${4 * u}px solid ${brand.colors.highlight}` }} /> : null}
          <div>
            <div style={{ fontFamily: fontStack(brand.fonts.heading.family), fontWeight: 800, fontSize: 38 * u, color: brand.colors.text }}>{scene.author}</div>
            {scene.role ? <div style={{ fontFamily: fontStack(brand.fonts.body.family), fontSize: 28 * u, color: brand.colors.muted }}>{scene.role}</div> : null}
          </div>
        </div>
      </Safe>
    </AbsoluteFill>
  );
};

// ── Chamada para ação ──
export const CtaScene: React.FC<{ scene: Of<"cta"> }> = ({ scene }) => {
  const { u, vertical } = useLayout();
  const { fps } = useVideoConfig();
  const { landLocal } = useScene();
  const brand = useBrand();
  const frame = useCurrentFrame();
  const t0 = useIn();
  const btnAt = landLocal + Math.round(fps * 0.9);
  const btn = usePop(btnAt);
  const pulse = 1 + 0.04 * Math.max(0, Math.sin(((frame - btnAt) / fps) * Math.PI * 2)) * (frame > btnAt + 15 ? 1 : 0);
  const logoPop = usePop(t0);
  return (
    <AbsoluteFill>
      <SceneBg scene={scene} />
      <Safe>
        {scene.logo !== false ? <Logo height={(vertical ? 190 : 150) * u} style={{ marginBottom: 46 * u, opacity: logoPop, transform: `scale(${logoPop})` }} /> : null}
        {scene.eyebrow ? <Eyebrow label={scene.eyebrow} start={t0} align="center" style={{ marginBottom: 24 * u }} /> : null}
        <Words text={scene.title} start={t0 + 6} size={autoSize(scene.title, vertical ? 100 : 96, 22) * u} align="center" style={{ maxWidth: vertical ? "100%" : "80%" }} />
        {scene.text ? (
          <Body size={(vertical ? 38 : 36) * u} align="center" start={t0 + 6 + wordsFrames(scene.title)} style={{ marginTop: 26 * u, maxWidth: vertical ? "100%" : "60%" }}>
            {scene.text}
          </Body>
        ) : null}
        {scene.button ? (
          <Pill size={(vertical ? 50 : 44) * u} style={{ marginTop: 50 * u, transform: `scale(${btn * pulse})`, opacity: Math.min(1, btn * 2) }}>
            {scene.contact?.[0]?.kind === "whatsapp" ? <ContactIcon kind="whatsapp" size={(vertical ? 56 : 50) * u} color="currentColor" /> : null}
            {scene.button}
          </Pill>
        ) : null}
        {scene.contact?.length ? (
          <div style={{ display: "flex", flexDirection: vertical ? "column" : "row", gap: (vertical ? 22 : 50) * u, marginTop: 44 * u, alignItems: "center" }}>
            {scene.contact.map((c, i) => {
              const at = btnAt + 10 + i * 6;
              const p = interpolate(frame, [at, at + 12], [0, 1], { ...clamp, easing: ease });
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 16 * u, opacity: p, transform: `translateY(${(1 - p) * 20}px)` }}>
                  <ContactIcon kind={c.kind} size={42 * u} color={brand.colors.highlight} />
                  <span style={{ fontFamily: fontStack(brand.fonts.body.family), fontWeight: 700, fontSize: (vertical ? 40 : 34) * u, color: brand.colors.text }}>{c.value}</span>
                </div>
              );
            })}
          </div>
        ) : null}
      </Safe>
    </AbsoluteFill>
  );
};

// ── Assinatura (logo final) ──
export const LogoScene: React.FC<{ scene: Of<"logo"> }> = ({ scene }) => {
  const { u, vertical } = useLayout();
  const { fps } = useVideoConfig();
  const { landLocal } = useScene();
  const brand = useBrand();
  const frame = useCurrentFrame();
  const at = landLocal + Math.round(fps * 0.2);
  const pop = usePop(at);
  const sweep = interpolate(frame, [at + 10, at + 40], [-60, 160], clamp);
  return (
    <AbsoluteFill>
      <SceneBg scene={scene} />
      <Safe>
        <div style={{ position: "relative", transform: `scale(${0.6 + 0.4 * pop})`, opacity: Math.min(1, pop * 1.5) }}>
          <Logo height={(vertical ? 220 : 200) * u} />
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(105deg, transparent ${sweep - 20}%, rgba(255,255,255,0.55) ${sweep}%, transparent ${sweep + 20}%)`, mixBlendMode: "overlay" }} />
        </div>
        {scene.tagline ? (
          <Body size={(vertical ? 40 : 36) * u} align="center" start={at + 14} color={brand.colors.text} style={{ marginTop: 40 * u, letterSpacing: 2 * u }}>
            {scene.tagline}
          </Body>
        ) : null}
      </Safe>
    </AbsoluteFill>
  );
};

/** Roteador de cenas por tipo. */
export const SceneView: React.FC<{ scene: Scene }> = ({ scene }) => {
  switch (scene.type) {
    case "cover": return <CoverScene scene={scene} />;
    case "statement": return <StatementScene scene={scene} />;
    case "media": return <MediaScene scene={scene} />;
    case "split": return <SplitScene scene={scene} />;
    case "screen": return <ScreenScene scene={scene} />;
    case "list": return <ListScene scene={scene} />;
    case "stats": return <StatsScene scene={scene} />;
    case "gallery": return <GalleryScene scene={scene} />;
    case "quote": return <QuoteScene scene={scene} />;
    case "cta": return <CtaScene scene={scene} />;
    case "logo": return <LogoScene scene={scene} />;
    case "chart": return <ChartScene scene={scene} />;
    case "kinetic": return <KineticScene scene={scene} />;
    case "lottie": return <LottieScene scene={scene} />;
    case "object3d": return <Object3DScene scene={scene} />;
    case "map": return <MapScene scene={scene} />;
  }
};

export { Camera };
