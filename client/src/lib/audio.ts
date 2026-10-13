// Gate/smoke sound, synthesized with the Web Audio API (no audio files).
// The AudioContext is created ONLY inside a user click, never when muted, and every node is cleaned up.
// All of it is wrapped in try/catch: an audio failure must never block navigation.
import { usePrefs } from '@/store/prefsStore';

export interface GateSound {
  /** Fade the master gain out, then clean up. */
  fadeOut: (ms?: number) => void;
  /** Immediate cleanup. */
  stop: () => void;
}

type ACtor = typeof AudioContext;

export function playGateSound(mode: 'gate' | 'smoke'): GateSound | null {
  if (usePrefs.getState().muted) return null; // the mute flag prevents creating the context at all
  try {
    const AC: ACtor | undefined = window.AudioContext ?? (window as unknown as { webkitAudioContext?: ACtor }).webkitAudioContext;
    if (!AC) return null;
    const ac = new AC();
    void ac.resume().catch(() => undefined);
    const t0 = ac.currentTime;
    const END = t0 + 2.8;

    const master = ac.createGain();
    master.gain.value = 0.85;
    master.connect(ac.destination);
    const nodes: AudioNode[] = [master];
    const sources: AudioScheduledSourceNode[] = [];

    // ---- rumble: brown noise -> low-pass, slow gain envelope
    const len = ac.sampleRate * 3;
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
    const rumble = ac.createBufferSource();
    rumble.buffer = buf;
    rumble.loop = true;
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 150;
    const rg = ac.createGain();
    rg.gain.setValueAtTime(0, t0);
    rg.gain.linearRampToValueAtTime(mode === 'smoke' ? 0.6 : 1.0, t0 + 0.5);
    rg.gain.setValueAtTime(mode === 'smoke' ? 0.6 : 1.0, t0 + 1.6);
    rg.gain.linearRampToValueAtTime(0, END);
    rumble.connect(lp);
    lp.connect(rg);
    rg.connect(master);
    nodes.push(lp, rg);
    sources.push(rumble);

    // ---- sub oscillator 40-60 Hz with a slow envelope
    const sub = ac.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(40, t0);
    sub.frequency.linearRampToValueAtTime(58, t0 + 1.5);
    sub.frequency.linearRampToValueAtTime(44, END);
    const sg = ac.createGain();
    sg.gain.setValueAtTime(0, t0);
    sg.gain.linearRampToValueAtTime(0.55, t0 + 0.6);
    sg.gain.linearRampToValueAtTime(0, END);
    sub.connect(sg);
    sg.connect(master);
    nodes.push(sg);
    sources.push(sub);

    // ---- whoosh: band-passed noise with a rising-then-falling sweep (gate); a soft hiss for smoke
    const wBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const wd = wBuf.getChannelData(0);
    for (let i = 0; i < wd.length; i++) wd[i] = Math.random() * 2 - 1;
    const whoosh = ac.createBufferSource();
    whoosh.buffer = wBuf;
    whoosh.loop = true;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = mode === 'smoke' ? 0.7 : 1.4;
    bp.frequency.setValueAtTime(300, t0 + 0.4);
    bp.frequency.exponentialRampToValueAtTime(mode === 'smoke' ? 1400 : 2600, t0 + 1.5);
    bp.frequency.exponentialRampToValueAtTime(500, END);
    const wg = ac.createGain();
    wg.gain.setValueAtTime(0, t0);
    wg.gain.setValueAtTime(0, t0 + 0.4);
    wg.gain.linearRampToValueAtTime(mode === 'smoke' ? 0.16 : 0.32, t0 + 1.4);
    wg.gain.linearRampToValueAtTime(0, END);
    whoosh.connect(bp);
    bp.connect(wg);
    wg.connect(master);
    nodes.push(bp, wg);
    sources.push(whoosh);

    for (const s of sources) s.start(t0);
    for (const s of sources) s.stop(END + 0.1);

    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      try {
        for (const s of sources) {
          try {
            s.stop();
          } catch {
            /* already stopped */
          }
          s.disconnect();
        }
        for (const n of nodes) n.disconnect();
        void ac.close().catch(() => undefined);
      } catch {
        /* ignore */
      }
    };
    sources[0]?.addEventListener('ended', cleanup);
    const safety = window.setTimeout(cleanup, 3600);

    return {
      fadeOut: (ms = 300) => {
        try {
          const now = ac.currentTime;
          master.gain.cancelScheduledValues(now);
          master.gain.setValueAtTime(master.gain.value, now);
          master.gain.linearRampToValueAtTime(0, now + ms / 1000);
          window.setTimeout(cleanup, ms + 60);
        } catch {
          cleanup();
        }
      },
      stop: () => {
        window.clearTimeout(safety);
        cleanup();
      },
    };
  } catch {
    return null;
  }
}
