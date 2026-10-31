import React from "react";
import { AbsoluteFill, Img, interpolate, random, staticFile, useCurrentFrame } from "remotion";
import { content } from "./content";
import { body, c, clamp, ease, title } from "./theme";
import { Berry, Bg, Check, Pill, Snowflake, WhatsIcon, Words, usePop } from "./ui";

const float = (frame: number, amp = 10, period = 40, phase = 0) => Math.sin((frame + phase) / period * Math.PI * 2) * amp;

const LogoBadge: React.FC<{ size: number; p: number; frame: number }> = ({ size, p, frame }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: c.white,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 30px 80px rgba(20,8,30,0.45), 0 0 0 18px rgba(255,255,255,0.12)",
      transform: `scale(${p}) rotate(${(1 - p) * -25 + float(frame, 1.5, 70)}deg)`,
    }}
  >
    <Img src={staticFile(content.logo)} style={{ width: size * 0.86, height: size * 0.86, objectFit: "contain" }} />
  </div>
);

// ── 1. Abertura ──
export const Abertura: React.FC = () => {
  const frame = useCurrentFrame();
  const badge = usePop(14, 9);
  return (
    <AbsoluteFill>
      <Bg from={c.acaiVivid} to={c.acaiDeep} seed="ab" berries={8} opacity={0.35} />
      {/* chuva de açaí que quica no chão */}
      {new Array(16).fill(0).map((_, i) => {
        const r = (k: string) => random(`chuva-${i}-${k}`);
        const start = Math.floor(r("t") * 16);
        const size = 70 + r("s") * 90;
        const x = 40 + r("x") * 960;
        const floor = 1500 + r("y") * 380;
        const t = Math.max(0, frame - start);
        // queda com quique (gravidade + amortecimento)
        const fall = Math.min(1, t / 14);
        const bounce = t > 14 ? Math.abs(Math.sin((t - 14) / 6)) * 120 * Math.exp(-(t - 14) / 10) : 0;
        const y = interpolate(fall * fall, [0, 1], [-200, floor]) - bounce;
        return <Berry key={i} size={size} style={{ left: x, top: y, opacity: frame >= start ? 1 : 0 }} />;
      })}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 70, paddingBottom: 220 }}>
        <LogoBadge size={640} p={badge} frame={frame} />
        <Words text={content.abertura.tagline} start={26} size={64} weight={800} stagger={2} style={{ width: 860 }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── 2. Polpas ──
export const Polpas: React.FC = () => {
  const frame = useCurrentFrame();
  const band = interpolate(frame, [4, 22], [0, 1], { ...clamp, easing: ease });
  const selo = usePop(62, 8);
  const pos = [
    { x: 0, y: 820, rot: -12, w: 470 },
    { x: 610, y: 800, rot: 11, w: 470 },
    { x: 280, y: 870, rot: -1, w: 520 },
  ];
  return (
    <AbsoluteFill>
      <Bg from={c.acai} to={c.acaiDeep} seed="po" berries={9} opacity={0.4} />
      {/* faixa laranja diagonal, como no banner do site */}
      <div
        style={{
          position: "absolute",
          left: -200,
          top: 980,
          width: 1500,
          height: 620,
          background: c.orange,
          transform: `rotate(-9deg) scaleX(${band})`,
          transformOrigin: "left center",
        }}
      />
      <div style={{ position: "absolute", top: 270, left: 70, right: 70 }}>
        <Words text={content.polpas.title} start={8} size={96} />
      </div>
      {content.polpas.produtos.map((src, i) => {
        const p = usePop(22 + i * 8, 10);
        const { x, y, rot, w } = pos[i];
        return (
          <Img
            key={src}
            src={staticFile(src)}
            style={{
              position: "absolute",
              left: x,
              top: y + float(frame, 10, 45, i * 20),
              width: w,
              transform: `translateY(${(1 - p) * 900}px) rotate(${rot + (1 - p) * 30}deg)`,
              filter: "drop-shadow(0 30px 40px rgba(0,0,0,0.4))",
            }}
          />
        );
      })}
      {/* selo 12% */}
      <div
        style={{
          position: "absolute",
          right: 70,
          top: 1430,
          width: 230,
          height: 230,
          borderRadius: "50%",
          background: c.magenta,
          border: `8px solid ${c.white}`,
          color: c.white,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: title,
          transform: `scale(${selo}) rotate(${12 + (1 - selo) * -120 + float(frame, 4, 50)}deg)`,
          boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 44, lineHeight: 1 }}>{content.polpas.selo[0]}</div>
        <div style={{ fontWeight: 900, fontSize: 84, lineHeight: 1 }}>{content.polpas.selo[1]}</div>
      </div>
    </AbsoluteFill>
  );
};

// ── 3. Frutas ──
export const Frutas: React.FC = () => {
  const frame = useCurrentFrame();
  const basket = usePop(10, 9);
  const sub = interpolate(frame, [70, 84], [0, 1], { ...clamp, easing: ease });
  const n = content.frutas.frutas.length;
  const chipColors = [c.magenta, c.acaiVivid, c.green, c.acai, c.magenta, c.green, c.acaiVivid];
  return (
    <AbsoluteFill>
      <Bg from="#fbc678" to="#f39a3d" seed="fr" berries={7} opacity={0.25} />
      <div style={{ position: "absolute", top: 270, left: 60, right: 60 }}>
        <Words text={content.frutas.title} start={4} size={104} color={c.acai} hl={c.magenta} />
      </div>
      <Img
        src={staticFile(content.frutas.imagem)}
        style={{
          position: "absolute",
          left: 190,
          top: 640,
          width: 700,
          transform: `scale(${basket}) rotate(${float(frame, 3, 30)}deg)`,
          filter: "drop-shadow(0 30px 40px rgba(90,30,0,0.35))",
        }}
      />
      {content.frutas.frutas.map((f, i) => {
        const p = usePop(24 + i * 5, 9);
        const ang = (-150 + (i * 300) / (n - 1)) * (Math.PI / 180);
        const cx = 540 + Math.cos(ang) * 430;
        const cy = 990 + Math.sin(ang) * 400 * 1.05;
        return (
          <div
            key={f}
            style={{
              position: "absolute",
              left: cx,
              top: cy + float(frame, 8, 35, i * 13),
              transform: `translate(-50%, -50%) scale(${p}) rotate(${(i % 2 ? 6 : -6) * p}deg)`,
            }}
          >
            <Pill bg={chipColors[i]} size={42}>
              {f}
            </Pill>
          </div>
        );
      })}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 1500,
          textAlign: "center",
          fontFamily: body,
          fontWeight: 700,
          fontSize: 54,
          lineHeight: 1.2,
          color: c.acai,
          opacity: sub,
          transform: `translateY(${(1 - sub) * 40}px)`,
        }}
      >
        {content.frutas.sub}
      </div>
    </AbsoluteFill>
  );
};

