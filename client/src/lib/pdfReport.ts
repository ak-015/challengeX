// LAZY MODULE (imports jspdf). Builds a complete, multi-page PDF report for a verdict or a roadmap.
// The content model (Block[] + verdictBlocks/roadmapBlocks) is pure and unit-tested; only the
// renderers touch jsPDF / the DOM. Page 1 is an optional branded cover image; the rest is full text.
import { CATEGORIES, CATEGORY_LABEL, MODES, STAGE_STYLE, VERDICT_STYLE, type DecisionField } from './constants';
import type { Graph } from './apiTypes';
import type { VerdictData } from '@/components/verdict/verdictData';

// ------------------------------------------------------------------ content model (pure)

export type Block =
  | { t: 'h1'; text: string }
  | { t: 'h2'; text: string }
  | { t: 'h3'; text: string }
  | { t: 'p'; text: string }
  | { t: 'label'; k: string; v: string }
  | { t: 'bullet'; text: string }
  | { t: 'badge'; text: string; rgb: [number, number, number] }
  | { t: 'space' };

const hexRgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const nonEmpty = (s: unknown): s is string => typeof s === 'string' && s.trim().length > 0;

/** Nodes in recommended/normal walk order from the start, then any leftover (alternate-only) nodes. */
export function orderedRecommendedPath(graph: Graph): string[] {
  const hasIn = new Set(graph.edges.map((e) => e.to));
  const start = graph.nodes.find((n) => !hasIn.has(n.id));
  const out = new Map<string, string[]>();
  for (const e of graph.edges) if (e.kind !== 'alternate') out.set(e.from, [...(out.get(e.from) ?? []), e.to]);
  const order: string[] = [];
  const seen = new Set<string>();
  const dfs = (id: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    order.push(id);
    for (const t of out.get(id) ?? []) dfs(t);
  };
  if (start) dfs(start.id);
  for (const n of graph.nodes) if (!seen.has(n.id)) order.push(n.id);
  return order;
}

