import { Gauge } from './Gauge';
import { Radar } from './Radar';
import { VerdictBadge } from './VerdictBadge';
import { radarScores, type VerdictData } from './verdictData';
import { MODES, VERDICT_STYLE } from '@/lib/constants';

/** Off-screen branded 1080x1350 high-contrast card. Inline sizes only so html-to-image renders it exactly. */
export function ExportCard({ data }: { data: VerdictData }) {
  const st = VERDICT_STYLE[data.verdict];
  const top = data.struggles.slice(0, 3);
  const exp = data.validationExperiment;
  return (
    <div style={{ width: 1080, height: 1350, background: '#050505', color: '#f5efe9', padding: 56, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 24, border: '6px solid #c4121f', fontFamily: 'Georgia, serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'Cinzel, serif' }}>
        <span style={{ fontSize: 26, letterSpacing: 6, color: '#ff8a93', fontWeight: 700 }}>CHALLENGEX</span>
        <span style={{ fontSize: 22, color: '#d9d2cb' }}>{data.mode ? MODES[data.mode].label : ''}</span>
      </div>
      <div style={{ fontFamily: 'Cinzel Decorative, Cinzel, serif', fontSize: 44, fontWeight: 700, lineHeight: 1.15, color: '#ffffff' }}>{data.title}</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
        <Gauge score={data.totalScore} verdict={data.verdict} animate={false} size={300} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
          <VerdictBadge verdict={data.verdict} />
          <div style={{ color: st.text, fontFamily: 'Cinzel, serif', fontSize: 26 }}>{st.blurb}</div>
          <div style={{ fontSize: 22, lineHeight: 1.4, color: '#e8e2dc' }}>{data.summary.slice(0, 260)}</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: -6 }}>
        <Radar scores={radarScores(data)} animate={false} size={420} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        {top.map((s, i) => (
          <div key={i} style={{ border: '2px solid #7a2a30', borderRadius: 8, padding: 14, background: '#14080a' }}>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: 20, fontWeight: 700, color: '#ff8a93', marginBottom: 6 }}>{s.title}</div>
            <div style={{ fontSize: 17, lineHeight: 1.35, color: '#e8e2dc' }}>{s.why.slice(0, 120)}</div>
          </div>
        ))}
      </div>

      {exp && (
        <div style={{ border: '2px solid #b9b0a8', borderRadius: 8, padding: 16, background: '#0c0607' }}>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 20, fontWeight: 700, color: '#ffd27a', marginBottom: 6 }}>CHEAPEST VALIDATION EXPERIMENT</div>
          <div style={{ fontSize: 19, lineHeight: 1.35, color: '#f5efe9' }}>{exp.description.slice(0, 190)}</div>
          <div style={{ fontSize: 17, marginTop: 8, color: '#d9d2cb' }}>
            Build if: {exp.buildIf.slice(0, 60)} · Kill if: {exp.killIf.slice(0, 60)}
          </div>
        </div>
      )}

      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', fontFamily: 'Cinzel, serif', fontSize: 22, color: '#ff8a93', borderTop: '2px solid #7a0a12', paddingTop: 14 }}>
        <span>Challenge your idea. Prove it. Build it.</span>
        <span style={{ fontWeight: 700, letterSpacing: 3 }}>CHALLENGEX</span>
      </div>
    </div>
  );
}
