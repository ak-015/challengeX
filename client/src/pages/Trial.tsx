import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { m } from 'framer-motion';
import { RuneLogo } from '@/components/art/RuneLogo';
import { AssumptionMap } from '@/components/trial/AssumptionMap';
import { ExtensionCard } from '@/components/trial/ExtensionCard';
import { ProgressRunes } from '@/components/trial/ProgressRunes';
import { UnderstandingCard } from '@/components/trial/UnderstandingCard';
import { useTrial } from '@/components/trial/useTrial';
import { Button } from '@/components/ui/Button';
import { CategoryTag } from '@/components/ui/CategoryTag';
import { TextAreaField } from '@/components/ui/Fields';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useReducedMotion } from '@/hooks/useMedia';
import { MAX_ANSWER_CHARS } from '@/lib/constants';
import { pendingOf } from '@/lib/trialLogic';

export function Component() {
  const { id = '' } = useParams();
  const { state, begin, saveUnderstanding, answer, retry, chooseExtension } = useTrial(id);
  useDocumentTitle(state.title || 'The Trial');
  const reduced = useReducedMotion();

  const [draft, setDraft] = useState('');
  const [confirmSkip, setConfirmSkip] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const pending = pendingOf(state.qa);
  const busy = state.busy !== null;
  const sidebarCount = state.assumptions.length;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'end' });
  }, [state.qa.length, state.busy, state.error, reduced]);

  useEffect(() => {
    setConfirmSkip(false);
  }, [pending?.id]);

  const submit = async () => {
    const text = draft.trim();
    if (!text || busy || !pending) return;
    const ok = await answer(text, false);
    if (ok) setDraft(''); // cleared only after the server accepted it
  };
  const doSkip = async () => {
    setConfirmSkip(false);
    await answer('', true);
  };
  const onSkipClick = () => {
    if (state.skippedCount >= 3) setConfirmSkip(true); // the 4th skip lowers confidence
    else void doSkip();
  };

  if (state.phase === 'loading') {
    return (
      <div className="safe-pad mx-auto max-w-xl py-16 text-center">
        {state.error ? (
          <GlassPanel role="alert" className="space-y-4 p-6">
            <p className="font-prose text-ash">{state.error.message}</p>
            <Button onClick={retry}>
              <Icon name="retry" size={16} /> Retry
            </Button>
          </GlassPanel>
        ) : (
          <p role="status" className="inline-flex items-center gap-3 font-label text-ash">
            <Spinner /> Opening the trial…
          </p>
        )}
      </div>
    );
  }

  if (state.phase === 'understanding' && state.understanding) {
    return (
      <div className="safe-pad mx-auto flex min-h-[calc(100dvh-56px)] max-w-2xl items-center py-6">
        <div className="w-full">
          <UnderstandingCard understanding={state.understanding} onSave={saveUnderstanding} onBegin={begin} busy={busy} />
          {state.error && (
            <p role="alert" className="mt-3 flex flex-wrap items-center justify-center gap-3 rounded border border-[#ff6b76] bg-[#2a0408] p-3 text-sm text-ash">
              {state.error.message}
              <Button size="sm" variant="ghost" onClick={retry}>
                <Icon name="retry" size={16} /> Retry
              </Button>
            </p>
          )}
        </div>
      </div>
    );
  }

  if (state.phase === 'extension' && state.extension?.status === 'offered') {
    return (
      <div className="safe-pad mx-auto flex min-h-[calc(100dvh-56px)] max-w-3xl flex-col justify-center gap-5 py-6">
        <GlassPanel className="p-4" corners={false}>
          <ProgressRunes qa={state.qa} plannedTotal={state.progress.plannedTotal} />
        </GlassPanel>
        <ExtensionCard
          extension={state.extension}
          busy={busy}
          error={state.error}
          onContinue={() => chooseExtension('continue')}
          onVerdict={() => chooseExtension('verdict')}
          onRetry={retry}
        />
      </div>
    );
  }

  const sidebar = <AssumptionMap assumptions={state.assumptions} competitors={state.competitors} />;

  return (
    <div className="safe-pad mx-auto grid max-w-6xl gap-5 py-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section aria-label="The trial" className="flex min-h-[calc(100dvh-90px)] min-w-0 flex-col">
        <GlassPanel className="mb-3 p-4" corners={false}>
          <ProgressRunes qa={state.qa} plannedTotal={state.progress.plannedTotal} />
        </GlassPanel>

        <div role="log" aria-live="polite" aria-relevant="additions" className="scroll-thin flex-1 space-y-5 pb-4">
          {state.qa.map((q) => (
            <div key={q.id} className="space-y-3">
              <m.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3">
                <span className="mt-1 shrink-0 rounded-full border border-crimson bg-black p-0.5">
                  <RuneLogo size={36} />
                </span>
                <div className={`min-w-0 max-w-[92%] rounded-lg border p-4 ${pending?.id === q.id ? 'border-crimson-text bg-[rgba(30,6,9,0.9)]' : 'border-[rgba(185,176,168,0.35)] bg-[rgba(12,6,7,0.85)]'}`}>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <CategoryTag category={q.category} />
                    <span className="sr-only">Challenger, question {q.index}:</span>
                  </div>
                  <p className="font-label text-lg font-semibold leading-snug text-ash sm:text-xl">{q.text}</p>
                </div>
              </m.div>
              {(q.answer !== null || q.skipped) && (
                <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end">
                  <div className="max-w-[88%] rounded-lg border border-[#7a2a30] bg-[#2a0b0f] p-3">
                    <span className="sr-only">Your answer:</span>
                    {q.skipped ? <p className="font-prose italic text-ash-dim">Skipped</p> : <p className="whitespace-pre-wrap break-words font-prose text-ash">{q.answer}</p>}
                  </div>
                </m.div>
              )}
            </div>
          ))}

          {busy && (
            <p role="status" className="flex items-center gap-3 font-label text-ash">
              <Spinner /> {state.busy === 'scouting' ? 'Scouting the realm for rivals…' : 'The Challenger ponders…'}
            </p>
          )}
          {state.error && (
            <div role="alert" className="flex flex-wrap items-center gap-3 rounded border border-[#ff6b76] bg-[#2a0408] p-3 text-sm text-ash">
              <Icon name="warning" size={18} className="text-crimson-text" />
              <span className="min-w-0 flex-1">{state.error.message} Your answers are safe.</span>
              {state.error.retryable && (
                <Button size="sm" variant="ghost" onClick={retry}>
                  <Icon name="retry" size={16} /> Retry
                </Button>
              )}
            </div>
          )}
          <div ref={endRef} />
        </div>

        {pending && (
          <GlassPanel className="sticky bottom-2 z-20 space-y-3 p-4" corners={false}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
              className="space-y-3"
            >
              <TextAreaField
                label="Your answer"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    void submit();
                  }
                }}
                rows={3}
                maxLength={MAX_ANSWER_CHARS}
                counter={{ value: draft.length, max: MAX_ANSWER_CHARS }}
                hint="Ctrl/Cmd + Enter to send"
                disabled={busy}
              />
              {confirmSkip ? (
                <div role="alert" className="rounded border border-[#f2b84a] bg-[#2a1d05] p-3 text-sm text-ash">
                  <p>Skipping a 4th question lowers the confidence of your verdict. Skip anyway?</p>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="danger" onClick={() => void doSkip()}>
                      Skip anyway
                    </Button>
                    <Button size="sm" variant="quiet" onClick={() => setConfirmSkip(false)}>
                      Answer instead
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Button type="button" variant="quiet" size="sm" onClick={onSkipClick} disabled={busy}>
                    Skip this question
                  </Button>
                  <Button type="submit" loading={busy} disabled={!draft.trim()}>
                    Answer
                  </Button>
                </div>
              )}
            </form>
          </GlassPanel>
        )}
      </section>

      {/* desktop sidebar */}
      <aside aria-label="Assumption map" className="hidden lg:block">
        <GlassPanel className="scroll-thin sticky top-[72px] max-h-[calc(100dvh-90px)] overflow-y-auto p-4">
          <h2 className="mb-3 font-label text-base font-bold tracking-wide text-ash">Assumption Map</h2>
          {sidebar}
        </GlassPanel>
      </aside>

      {/* mobile drawer */}
      <div className="lg:hidden">
        <button type="button" className="btn fixed bottom-24 right-3 z-30 !rounded-full shadow-glow" onClick={() => setDrawer(true)} aria-haspopup="dialog">
          <Icon name="layers" size={18} /> Map
          <span className="ml-1 inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-white px-1.5 text-xs font-bold text-black" aria-label={`${sidebarCount} assumptions`}>
            {sidebarCount}
          </span>
        </button>
        {drawer && (
          <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Assumption map">
            <button type="button" aria-label="Close assumption map" className="absolute inset-0 bg-black/70" onClick={() => setDrawer(false)} />
            <m.div initial={{ y: '100%' }} animate={{ y: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }} className="glass scroll-thin absolute inset-x-0 bottom-0 max-h-[80dvh] overflow-y-auto rounded-b-none p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-label text-lg font-bold text-ash">Assumption Map</h2>
                <button type="button" className="inline-flex h-11 w-11 items-center justify-center text-ash" onClick={() => setDrawer(false)} aria-label="Close">
                  <Icon name="close" />
                </button>
              </div>
              {sidebar}
            </m.div>
          </div>
        )}
      </div>
    </div>
  );
}