/** Full verdict detail — every generated field, nothing truncated. */
export function verdictBlocks(data: VerdictData): Block[] {
  const b: Block[] = [{ t: 'h1', text: data.title }];
  const modeLabel = data.mode ? MODES[data.mode].label : 'Trial';
  b.push({ t: 'label', k: 'Mode', v: modeLabel });
  b.push({ t: 'label', k: 'Score', v: `${data.totalScore}/100` });
  b.push({ t: 'badge', text: VERDICT_STYLE[data.verdict].label, rgb: hexRgb(VERDICT_STYLE[data.verdict].ring) });
  b.push({ t: 'p', text: VERDICT_STYLE[data.verdict].blurb });

  b.push({ t: 'h2', text: 'Summary' });
  b.push({ t: 'p', text: data.summary });
  if (data.lowConfidence) {
    b.push({ t: 'p', text: `Low confidence:${data.skippedCount !== undefined ? ` you skipped ${data.skippedCount} questions` : ' several questions were skipped'}, so this verdict rests on less evidence.` });
  }

  const u = data.understanding;
  if (u && (nonEmpty(u.problem) || nonEmpty(u.targetUsers) || nonEmpty(u.proposedSolution))) {
    b.push({ t: 'h2', text: 'The idea' });
    if (nonEmpty(u.problem)) b.push({ t: 'label', k: 'Problem', v: u.problem });
    if (nonEmpty(u.targetUsers)) b.push({ t: 'label', k: 'Target users', v: u.targetUsers });
    if (nonEmpty(u.proposedSolution)) b.push({ t: 'label', k: 'Proposed solution', v: u.proposedSolution });
  }

  b.push({ t: 'h2', text: 'The seven risk areas' });
  for (const c of CATEGORIES) {
    const cs = data.categoryScores?.[c];
    if (!cs) continue;
    const penalty = cs.penalty > 0 ? ` (−${cs.penalty.toFixed(1)} for skipped questions)` : '';
    b.push({ t: 'label', k: `${CATEGORY_LABEL[c]} — ${cs.finalScore.toFixed(1)}/10${penalty}`, v: cs.rationale });
  }

  b.push({ t: 'h2', text: 'Where you’ll struggle' });
  data.struggles.forEach((s, i) => {
    b.push({ t: 'h3', text: `${i + 1}. ${s.title}` });
    b.push({ t: 'label', k: 'Area', v: CATEGORY_LABEL[s.category] ?? s.category });
    b.push({ t: 'p', text: s.why });
    b.push({ t: 'label', k: s.answerExcerpt === 'skipped' ? 'You skipped this' : 'You said', v: s.answerExcerpt === 'skipped' ? 'skipped' : `“${s.answerExcerpt}”` });
  });

  b.push({ t: 'h2', text: 'How to overcome them' });
  data.fixes.forEach((f) => {
    const target = data.struggles[f.struggleIndex]?.title ?? `struggle ${f.struggleIndex + 1}`;
    b.push({ t: 'h3', text: `For: ${target}` });
    b.push({ t: 'label', k: 'Effort', v: f.effort });
    b.push({ t: 'p', text: f.action });
  });

  b.push({ t: 'h2', text: 'Alternative directions' });
  data.alternatives.forEach((a) => {
    b.push({ t: 'h3', text: a.title });
    b.push({ t: 'p', text: a.pitch });
    b.push({ t: 'label', k: 'What changes', v: a.whatChanges });
  });

  if (data.validationExperiment) {
    const e = data.validationExperiment;
    b.push({ t: 'h2', text: 'Cheapest validation experiment' });
    b.push({ t: 'p', text: e.description });
    b.push({ t: 'label', k: 'Metric', v: e.metric });
    b.push({ t: 'label', k: 'Sample size', v: e.sampleSize });
    b.push({ t: 'label', k: 'Duration', v: `${e.durationDays} days` });
    b.push({ t: 'label', k: 'Build if', v: e.buildIf });
    b.push({ t: 'label', k: 'Pivot if', v: e.pivotIf });
    b.push({ t: 'label', k: 'Kill if', v: e.killIf });
  }

  if (data.competitors.length > 0) {
    b.push({ t: 'h2', text: 'The rivals' });
    for (const c of data.competitors) {
      b.push({ t: 'h3', text: c.name });
      b.push({ t: 'label', k: 'Source', v: c.source === 'search' ? 'From search' : 'AI estimate, verify' });
      b.push({ t: 'p', text: c.whatTheyDo });
      b.push({ t: 'label', k: 'Why it matters', v: c.whyItMatters });
      if (nonEmpty(c.url)) b.push({ t: 'label', k: 'Link', v: c.url });
    }
  }
  return b;
}


const DECISION_LABEL: Record<DecisionField, string> = {
  techStack: 'Tech stack',
  marketing: 'Marketing',
  team: 'Team',
  timeline: 'Timeline',
  budget: 'Budget',
  platform: 'Platform',
};

