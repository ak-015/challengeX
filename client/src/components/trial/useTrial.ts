import { useCallback, useEffect, useReducer, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { isDone, isExtensionOffer } from '@/lib/apiTypes';
import { trials } from '@/lib/endpoints';
import { ApiError, friendlyMessage, isAbort, isRetryable } from '@/lib/errors';
import { initialTrialState, pendingOf, trialReducer } from '@/lib/trialLogic';
import { useOnline } from '@/hooks/useOnline';

/**
 * Drives one trial: resume, understanding edits, next question, answers (idempotent on the server),
 * and recovery from failures. State is never lost: the typed answer stays in the component until the server accepted it.
 */
export function useTrial(id: string) {
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(trialReducer, initialTrialState);
  const lock = useRef(false);
  const retryRef = useRef<(() => void) | null>(null);
  const extensionActionRef = useRef<(action: 'continue' | 'verdict') => void>(() => {});
  const stateRef = useRef(state);
  stateRef.current = state;
  const alive = useRef(true);
  const online = useOnline();

  const fail = useCallback((e: unknown, retry: () => void) => {
    if (isAbort(e) || !alive.current) return;
    retryRef.current = retry;
    dispatch({
      type: 'error',
      error: { message: friendlyMessage(e), retryable: isRetryable(e) || !(e instanceof ApiError), code: e instanceof ApiError ? e.code : 'UNKNOWN' },
    });
  }, []);

  const run = useCallback(async (fn: () => Promise<void>) => {
    if (lock.current) return; // double-submit impossible
    lock.current = true;
    try {
      await fn();
    } finally {
      lock.current = false;
    }
  }, []);

  /** Ask for the next question (the caller holds the lock). */
  const nextInner = useCallback(async (): Promise<void> => {
    const first = stateRef.current.qa.length === 0;
    dispatch({ type: 'clearError' });
    dispatch({ type: 'busy', busy: first ? 'scouting' : 'ponder' });
    try {
      const r = await trials.next(id);
      if (!alive.current) return;
      if (isDone(r)) {
        navigate(`/verdict/${id}`, { replace: true });
        return;
      }
      if (isExtensionOffer(r)) {
        dispatch({ type: 'extension-offer', response: r });
        return;
      }
      dispatch({ type: 'question', response: r });
    } catch (e) {
      fail(e, () => void run(nextInner));
    } finally {
      if (alive.current) dispatch({ type: 'busy', busy: null });
    }
  }, [id, navigate, fail, run]);

  // ---- load / resume
  useEffect(() => {
    alive.current = true;
    const ctrl = new AbortController();
    (async () => {
      try {
        const s = await trials.get(id, { signal: ctrl.signal });
        if (s.kind !== 'trial') return navigate('/history', { replace: true });
        if (s.status === 'complete') return navigate(`/verdict/${id}`, { replace: true });
        dispatch({ type: 'loaded', session: s });
        if (s.extension?.status === 'offered') return;
        const needsConfirm = s.qa.length === 0 && s.competitors === null;
        if (needsConfirm || pendingOf(s.qa)) return;
        if (s.interrogationDone) return navigate(`/verdict/${id}`, { replace: true });
        void run(nextInner); // answered, but the connection dropped before /next: continue without duplicating anything
      } catch (e) {
        fail(e, () => window.location.reload());
      }
    })();
    return () => {
      alive.current = false;
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ---- auto-retry once the connection returns
  useEffect(() => {
    if (online && stateRef.current.error?.code === 'NETWORK') retryRef.current?.();
  }, [online]);

  const begin = useCallback(() => {
    dispatch({ type: 'begin' });
    void run(nextInner);
  }, [run, nextInner]);

  const saveUnderstanding = useCallback(
    async (patch: { problem?: string; targetUsers?: string; proposedSolution?: string }) => {
      const r = await trials.patchUnderstanding(id, patch);
      dispatch({ type: 'understanding', value: r.understanding, title: r.title });
    },
    [id],
  );

  /** Send an answer (or skip), then fetch the next question. Resolves true when the server accepted the answer. */
  const answer = useCallback(
    async (text: string, skipped: boolean): Promise<boolean> => {
      const q = pendingOf(stateRef.current.qa);
      if (!q || lock.current) return false;
      let accepted = false;
      await run(async () => {
        dispatch({ type: 'clearError' });
        dispatch({ type: 'busy', busy: 'ponder' });
        try {
          const r = await trials.answer(id, skipped ? { questionId: q.id, skipped: true } : { questionId: q.id, answer: text });
          accepted = true;
          dispatch({ type: 'answered', questionId: q.id, answer: skipped ? null : text, skipped, skippedCount: r.skippedCount, assumptions: r.assumptions });
        } catch (e) {
          dispatch({ type: 'busy', busy: null });
          fail(e, () => void answer(text, skipped));
          return;
        }
        await nextInner();
      });
      return accepted;
    },
    [id, run, nextInner, fail],
  );

  const retry = useCallback(() => {
    dispatch({ type: 'clearError' });
    retryRef.current?.();
  }, []);

  const chooseExtension = useCallback(
    (action: 'continue' | 'verdict') => {
      void run(async () => {
        dispatch({ type: 'clearError' });
        dispatch({ type: 'busy', busy: 'ponder' });
        try {
          const response = await trials.extend(id, action);
          dispatch({ type: 'extension-resolved', response });
          if (response.done) navigate(`/verdict/${id}`, { replace: true });
          else await nextInner();
        } catch (e) {
          fail(e, () => extensionActionRef.current(action));
        } finally {
          if (alive.current) dispatch({ type: 'busy', busy: null });
        }
      });
    },
    [id, run, fail, nextInner, navigate],
  );
  extensionActionRef.current = chooseExtension;

  return { state, begin, saveUnderstanding, answer, retry, chooseExtension };
}