// ── 4. Xarope ──
export const Xarope: React.FC = () => {
  const frame = useCurrentFrame();
  const enter = usePop(8, 12);
  const stamp = usePop(46, 7, 0.5);
  const sub = interpolate(frame, [66, 80], [0, 1], { ...clamp, easing: ease });
  return (
    <AbsoluteFill>
      <Bg from={c.magenta} to={c.acaiDeep} seed="xa" berries={8} opacity={0.35} />
      <div style={{ position: "absolute", top: 270, left: 60, right: 60, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <Words text={content.xarope.title} start={4} size={96} />
        <Words text={`[${content.xarope.destaque}]`} start={14} size={124} stagger={4} />
      </div>
      <div
        style={{
          position: "absolute",
          left: 140,
          top: 640,
          width: 800,
          height: 800,
          transform: `translateX(${(1 - enter) * 900}px) rotate(${(1 - enter) * 25 + float(frame, 2, 45)}deg)`,
        }}
      >
        <Img src={staticFile(content.xarope.imagem)} style={{ width: 800, filter: "drop-shadow(0 30px 40px rgba(0,0,0,0.45))" }} />
        {/* etiqueta "SUA MARCA" carimbada no galão */}
        <div
          style={{
            position: "absolute",
            left: 230,
            top: 400,
            width: 330,
            padding: "26px 0",
            borderRadius: 26,
            background: c.white,
            border: `8px dashed ${c.magenta}`,
            color: c.magenta,
            fontFamily: title,
            fontWeight: 900,
            fontSize: 58,
            textAlign: "center",
            letterSpacing: 1,
            opacity: interpolate(stamp, [0, 0.2], [0, 1], clamp),
            transform: `scale(${interpolate(stamp, [0, 1], [2.4, 1])}) rotate(${-8 + (1 - stamp) * 20}deg)`,
            boxShadow: "0 16px 30px rgba(0,0,0,0.3)",
          }}
        >
          {content.xarope.etiqueta}
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1530, display: "flex", justifyContent: "center", opacity: sub, transform: `translateY(${(1 - sub) * 40}px)` }}>
        <Pill bg={c.orange} color={c.acai} size={46}>
          {content.xarope.sub}
        </Pill>
      </div>
    </AbsoluteFill>
  );
};

