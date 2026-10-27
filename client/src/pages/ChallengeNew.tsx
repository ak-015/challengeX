import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Swords, Zap, Users, Skull, Gauge } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { errorMessage } from '@/services/api';
import { trialsService } from '@/services/trials';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Form';
import { MODES, RISK_CATEGORIES } from '@/types/api';
import type { ModeKey } from '@/types/api';
import { Embers } from '@/components/animations/Atmosphere';

const MAX_IDEA = 2000;

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

      <div className="trial-forge-panel space-y-5 rounded-lg p-5 sm:p-7">
        <div className="trial-idea-field">
          <Textarea
            label="Your Idea"
            required
            maxLength={MAX_IDEA}
            placeholder="Describe the business or project idea you want to test…"
            hint={`${trimmed.length}/${MAX_IDEA} characters (minimum 20)`}
            className="trial-answer-input"
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
        </div>

        <fieldset>
          <legend className="mb-2 font-display text-xs uppercase tracking-[0.16em] text-[#56372b]">
            Trial Intensity <span className="text-[#a20e1b]" aria-hidden>*</span>
          </legend>
          <div className="trial-mode-options" role="radiogroup" aria-label="Trial intensity">
            {(Object.keys(MODES) as ModeKey[]).map((key) => {
              const Icon = modeIcons[key];
              const active = mode === key;
              const label = key === 'stress_test' ? 'Stress Test' : `${MODES[key].label} Mode`;
              return (
                <label
                  key={key}
                  className={`trial-mode-option ${active ? 'is-selected' : ''}`}
                  title={MODES[key].directive}
                >
                  <input
                    type="radio"
                    name="mode"
                    value={key}
                    checked={active}
                    onChange={() => setMode(key)}
                    className="sr-only"
                    aria-label={`${label}: ${MODES[key].directive}`}
                  />
                  <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span>{label}</span>
                </label>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-[#694c3d]" aria-live="polite">
            Selected: <span className="font-semibold text-[#492c23]">{MODES[mode].label}</span> — covers:{' '}
            {RISK_CATEGORIES.join(', ')}.
          </p>
        </fieldset>

        {error && !error.toLowerCase().includes('character') && (
          <div role="alert" className="rounded-md border border-red-800/60 bg-red-950/90 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="flex justify-center pt-1">
          <Button onClick={submit} loading={busy} className="w-full sm:w-auto">
            <Swords className="h-4 w-4" aria-hidden />
            Begin the Trial
          </Button>
        </div>
      </div>
    </div>
  );
}
