/** Remove <think> blocks and code-fence markers that reasoning models love to emit. */
export function stripNoise(text: string): string {
  let t = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
  const closing = t.toLowerCase().lastIndexOf('</think>');
  if (closing >= 0) t = t.slice(closing + '</think>'.length);
  t = t.replace(/<\/?think>/gi, '');
  t = t.replace(/```(?:json|JSON)?/g, '');
  return t;
}

function findBalancedEnd(s: string, start: number): number {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** Returns the first balanced, parseable {...} object found in the text. */
export function extractJsonObject(text: string): unknown {
  const t = stripNoise(text);
  let start = t.indexOf('{');
  while (start >= 0) {
    const end = findBalancedEnd(t, start);
    if (end >= 0) {
      try {
        return JSON.parse(t.slice(start, end + 1));
      } catch {
        /* try the next opening brace */
      }
    }
    start = t.indexOf('{', start + 1);
  }
  throw new Error('No valid JSON object found in the reply');
}
