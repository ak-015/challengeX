import { useFx } from '@/store/sceneFxStore';
import { Banner, Brazier, Bridge, Castle, Chain, FogBand, Moon, ridgePath, Statue, Waterfall } from './art';
import { SceneStage } from './SceneStage';

function Candles({ x, y, n = 3 }: { x: number; y: number; n?: number }) {
  return (
    <g>
      {Array.from({ length: n }, (_, i) => (
        <g key={i} transform={`translate(${x + i * 16} ${y - (i % 2) * 6})`}>
          <rect x="-4" y="0" width="8" height="22" fill="#e8dcd2" opacity=".85" />
          <g className="flame" style={{ animationDelay: `${i * 0.3}s` }}>
            <path d="M0 -14 C4 -8 5 -3 0 0 C-5 -3 -4 -8 0 -14Z" fill="url(#flame-grad)" />
          </g>
          <circle cy="-6" r="12" fill="url(#glow-red)" opacity=".6" />
        </g>
      ))}
    </g>
  );
}

/** Gothic stone hall between two huge arches, with a dais, rune steps and a floating crystal (reference image 1). */
export function AltarScene() {
  const phase = useFx((s) => s.altarPhase);
  return (
    <SceneStage>
      <svg className="art" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false" data-altar-phase={phase}>
        <rect width="1600" height="900" fill="url(#sky)" />
        <Moon cx={730} cy={120} r={62} />
        <path d={ridgePath(4, 300, 1300, 380, 90, 36, 900)} fill="#12050a" />
        <Castle x={470} y={330} s={1.15} seed={3} towers={8} />
        <Castle x={1030} y={350} s={1.3} seed={14} towers={9} />
        <Bridge x={520} y={330} w={420} arches={5} h={56} />
        <Waterfall x={1010} y={400} w={24} h={130} />
        <FogBand y={380} h={200} speed={90} opacity={0.65} seed={21} />
        <FogBand y={480} h={220} speed={65} opacity={0.7} seed={22} />

        {/* the two huge arches (frame) */}
        <path d="M0 0 H1600 V900 H0 Z M330 900 V330 Q330 40 800 -10 Q1270 40 1270 330 V900 Z" fill="#070304" fillRule="evenodd" />
        <path d="M0 0 H1600 V900 H0 Z M330 900 V330 Q330 40 800 -10 Q1270 40 1270 330 V900 Z" fill="url(#blocks)" fillRule="evenodd" opacity=".9" />
        <path d="M330 900 V330 Q330 40 800 -10 Q1270 40 1270 330 V900" fill="none" stroke="#ff2a3a" strokeWidth="2" opacity=".35" />
        {/* banners, statues, hanging braziers */}
        <Banner x={165} y={60} w={110} h={330} delay={0.4} />
        <Banner x={1435} y={60} w={110} h={330} delay={1.4} />
        <Statue x={60} y={640} s={1.05} />
        <Statue x={290} y={620} s={0.82} />
        <Statue x={1540} y={640} s={1.05} />
        <Statue x={1310} y={620} s={0.82} />
        <Chain x1={90} y1={0} x2={90} y2={150} sag={4} />
        <Brazier x={90} y={190} s={1.0} delay={0.2} />
        <Chain x1={1510} y1={0} x2={1510} y2={150} sag={4} />
        <Brazier x={1510} y={190} s={1.0} delay={0.9} />
        <Brazier x={60} y={800} s={1.2} delay={0.5} />
        <Brazier x={1540} y={800} s={1.2} delay={1.1} />

        {/* floor */}
        <rect y="700" width="1600" height="200" fill="url(#floor-grad)" />
        <ellipse cx="800" cy="800" rx="700" ry="90" fill="url(#glow-red)" opacity=".35" />

        {/* DAIS */}
        <g className="altar-dais">
          <path d="M470 560 V700 A330 70 0 0 0 1130 700 V560 Z" fill="url(#stone)" stroke="#2a1a18" strokeWidth="2" />
          <path d="M470 560 V700 A330 70 0 0 0 1130 700 V560 Z" fill="url(#blocks)" />
          <ellipse cx="800" cy="560" rx="330" ry="70" fill="#150c0d" stroke="#4a3430" strokeWidth="2" />
          <ellipse cx="800" cy="560" rx="300" ry="58" fill="none" stroke="#ff2a3a" strokeWidth="1.4" opacity=".4" />
          {/* glowing vertical rune line on the front */}
          <rect x="797" y="580" width="6" height="128" fill="#ff2f3f" opacity=".85" />
          <path d="M800 610 l14 14 -14 14 -14 -14z" fill="none" stroke="#ff6a76" strokeWidth="2" />
          <Chain x1={430} y1={640} x2={470} y2={680} sag={14} />
          <Chain x1={1170} y1={640} x2={1130} y2={680} sag={14} />
          <Candles x={420} y={705} />
          <Candles x={1140} y={705} />
          <Candles x={600} y={780} n={2} />
          <Candles x={1000} y={780} n={2} />
          {/* steps (each lights its runes one by one) */}
          <g>
            {[0, 1, 2].map((i) => (
              <g key={i} className="altar-step">
                <path d={`M${590 - i * 40} ${720 + i * 24} H${1010 + i * 40} V${742 + i * 24} H${590 - i * 40} Z`} fill="#1a1211" stroke="#3a2a28" />
                <g className="altar-step-rune" fill="none" stroke="#ff4a58" strokeWidth="2">
                  {[-1, 0, 1].map((k) => (
                    <path key={k} d={`M${800 + k * 130 - 8} ${731 + i * 24} l8 -6 8 6 -8 6z`} />
                  ))}
                </g>
              </g>
            ))}
          </g>
        </g>

        {/* crystal in its claw holder + vertical beam */}
        <g className="altar-crystal">
          <rect className="altar-beam" x="794" y="0" width="12" height="540" fill="url(#beam-v)" />
          <ellipse cx="800" cy="540" rx="120" ry="28" fill="url(#glow-red)" />
          <path d="M740 568 Q750 520 780 548 Q790 560 800 556 Q810 560 820 548 Q850 520 860 568 Q830 576 800 574 Q770 576 740 568Z" fill="#120a0b" stroke="#3a2a28" strokeWidth="1.5" />
          <path d="M800 468 L838 516 L800 582 L762 516 Z" fill="#ff2a3a" stroke="#ffb0b8" strokeWidth="1.5" />
          <path d="M800 468 L838 516 L800 516 Z M800 516 L762 516 L800 582 Z" fill="#ff7a86" opacity=".55" />
          <circle cx="800" cy="520" r="70" fill="url(#glow-red)" className="pulse-opacity" />
        </g>
        <FogBand y={760} h={140} speed={60} opacity={0.55} seed={30} />
      </svg>
    </SceneStage>
  );
}
