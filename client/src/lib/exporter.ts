// LAZY MODULE: imports html-to-image. Only ever loaded with `import('@/lib/exporter')` when the user exports.

export function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body = ''] = dataUrl.split(',');
  const mime = /data:([^;]+)/.exec(head ?? '')?.[1] ?? 'image/png';
  const bin = atob(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/**
 * Render the off-screen branded card to a PNG data URL. Used as the cover image (page 1) of the
 * multi-page PDF report built in pdfReport.ts. Returns the data URL plus the pixel size it rendered at.
 */
export async function renderCoverPng(node: HTMLElement, width = 1080, height = 1350): Promise<{ dataUrl: string; width: number; height: number }> {
  const { toPng } = await import('html-to-image');
  if (document.fonts?.ready) await document.fonts.ready;
  const dataUrl = await toPng(node, { width, height, pixelRatio: 1, cacheBust: true, backgroundColor: '#050505' });
  return { dataUrl, width, height };
}

