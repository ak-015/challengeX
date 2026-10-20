import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Swords, Zap, Users, Skull, Gauge } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { errorMessage } from '@/services/api';
import { trialsService } from '@/services/trials';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Form';
import { MODES, RISK_CATEGORIES } from '@/types/api';
import type { ModeKey } from '@/types/api';
import { Embers } from '@/components/animations/Atmosphere';

const MAX_IDEA = 1000;

const modeIcons: Record<ModeKey, typeof Swords> = {
  stress_test: Swords,
  brutal: Skull,
  '100x': Zap,
  competitor: Users,
  failure: Gauge,
};

export function ChallengeNewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { push } = useToast();
  // "Challenge This Idea" on the generator page hands its text over via router state.
  const prefill = (location.state as { idea?: string } | null)?.idea ?? '';
  const [idea, setIdea] = useState(prefill.slice(0, MAX_IDEA));
  const [mode, setMode] = useState<ModeKey>('stress_test');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = idea.trim();

  const submit = async () => {
    if (trimmed.length < 20) {
      setError('Describe your idea in at least 20 characters.');
      return;
    }
    if (trimmed.length > MAX_IDEA) {
      setError(`Idea must be at most ${MAX_IDEA} characters.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const trial = await trialsService.create(trimmed, mode);
      push('success', 'Trial created. Face the clarification step.');
      navigate(`/challenge/${trial.id}/clarify`, { state: { trial } });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative mx-auto max-w-3xl overflow-hidden">
      <Embers count={8} />
      <header className="mb-8">
        <h1 className="font-display text-3xl sm:text-4xl text-parchment">Challenge My Idea</h1>
        <p className="mt-2 font-narrative text-lg text-parchment-dim italic">
          Lay your idea on the anvil. Choose how hard the hammer falls.
        </p>
      </header>

      <div className="gothic-panel p-6 sm:p-8 space-y-8">
        <Textarea
          label="Your Idea"
          required
          maxLength={MAX_IDEA}
          placeholder="Describe the business or project idea you want to test…"
          hint={`${trimmed.length}/${MAX_IDEA} characters (minimum 20)`}
          error={
            error && error.toLowerCase().includes('character')
              ? error
              : undefined
          }
          value={idea}
          onChange={(e) => {
            setIdea(e.target.value);
            if (error) setError(null);
          }}
        />

        <fieldset>
          <legend className="text-sm font-heading text-parchment-dim mb-3">
            Intensity <span className="text-crimson-glow" aria-hidden>*</span>
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Trial intensity">
            {(Object.keys(MODES) as ModeKey[]).map((key) => {
              const Icon = modeIcons[key];
              const active = mode === key;
              return (
                <label
                  key={key}
                  className={`relative flex items-start gap-3 rounded-md border p-4 cursor-pointer transition-all ${
                    active
                      ? 'border-[var(--border-visible)] bg-crimson-soft shadow-crimson-sm'
                      : 'border-[var(--border-subtle)] bg-surface-elevated hover:bg-surface-hover'
                  } ${key === 'stress_test' ? 'sm:col-span-2' : ''}`}
                >
                  <input
                    type="radio"
                    name="mode"
                    value={key}
                    checked={active}
                    onChange={() => setMode(key)}
                    className="sr-only"
                    aria-label={MODES[key].label}
                  />
                  <span className={`mt-0.5 ${active ? 'text-crimson-glow' : 'text-parchment-faint'}`}>
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="flex-1">
                    <span className="block font-heading text-sm tracking-widest uppercase text-parchment">
                      {MODES[key].label}
                      {active && <span className="ml-2 text-crimson-glow" aria-hidden>●</span>}
                    </span>
                    <span className="mt-1 block text-sm text-parchment-dim font-body leading-snug">
                      {MODES[key].directive}
                    </span>
                  </span>
                  {active && (
                    <motion.span
                      layoutId="mode-marker"
                      className="absolute right-3 top-3 h-2 w-2 rounded-full bg-crimson-glow shadow-crimson-sm"
                      aria-hidden
                    />
                  )}
                </label>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-parchment-faint" aria-live="polite">
            Selected intensity: <span className="text-parchment-dim">{MODES[mode].label}</span> — covers:{' '}
            {RISK_CATEGORIES.join(', ')}.
          </p>
        </fieldset>

        {error && !error.toLowerCase().includes('character') && (
          <div role="alert" className="rounded-md border border-red-800/60 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={submit} loading={busy} className="w-full sm:w-auto">
            <Swords className="h-4 w-4" aria-hidden />
            Begin the Trial
          </Button>
        </div>
      </div>
    </div>
  );
}