/** Full roadmap detail — every node with description, deliverables, difficulty notes and better paths. */
export function roadmapBlocks(o: { title: string; graph: Graph; input?: Record<string, unknown>; undecided?: DecisionField[] }): Block[] {
  const { graph, input, undecided } = o;
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const b: Block[] = [{ t: 'h1', text: o.title }];

  b.push({ t: 'h2', text: 'Legend' });
  b.push({ t: 'bullet', text: 'Edges — Recommended (chosen), Alternate (a different route), Normal (next step).' });
  b.push({ t: 'bullet', text: 'Difficulty — Easy, Medium, Hard.' });
  b.push({ t: 'bullet', text: 'Diamonds are decisions; steps flow left to right, top to bottom.' });

  const choices = (['techStack', 'marketing', 'team', 'timeline', 'budget', 'platform', 'extra'] as const).filter((k) => nonEmpty(input?.[k]));
  if (choices.length > 0 || (undecided && undecided.length > 0)) {
    b.push({ t: 'h2', text: 'Your choices' });
    for (const k of choices) b.push({ t: 'label', k: (DECISION_LABEL as Record<string, string>)[k] ?? k, v: String(input?.[k] ?? '') });
    if (undecided && undecided.length > 0) {
      b.push({ t: 'label', k: 'Left to the roadmap', v: undecided.map((f) => DECISION_LABEL[f] ?? f).join(', ') });
    }
  }

  b.push({ t: 'h2', text: 'Every step' });
  for (const id of orderedRecommendedPath(graph)) {
    const n = byId.get(id);
    if (!n) continue;
    b.push({ t: 'h3', text: `${n.title} · ${STAGE_STYLE[n.stage].label} · ${n.type}` });
    b.push({ t: 'label', k: 'Difficulty', v: n.difficulty });
    if (nonEmpty(n.durationEstimate)) b.push({ t: 'label', k: 'Duration', v: n.durationEstimate });
    b.push({ t: 'p', text: n.description });
    if (n.deliverables.length > 0) for (const d of n.deliverables) b.push({ t: 'bullet', text: d });
    if (nonEmpty(n.difficultyNote)) b.push({ t: 'label', k: 'Why this is hard', v: n.difficultyNote });
    if (nonEmpty(n.betterPath)) b.push({ t: 'label', k: 'Suggested better path', v: byId.get(n.betterPath)?.title ?? n.betterPath });
    if (nonEmpty(n.decisionField)) b.push({ t: 'label', k: 'Decides', v: DECISION_LABEL[n.decisionField as DecisionField] ?? String(n.decisionField) });
  }

  const alternates = graph.edges.filter((e) => e.kind === 'alternate');
  if (alternates.length > 0) {
    b.push({ t: 'h2', text: 'Branches & alternate directions' });
    for (const e of alternates) {
      const from = byId.get(e.from)?.title ?? e.from;
      const to = byId.get(e.to)?.title ?? e.to;
      b.push({ t: 'bullet', text: `${from} → ${to}${nonEmpty(e.label) ? ` (${e.label})` : ''}` });
    }
  }
  return b;
}


// ------------------------------------------------------------------ jsPDF rendering (lazy)

const PAGE = { w: 595.28, h: 841.89 }; // A4 portrait, points
const M = 44; // margin
const MAXW = PAGE.w - M * 2;
const BOTTOM = PAGE.h - 54; // leave room for the footer
const INK: [number, number, number] = [26, 22, 24];
const MUTED: [number, number, number] = [120, 112, 108];
const CRIMSON: [number, number, number] = [196, 18, 31];
const RULE: [number, number, number] = [214, 205, 198];

interface Pdf {
  setFillColor: (r: number, g: number, b: number) => void;
  setTextColor: (r: number, g: number, b: number) => void;
  setDrawColor: (r: number, g: number, b: number) => void;
  setFontSize: (n: number) => void;
  setFont: (family: string, style: string) => void;
  text: (t: string, x: number, y: number, opts?: { maxWidth?: number }) => void;
  splitTextToSize: (t: string, w: number) => string[];
  getTextWidth: (t: string) => number;
  rect: (x: number, y: number, w: number, h: number, style: string) => void;
  roundedRect: (x: number, y: number, w: number, h: number, rx: number, ry: number, style: string) => void;
  line: (x1: number, y1: number, x2: number, y2: number) => void;
  addPage: () => void;
  addImage: (data: string, fmt: string, x: number, y: number, w: number, h: number) => void;
  getNumberOfPages: () => number;
  setPage: (n: number) => void;
  output: (type: 'blob') => Blob;
}

