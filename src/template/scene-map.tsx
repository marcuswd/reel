// Mapa: MapLibre + estilos grátis do OpenFreeMap (sem chave; atribuição OpenStreetMap visível).
// O mapa é uma "placa" fixa (estável no render); marcadores, rótulos e a rota animada ficam numa camada SVG
// projetada uma vez sobre ele, e a placa recebe só um leve avanço de câmera em CSS.
import greatCircle from "@turf/great-circle";
import { point } from "@turf/helpers";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import React, { useEffect, useRef, useState } from "react";
import { AbsoluteFill, interpolate, spring, staticFile, useCurrentFrame, useDelayRender, useVideoConfig } from "remotion";
import { clamp, ease, fontStack, hexA, isLight, useBrand, useLayout, useScene } from "../core/context";
import { itemAt } from "../core/timeline";
import { Heading, useIn, type Of } from "./scenes-extra";
import { Safe } from "./ui";

const STYLE = { light: "https://tiles.openfreemap.org/styles/positron", dark: "https://tiles.openfreemap.org/styles/dark" };
type Projected = { pins: { x: number; y: number }[]; legs: string[]; lengths: number[] };

/** Rota entre dois pontos: arco de grande círculo quando a distância é grande, reta quando é curta. */
const leg = (a: [number, number], b: [number, number]): [number, number][] => {
  const far = Math.hypot(a[0] - b[0], a[1] - b[1]) > 2;
  if (!far) return [a, b];
  const gc = greatCircle(point(a), point(b), { npoints: 64 });
  return gc.geometry.type === "LineString" ? (gc.geometry.coordinates as [number, number][]) : [a, b];
};

