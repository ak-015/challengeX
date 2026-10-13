import { ArtDefs, Banner, Bridge, Brazier, Castle, Chain, Cobbles, FogBand, Moon, ridgePath, Waterfall } from './art';
import { SceneStage } from './SceneStage';

/** Foggy valley of jagged cliffs, a huge gothic castle and a wet stone platform (reference image 3). 16:9 art. */
export function ValleyScene() {
  return (
    <SceneStage>
      <svg className="art" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
        <rect width="1600" height="900" fill="url(#sky)" />
        <g fill="#1a0306" opacity=".6">
          <ellipse cx="300" cy="80" rx="380" ry="46" />
          <ellipse cx="1300" cy="120" rx="360" ry="52" />
          <ellipse cx="800" cy="30" rx="480" ry="34" />
        </g>
        <Moon cx={1140} cy={215} r={100} />
        {/* distant mountains */}
        <path d={ridgePath(5, 0, 1600, 360, 120, 46, 900)} fill="#14060a" />
        {/* the great castle */}
        <Castle x={690} y={420} s={2.1} seed={12} towers={11} />
        <Castle x={140} y={455} s={1.25} seed={6} towers={7} />
        <FogBand y={330} h={150} speed={110} opacity={0.5} seed={2} />
        {/* mid cliffs, bridges, waterfalls */}
        <path d={ridgePath(8, 0, 1600, 450, 90, 38, 900)} fill="#0d0508" />
        <Bridge x={180} y={450} w={470} arches={5} h={64} />
        <Bridge x={1010} y={500} w={480} arches={5} h={64} />
        <Waterfall x={560} y={455} w={30} h={170} />
        <Waterfall x={600} y={455} w={22} h={150} />
        <Waterfall x={1280} y={505} w={26} h={150} />
        <FogBand y={440} h={180} speed={85} opacity={0.7} seed={4} />
        <path d={ridgePath(17, 0, 1600, 560, 70, 42, 900)} fill="#090305" />
        <FogBand y={520} h={200} speed={70} opacity={0.75} seed={7} />
        {/* foreground cliffs */}
        <path d={ridgePath(25, 0, 360, 470, 260, 40, 900)} fill="#050203" />
        <path d={ridgePath(31, 1240, 1600, 470, 260, 40, 900)} fill="#050203" />
        {/* wet stone platform */}
        <path d="M120 900 L360 650 H1240 L1480 900 Z" fill="url(#floor-grad)" />
        <Cobbles W={1600} y0={650} y1={900} vx={800} />
        <ellipse cx="800" cy="760" rx="520" ry="70" fill="url(#glow-red)" opacity=".45" />
        {/* pillars, banners, braziers, chains */}
        {[0, 1].map((side) => {
          const px = side === 0 ? 70 : 1530;
          return (
            <g key={side}>
              <rect x={px - 70} y="0" width="140" height="900" fill="url(#stone)" opacity=".95" />
              <rect x={px - 70} y="0" width="140" height="900" fill="url(#blocks)" />
              <Banner x={px} y={90} w={96} h={290} delay={side * 1.2} />
              <Brazier x={side === 0 ? 235 : 1365} y={640} s={1.3} delay={side * 0.4} />
              <Brazier x={side === 0 ? 340 : 1260} y={690} s={0.95} delay={0.7 + side * 0.3} />
            </g>
          );
        })}
        <Chain x1={235} y1={700} x2={340} y2={730} sag={26} />
        <Chain x1={1260} y1={730} x2={1365} y2={700} sag={26} />
        <FogBand y={700} h={200} speed={60} opacity={0.55} seed={9} />
      </svg>
    </SceneStage>
  );
}

export { ArtDefs };
