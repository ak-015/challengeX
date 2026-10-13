import { lazy, Suspense, useState } from 'react';
import { RuneLogo } from '@/components/art/RuneLogo';
import { OtpInput } from '@/components/auth/OtpInput';
import { ChipInput } from '@/components/ideas/ChipInput';
import { MagicCircle } from '@/components/scenes/MagicCircle';
import { SceneBackdrop, type Scene } from '@/components/scenes/SceneBackdrop';
import { ProgressRunes } from '@/components/trial/ProgressRunes';
import { Avatar } from '@/components/ui/Avatar';
import { Button, ButtonLink } from '@/components/ui/Button';
import { CategoryTag } from '@/components/ui/CategoryTag';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ErrorPanel } from '@/components/ui/ErrorBoundary';
import { TextAreaField, TextField } from '@/components/ui/Fields';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Heading } from '@/components/ui/Heading';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { ForgeAnimation } from '@/components/verdict/ForgeAnimation';
import { Gauge } from '@/components/verdict/Gauge';
import { Radar } from '@/components/verdict/Radar';
import { VerdictBadge } from '@/components/verdict/VerdictBadge';
import { VerdictView } from '@/components/verdict/VerdictView';
import { radarScores } from '@/components/verdict/verdictData';
import type { QaEntry } from '@/lib/apiTypes';
import { CATEGORIES } from '@/lib/constants';
import { sampleGraph, sampleVerdict } from '@/lib/fixtures';

const RoadmapCanvas = lazy(() => import('@/components/roadmap/RoadmapCanvas'));
const ICONS: IconName[] = ['back', 'sound', 'mute', 'user', 'history', 'logout', 'eye', 'eyeOff', 'check', 'close', 'warning', 'retry', 'sword', 'bulb', 'map', 'scroll', 'plus', 'copy', 'download', 'share', 'trash', 'skull', 'gear', 'chart', 'people', 'coin', 'scale', 'expand', 'swords', 'shuffle', 'hammer', 'link', 'layers', 'flame', 'upload', 'image', 'edit', 'zoomIn', 'zoomOut', 'fit', 'star'];
const SCENES: Scene[] = ['gate', 'valley', 'altar', 'dim'];

const qa: QaEntry[] = CATEGORIES.map((c, i) => ({ id: `q${i}`, index: i + 1, category: c, text: 'x', answer: i === 2 ? null : 'a', skipped: i === 1, assessment: null })).slice(0, 4);

// DEV ONLY (/dev/kitchen-sink): every shared component and every scene in one place.
export function Component() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [scene, setScene] = useState<Scene>('valley');
  const [dimmed, setDimmed] = useState(false);
  const [code, setCode] = useState('');
  const [chips, setChips] = useState(['AI']);
  const [confirm, setConfirm] = useState(false);
  const [score, setScore] = useState(70);
  const v = sampleVerdict(score);

  return (
    <div className="safe-pad mx-auto max-w-5xl space-y-6 py-8">
      <Heading level={1}>Kitchen sink</Heading>

      <GlassPanel className="space-y-3 p-6">
        <Heading level={3}>Scenes (switch the backdrop)</Heading>
        <div className="flex flex-wrap gap-2">
          {SCENES.map((s) => (
            <Button key={s} size="sm" variant={scene === s ? 'primary' : 'ghost'} onClick={() => setScene(s)}>{s}</Button>
          ))}
          <label className="flex min-h-[44px] items-center gap-2 font-label text-sm text-ash"><input type="checkbox" checked={dimmed} onChange={(e) => setDimmed(e.target.checked)} /> altar dimmed</label>
        </div>
        <p className="text-sm text-ash-dim">The magic circle is the persistent shell layer (try /realm and /altar). Standalone copy:</p>
        <div className="mx-auto h-56 w-56"><MagicCircle className="h-full w-full" /></div>
      </GlassPanel>

      <GlassPanel className="space-y-4 p-6">
        <Heading level={3}>Buttons</Heading>
        <div className="flex flex-wrap gap-3">
          <Button>Primary</Button><Button variant="ghost">Ghost</Button><Button variant="quiet">Quiet</Button><Button variant="danger">Danger</Button><Button disabled>Disabled</Button>
          <Button loading={loading} onClick={() => (setLoading(true), setTimeout(() => setLoading(false), 1500))}>Loading</Button>
          <ButtonLink to="/realm" size="sm">Link</ButtonLink>
          <Button variant="ghost" onClick={() => setConfirm(true)}>Confirm dialog</Button>
        </div>
      </GlassPanel>

      <GlassPanel interactive className="space-y-4 p-6">
        <Heading level={3}>Fields (hover this panel for the neon pulse)</Heading>
        <TextField label="Email" placeholder="you@example.com" hint="We never share it." />
        <TextField label="Invalid" error="This field is required." />
        <TextAreaField label="Idea" value={text} onChange={(e) => setText(e.target.value)} counter={{ value: text.length, max: 2000 }} placeholder="An app that helps farmers predict crop disease." rows={3} />
        <OtpInput value={code} onChange={setCode} />
        <ChipInput label="Interests" values={chips} onChange={setChips} suggestions={['Health', 'Education', 'Climate']} />
      </GlassPanel>

      <GlassPanel className="space-y-4 p-6">
        <Heading level={3}>Icons, tags, progress</Heading>
        <div className="flex flex-wrap items-center gap-4 text-ash">
          {ICONS.map((n) => <span key={n} title={n}><Icon name={n} size={26} /></span>)}
          <RuneLogo size={48} /><Avatar name="Vedat" size={44} /><Spinner size={26} />
        </div>
        <div className="flex flex-wrap gap-2">{CATEGORIES.map((c) => <CategoryTag key={c} category={c} />)}</div>
        <ProgressRunes qa={qa} plannedTotal={7} />
      </GlassPanel>

      <GlassPanel className="space-y-4 p-6">
        <Heading level={3}>Gauge, badge, radar (server fixtures)</Heading>
        <div className="flex flex-wrap gap-2">
          {[39, 40, 69, 70].map((s) => <Button key={s} size="sm" variant={score === s ? 'primary' : 'ghost'} onClick={() => setScore(s)}>{s}</Button>)}
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <Gauge score={score} verdict={v.verdict} key={score} />
          <VerdictBadge verdict={v.verdict} stamp key={`b${score}`} />
          <Radar scores={radarScores(v)} key={`r${score}`} size={300} />
        </div>
      </GlassPanel>

      <GlassPanel className="p-6"><Heading level={3}>Forge</Heading><div className="mt-4"><ForgeAnimation /></div></GlassPanel>
      <GlassPanel className="p-6"><Heading level={3}>Error panel</Heading><ErrorPanel message="Example error." onRetry={() => undefined} /></GlassPanel>

      <section>
        <Heading level={3}>Full verdict view</Heading>
        <VerdictView data={v} animate={false} actions={<Button>Action</Button>} />
      </section>

      <section>
        <Heading level={3}>24-node roadmap</Heading>
        <Suspense fallback={<Spinner />}><RoadmapCanvas graph={sampleGraph()} /></Suspense>
      </section>

      {confirm && <ConfirmDialog title="Delete?" message="This is a sample." onConfirm={() => setConfirm(false)} onCancel={() => setConfirm(false)} />}
      <SceneBackdrop scene={scene} dimmed={dimmed} />
    </div>
  );
}