// ── 5. Entregas ──
export const Entregas: React.FC = () => {
  const frame = useCurrentFrame();
  const drive = interpolate(frame, [6, 34], [1, 0], { ...clamp, easing: ease });
  const brake = usePop(30, 6);
  const chip = usePop(52, 9);
  const sub = interpolate(frame, [62, 76], [0, 1], { ...clamp, easing: ease });
  const bob = drive > 0.02 ? Math.sin(frame * 1.6) * 4 : 0;
  return (
    <AbsoluteFill>
      <Bg from={c.cream} to="#f7dcc0" seed="en" berries={6} opacity={0.18} />
      <div style={{ position: "absolute", top: 270, left: 60, right: 60 }}>
        <Words text={content.entregas.title} start={4} size={108} color={c.acai} hl={c.magenta} />
      </div>
      {/* estrada */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 1235, height: 26, background: c.acai, opacity: 0.85 }} />
      {new Array(9).fill(0).map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: 1244,
            left: ((i * 160 - frame * 22 * (0.25 + drive)) % 1440 + 1440) % 1440 - 180,
            width: 80,
            height: 8,
            borderRadius: 4,
            background: c.orange,
          }}
        />
      ))}
      {/* linhas de velocidade */}
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: 900 + drive * 600 + i * 30,
            top: 920 + i * 70,
            width: 220 * drive,
            height: 10,
            borderRadius: 5,
            background: c.acai,
            opacity: 0.5 * drive,
          }}
        />
      ))}
      <Img
        src={staticFile(content.entregas.imagem)}
        style={{
          position: "absolute",
          left: 40 + drive * 1100,
          top: 560 + bob,
          width: 1000,
          transform: `rotate(${(1 - brake) * -3}deg)`,
          transformOrigin: "bottom center",
        }}
      />
      <div style={{ position: "absolute", left: 0, right: 0, top: 1330, display: "flex", justifyContent: "center", transform: `scale(${chip})` }}>
        <Pill bg={c.magenta} size={46}>
          {content.entregas.chip}
        </Pill>
      </div>
      <div
        style={{
          position: "absolute",
          left: 90,
          right: 90,
          top: 1480,
          display: "flex",
          alignItems: "center",
          gap: 26,
          opacity: sub,
          transform: `translateY(${(1 - sub) * 40}px)`,
        }}
      >
        <div style={{ flex: "none", width: 110, height: 110, borderRadius: "50%", background: "#3f8fd8", display: "flex", alignItems: "center", justifyContent: "center", transform: `rotate(${frame * 2}deg)` }}>
          <Snowflake size={70} color={c.white} />
        </div>
        <div style={{ fontFamily: body, fontWeight: 700, fontSize: 50, lineHeight: 1.2, color: c.acai }}>{content.entregas.sub}</div>
      </div>
    </AbsoluteFill>
  );
};

// ── 6. Diferenciais ──
export const Diferenciais: React.FC = () => {
  const frame = useCurrentFrame();
  const cores = [c.green, c.magenta, c.orange];
  const tinta = [c.green, c.magenta, "#c97d1c"];
  return (
    <AbsoluteFill>
      <Bg from={c.acaiVivid} to={c.acaiDeep} seed="di" berries={10} opacity={0.35} />
      <div style={{ position: "absolute", top: 470, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 80 }}>
        {content.diferenciais.itens.map((t, i) => {
          const p = usePop(8 + i * 18, 8, 0.55);
          return (
            <div
              key={t}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 30,
                padding: "38px 54px",
                borderRadius: 40,
                background: cores[i],
                color: i === 2 ? c.acai : c.white,
                fontFamily: title,
                fontWeight: 900,
                fontSize: 66,
                boxShadow: "0 22px 50px rgba(0,0,0,0.35)",
                opacity: interpolate(p, [0, 0.15], [0, 1], clamp),
                transform: `scale(${interpolate(p, [0, 1], [1.6, 1])}) rotate(${(i - 1) * 3 + (1 - p) * (i % 2 ? 15 : -15)}deg) translateY(${float(frame, 5, 40, i * 15)}px)`,
              }}
            >
              <Check size={78} color={tinta[i]} />
              {t}
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", top: 1330, left: 70, right: 70 }}>
        <Words text={content.diferenciais.rodape} start={66} size={70} weight={800} stagger={3} />
      </div>
    </AbsoluteFill>
  );
};

// ── 7. Chamada final ──
export const Cta: React.FC = () => {
  const frame = useCurrentFrame();
  const badge = usePop(4, 10);
  const zap = usePop(30, 9);
  const site = interpolate(frame, [46, 60], [0, 1], { ...clamp, easing: ease });
  const pulse = 1 + Math.max(0, Math.sin((frame - 60) / 7)) * 0.04 * (frame > 60 ? 1 : 0);
  return (
    <AbsoluteFill>
      <Bg from={c.acaiVivid} to={c.acaiDeep} seed="ct" berries={12} opacity={0.4} />
      <AbsoluteFill style={{ alignItems: "center", flexDirection: "column", paddingTop: 290, gap: 60 }}>
        <LogoBadge size={460} p={badge} frame={frame} />
        <Words text={content.cta.title} start={14} size={100} stagger={4} />
        <div style={{ transform: `scale(${zap * pulse})` }}>
          <Pill bg={c.whatsapp} size={70} style={{ padding: "30px 56px" }}>
            <WhatsIcon size={90} />
            {content.cta.whatsapp}
          </Pill>
        </div>
        <div style={{ textAlign: "center", opacity: site, transform: `translateY(${(1 - site) * 30}px)` }}>
          <div style={{ fontFamily: title, fontWeight: 800, fontSize: 52, color: c.orange }}>{content.cta.site}</div>
          <div style={{ fontFamily: body, fontWeight: 700, fontSize: 46, color: c.white, marginTop: 14, opacity: 0.9 }}>{content.cta.local}</div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
