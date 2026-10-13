import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react';

const LEN = 6;

/** Six single-digit boxes: auto-advance, backspace to go back, paste a whole code. */
export function OtpInput({ value, onChange, disabled, autoFocus, invalid }: { value: string; onChange: (v: string) => void; disabled?: boolean; autoFocus?: boolean; invalid?: boolean }) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: LEN }, (_, i) => value[i] ?? '');

  const focus = (i: number) => refs.current[Math.max(0, Math.min(LEN - 1, i))]?.focus();
  const set = (i: number, d: string) => {
    const arr = [...digits];
    arr[i] = d;
    onChange(arr.join('').slice(0, LEN));
  };

  const onKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[i]) set(i, '');
      else if (i > 0) {
        set(i - 1, '');
        focus(i - 1);
      }
      e.preventDefault();
    } else if (e.key === 'ArrowLeft') focus(i - 1);
    else if (e.key === 'ArrowRight') focus(i + 1);
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, LEN);
    if (!text) return;
    e.preventDefault();
    onChange(text);
    focus(Math.min(text.length, LEN - 1));
  };

  return (
    <div role="group" aria-label="6-digit verification code" className="flex justify-center gap-2 sm:gap-3">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={d}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          aria-label={`Digit ${i + 1} of ${LEN}`}
          aria-invalid={invalid || undefined}
          className="field !w-11 !px-0 text-center font-label text-xl font-bold sm:!w-12"
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '').slice(-1);
            set(i, v);
            if (v) focus(i + 1);
          }}
          onKeyDown={(e) => onKeyDown(i, e)}
          onPaste={onPaste}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  );
}