/** Draw a Block[] as flowing text with automatic page breaks + per-page header/footer. */
function drawBlocks(doc: Pdf, blocks: Block[], heading: string): void {
  let y = M;
  const pageNo = () => doc.getNumberOfPages();

  const header = () => {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...CRIMSON);
    doc.text('CHALLENGEX', M, M - 14);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED);
    doc.text(heading, PAGE.w - M, M - 14, { maxWidth: MAXW - 140 });
    doc.setDrawColor(...RULE);
    doc.line(M, M - 8, PAGE.w - M, M - 8);
  };

  const footer = () => {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED);
    doc.text('ChallengeX · Challenge your idea. Prove it. Build it.', M, PAGE.h - 24);
    doc.text(`Page ${pageNo()}`, PAGE.w - M, PAGE.h - 24);
  };

  const newline = (needed: number) => {
    if (y + needed > BOTTOM) {
      footer();
      doc.addPage();
      header();
      y = M;
    }
  };

  const para = (text: string, size: number, gapAfter: number, color: [number, number, number], indent = 0) => {
    doc.setFontSize(size);
    doc.setTextColor(...color);
    for (const ln of doc.splitTextToSize(text, MAXW - indent)) {
      newline(size * 1.32);
      doc.text(ln, M + indent, y);
      y += size * 1.32;
    }
    y += gapAfter;
  };


  header();
  for (const blk of blocks) {
    switch (blk.t) {
      case 'h1':
        para(blk.text, 22, 8, INK);
        break;
      case 'h2': {
        newline(26);
        y += 6;
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...CRIMSON);
        for (const ln of doc.splitTextToSize(blk.text, MAXW)) {
          newline(18);
          doc.text(ln, M, y);
          y += 18;
        }
        doc.setDrawColor(...CRIMSON);
        doc.line(M, y - 4, PAGE.w - M, y - 4);
        y += 6;
        break;
      }
      case 'h3':
        newline(20);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...INK);
        for (const ln of doc.splitTextToSize(blk.text, MAXW)) {
          newline(15);
          doc.text(ln, M, y);
          y += 15;
        }
        y += 2;
        break;
      case 'p':
        para(blk.text, 10, 4, INK);
        break;
      case 'label': {
        const keyW = Math.min(doc.getTextWidth(`${blk.k}:`), MAXW * 0.5);
        doc.setFontSize(10);
        newline(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...MUTED);
        doc.text(`${blk.k}:`, M, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...INK);
        const valueLines = doc.splitTextToSize(blk.v, MAXW - keyW);
        doc.text(valueLines[0] ?? '', M + keyW, y);
        y += 13;
        for (let i = 1; i < valueLines.length; i++) {
          newline(13);
          doc.text(valueLines[i] as string, M + keyW, y);
          y += 13;
        }
        y += 2;
        break;
      }
      case 'bullet': {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...INK);
        doc.text('•', M + 4, y);
        for (const ln of doc.splitTextToSize(blk.text, MAXW - 16)) {
          newline(13);
          doc.text(ln, M + 16, y);
          y += 13;
        }
        y += 2;
        break;
      }
      case 'badge': {
        newline(26);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        const w = doc.getTextWidth(blk.text) + 22;
        doc.setFillColor(...blk.rgb);
        doc.roundedRect(M, y - 10, w, 22, 5, 5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text(blk.text, M + 11, y + 5);
        y += 30;
        break;
      }
      case 'space':
        y += 10;
        break;
    }
  }
  footer();
}

/** Render the branded cover card (a PNG data URL) as page 1, then the detail pages that follow. */
async function withCover(doc: Pdf, coverDataUrl: string, coverW: number, coverH: number): Promise<void> {
  const scale = Math.min(MAXW / coverW, (BOTTOM - M) / coverH);
  doc.addImage(coverDataUrl, 'PNG', M + (MAXW - coverW * scale) / 2, M, coverW * scale, coverH * scale);
  doc.addPage();
}

export async function verdictPdf(data: VerdictData, coverDataUrl: string, coverSize: { w: number; h: number }): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: [PAGE.w, PAGE.h] }) as unknown as Pdf;
  await withCover(doc, coverDataUrl, coverSize.w, coverSize.h);
  drawBlocks(doc, verdictBlocks(data), 'Verdict report');
  return doc.output('blob');
}

export async function roadmapPdf(o: { title: string; graph: Graph; input?: Record<string, unknown>; undecided?: DecisionField[] }, coverDataUrl: string, coverSize: { w: number; h: number }): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: [PAGE.w, PAGE.h] }) as unknown as Pdf;
  await withCover(doc, coverDataUrl, coverSize.w, coverSize.h);
  drawBlocks(doc, roadmapBlocks(o), 'Roadmap report');
  return doc.output('blob');
}

