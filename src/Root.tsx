import { Composition, Folder } from "remotion";
import { JOBS } from "./jobs.generated";
import { propsSchema, type VideoProps } from "./core/schema";
import { DEMO } from "./template/demo";
import { Video, calculateMetadata } from "./template/Video";
import { ACAI_MG_DURATION, AcaiMg } from "./acai-mg/AcaiMg";
import { CMS_TIS_DURATION, CmsTis } from "./cms/CmsTis";
import { CMS_TIS_V2_DURATION, CmsTisV2 } from "./cms-v2/CmsTisV2";
import { CMS_TIS_V4_DURATION, CmsTisV4 } from "./cms-v4/CmsTisV4";
import { Intro } from "./Intro";
import { ClosingScene } from "./scenes/ClosingScene";
import { FeatureScene } from "./scenes/FeatureScene";
import { OpeningScene } from "./scenes/OpeningScene";

const fid = (f: string) => f.replace(":", "x");
const lid = (l: string) => l.toLowerCase().replace(/[^a-z0-9]+/g, "-");

export const RemotionRoot = () => {
  return (
    <>
      {/* Gerador: a composição "Video" recebe qualquer job resolvido (é a que o pnpm video render usa). */}
      <Composition
        id="Video"
        component={Video}
        schema={propsSchema}
        calculateMetadata={calculateMetadata}
        defaultProps={(JOBS[0]?.props ?? DEMO) as VideoProps}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
      />
      <Folder name="Jobs">
        {JOBS.map((j) => (
          <Folder key={`${j.slug}-${j.lang}`} name={`${j.slug}-${lid(j.lang)}`}>
            {j.formats.map((f) => (
              <Composition
                key={f}
                id={`${j.slug}-${fid(f)}-${lid(j.lang)}`}
                component={Video}
                schema={propsSchema}
                calculateMetadata={calculateMetadata}
                defaultProps={{ ...j.props, format: f }}
                durationInFrames={300}
                fps={30}
                width={1920}
                height={1080}
              />
            ))}
          </Folder>
        ))}
      </Folder>
      <Folder name="Legado">
      <Composition
        id="AcaiMg"
        component={AcaiMg}
        durationInFrames={ACAI_MG_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="CmsTisV4"
        component={CmsTisV4}
        durationInFrames={CMS_TIS_V4_DURATION}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="CmsTis"
        component={CmsTis}
        durationInFrames={CMS_TIS_DURATION}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="CmsTisV2"
        component={CmsTisV2}
        durationInFrames={CMS_TIS_V2_DURATION}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Intro"
        component={Intro}
        durationInFrames={262}
        fps={30}
        width={1920}
        height={1080}
      />
      </Folder>
      <Folder name="Scenes">
        <Composition
          id="Opening"
          component={OpeningScene}
          durationInFrames={90}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{ title: "Remotion", subtitle: "Motion graphics com React", accentColor: "#ff5a36" }}
        />
        <Composition
          id="Feature"
          component={FeatureScene}
          durationInFrames={120}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{ heading: "Vídeo como código", stat: 60, statLabel: "fps, frame a frame", accentColor: "#ff5a36" }}
        />
        <Composition
          id="Closing"
          component={ClosingScene}
          durationInFrames={90}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{ cta: "Bora renderizar", url: "marcuswd.dev", accentColor: "#ff5a36" }}
        />
      </Folder>
    </>
  );
};
