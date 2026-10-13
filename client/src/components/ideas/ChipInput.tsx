import { useId, useState, type KeyboardEvent } from 'react';
import { Icon } from '@/components/ui/Icon';

/** Type and press Enter or comma to add a chip. Click a suggestion to add it. Duplicates are ignored. */
export function ChipInput({ label, values, onChange, suggestions = [], max = 12, hint }: { label: string; values: string[]; onChange: (v: string[]) => void; suggestions?: string[]; max?: number; hint?: string }) {
  const id = useId();
  const [text, setText] = useState('');

  const add = (raw: string) => {
    const v = raw.trim().slice(0, 60);
    if (!v || values.length >= max || values.some((x) => x.toLowerCase() === v.toLowerCase())) return;
    onChange([...values, v]);
  };
  const commit = () => {
    text.split(',').forEach(add);
    setText('');
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Backspace' && !text && values.length) onChange(values.slice(0, -1));
  };
  const unused = suggestions.filter((s) => !values.some((v) => v.toLowerCase() === s.toLowerCase())).slice(0, 8);

  return (
    <div>
      <label htmlFor={id} className="mb-1 block font-label text-sm font-semibold tracking-wide text-ash">
        {label}
      </label>
      <div className="rounded-md border border-[rgba(185,176,168,0.5)] bg-black/55 p-2 focus-within:border-crimson-text">
        <ul className="mb-1 flex flex-wrap gap-1.5" aria-label={`${label}: selected`}>
          {values.map((v) => (
            <li key={v} className="inline-flex items-center gap-1 rounded-full border border-crimson bg-[#3a0509] py-0.5 pl-3 pr-1 font-label text-sm text-ash">
              {v}
              <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-[rgba(255,255,255,0.1)]" aria-label={`Remove ${v}`} onClick={() => onChange(values.filter((x) => x !== v))}>
                <Icon name="close" size={14} />
              </button>
            </li>
          ))}
        </ul>
        <input id={id} className="min-h-[44px] w-full bg-transparent px-1 font-prose text-ash outline-none placeholder:text-ash-mute" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey} onBlur={commit} placeholder={values.length >= max ? `Up to ${max}` : 'Type and press Enter'} disabled={values.length >= max} maxLength={60} />
      </div>
      {hint && <p className="mt-1 text-sm text-ash-dim">{hint}</p>}
      {unused.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label={`${label}: suggestions`}>
          {unused.map((s) => (
            <button key={s} type="button" className="min-h-[36px] rounded-full border border-[rgba(185,176,168,0.5)] px-3 font-label text-xs text-ash hover:border-crimson-text" onClick={() => add(s)}>
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