export const MapScene: React.FC<{ scene: Of<"map"> }> = ({ scene }) => {
  const { width, height, fps } = useVideoConfig();
  const { u, vertical } = useLayout();
  const brand = useBrand();
  const frame = useCurrentFrame();
  const { landLocal, frames } = useScene();
  const t0 = useIn();
  const ref = useRef<HTMLDivElement>(null);
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [handle] = useState(() => delayRender("Carregando o mapa"));
  const [proj, setProj] = useState<Projected | null>(null);
  const hasHead = !!(scene.eyebrow || scene.title);
  const coords = scene.points.map((p) => [p.lng, p.lat] as [number, number]);

  useEffect(() => {
    if (!ref.current) return;
    // worker servido pelo próprio bundle (public/vendor, copiado no postinstall): não depende de CDN
    maplibregl.setWorkerUrl(new URL(staticFile("vendor/maplibre-gl-worker.mjs"), window.location.href).href);
    const map = new maplibregl.Map({
      container: ref.current,
      style: isLight(brand.colors.bg) ? STYLE.light : STYLE.dark,
      center: coords[0],
      zoom: scene.zoom ?? 10,
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
      canvasContextAttributes: { preserveDrawingBuffer: true },
    });
    // espaço para o título: em pé fica em cima; deitado, à esquerda
    const pad = { top: (hasHead && vertical ? 520 : 160) * u, bottom: 200 * u, left: (hasHead && !vertical ? 820 : 160) * u, right: 160 * u };
    map.on("error", (e) => cancelRender(e.error ?? new Error("erro no mapa")));
    map.on("load", () => {
      if (coords.length === 1) map.jumpTo({ center: coords[0], zoom: scene.zoom ?? 11 });
      else {
        const b = new maplibregl.LngLatBounds(coords[0], coords[0]);
        for (const c of coords) b.extend(c);
        map.fitBounds(b, { padding: pad, maxZoom: scene.zoom ?? 12, duration: 0 });
      }
      map.once("idle", () => {
        const pins = coords.map((c) => map.project(c));
        const legs: string[] = [];
        const lengths: number[] = [];
        if (scene.route !== false && coords.length > 1) {
          for (let i = 1; i < coords.length; i++) {
            const pts = leg(coords[i - 1], coords[i]).map((c) => map.project(c));
            legs.push(pts.map((q, k) => `${k ? "L" : "M"}${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(" "));
            lengths.push(pts.reduce((s, q, k) => (k ? s + Math.hypot(q.x - pts[k - 1].x, q.y - pts[k - 1].y) : 0), 0));
          }
        }
        setProj({ pins: pins.map((q) => ({ x: q.x, y: q.y })), legs, lengths });
        continueRender(handle);
      });
    });
    // sem map.remove(): atrapalha o ciclo de render do Remotion (regra da skill de mapas)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const n = scene.points.length;
  const pinAt = (i: number) => landLocal + itemAt(i, n, fps);
  // avanço lento da "câmera" sobre a placa (o mapa em si não se move)
  const push = interpolate(frame, [0, frames], [1, 1.07], { easing: ease });
  const ink = isLight(brand.colors.bg) ? "#111111" : "#ffffff";
  return (
    <AbsoluteFill style={{ background: brand.colors.bg }}>
      <AbsoluteFill style={{ transform: `scale(${push})` }}>
        <div ref={ref} style={{ width, height, position: "absolute" }} />
        {proj ? (
          <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
            {proj.legs.map((d, i) => {
              const at = pinAt(i);
              const draw = interpolate(frame, [at, pinAt(i + 1)], [0, 1], { ...clamp, easing: ease });
              return (
                <path key={i} d={d} fill="none" stroke={brand.colors.highlight} strokeWidth={7 * u} strokeLinecap="round"
                  strokeDasharray={proj.lengths[i]} strokeDashoffset={proj.lengths[i] * (1 - draw)} style={{ filter: `drop-shadow(0 0 ${8 * u}px ${hexA(brand.colors.highlight, 0.6)})` }} />
              );
            })}
            {proj.pins.map((q, i) => {
              const s = spring({ frame: frame - pinAt(i), fps, config: { damping: 10, mass: 0.6 } });
              const pulse = interpolate((frame - pinAt(i)) % fps, [0, fps], [0, 1], clamp);
              return (
                <g key={i} transform={`translate(${q.x},${q.y})`} opacity={interpolate(frame, [pinAt(i) - 2, pinAt(i) + 2], [0, 1], clamp)}>
                  <circle r={(18 + pulse * 30) * u} fill={hexA(brand.colors.highlight, 0.35 * (1 - pulse))} />
                  <circle r={16 * u * s} fill={brand.colors.highlight} stroke={brand.colors.bg} strokeWidth={5 * u} />
                </g>
              );
            })}
          </svg>
        ) : null}
        {proj
          ? scene.points.map((pt, i) =>
              pt.label ? (
                <div key={i} style={{
                  position: "absolute", left: proj.pins[i].x, top: proj.pins[i].y - 34 * u, transform: "translate(-50%, -100%)",
                  padding: `${8 * u}px ${16 * u}px`, borderRadius: 999, background: brand.colors.surface, color: brand.colors.textOnSurface,
                  fontFamily: fontStack(brand.fonts.body.family), fontWeight: 700, fontSize: (vertical ? 34 : 28) * u, whiteSpace: "nowrap",
                  boxShadow: "0 8px 30px rgba(0,0,0,0.25)", opacity: interpolate(frame, [pinAt(i) + 4, pinAt(i) + 12], [0, 1], clamp),
                }}>
                  {pt.label}
                </div>
              ) : null,
            )
          : null}
      </AbsoluteFill>
      {/* véu do lado do título, para o texto ler bem sobre o mapa */}
      {hasHead ? (
        <AbsoluteFill style={{ background: vertical ? `linear-gradient(180deg, ${hexA(brand.colors.bg, 0.92)} 0%, ${hexA(brand.colors.bg, 0)} 38%)` : `linear-gradient(90deg, ${hexA(brand.colors.bg, 0.92)} 0%, ${hexA(brand.colors.bg, 0)} 50%)` }} />
      ) : null}
      {hasHead ? (
        <Safe justify={vertical ? "flex-start" : "center"} align="flex-start">
          <div style={{ width: vertical ? "100%" : "40%" }}>
            <Heading eyebrow={scene.eyebrow} title={scene.title} start={t0} align={vertical ? "center" : "left"} />
          </div>
        </Safe>
      ) : null}
      <div style={{ position: "absolute", right: 14 * u, bottom: 10 * u, fontSize: 16 * u, fontFamily: "Inter, sans-serif", color: hexA(ink, 0.6) }}>
        © OpenFreeMap © OpenStreetMap
      </div>
    </AbsoluteFill>
  );
};
