import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig, type PluginOption } from 'vite';

// Heavy libraries get their own named chunks so the bundle report can prove they are NOT in the initial load.
function manualChunks(id: string): string | undefined {
  if (!id.includes('node_modules')) return undefined;
  if (/node_modules\/(react|react-dom|scheduler|react-router|react-router-dom|@remix-run)\//.test(id)) return 'react';
  if (/node_modules\/framer-motion\//.test(id)) return 'framer';
  if (/node_modules\/(@xyflow|@dagrejs|d3-[a-z-]+|classcat)\//.test(id)) return 'vendor-flow';
  if (/node_modules\/(jspdf|html-to-image|fflate|fast-png|iobuffer|canvg|html2canvas|dompurify|core-js)\//.test(id)) return 'vendor-export';
  return undefined;
}

export default defineConfig(async () => {
  const plugins: PluginOption[] = [react()];
  if (process.env.ANALYZE) {
    const { visualizer } = await import('rollup-plugin-visualizer');
    plugins.push(
      visualizer({ filename: 'dist/stats.html', gzipSize: true, brotliSize: true, template: 'treemap' }) as PluginOption,
    );
  }
  return {
    plugins,
    resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
    build: {
      target: 'es2020',
      sourcemap: false,
      chunkSizeWarningLimit: 600,
      rollupOptions: { output: { manualChunks } },
    },
    server: { port: 5173 },
  };
});
