import { Composition, Folder } from "remotion";
import { JOBS } from "./jobs.generated";
import { propsSchema, type VideoProps } from "./core/schema";
import { DEMO } from "./template/demo";
import { Video, calculateMetadata } from "./template/Video";

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
    </>
  );
};
