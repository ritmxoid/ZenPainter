import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {build as viteBuild, defineConfig, Plugin} from 'vite';

function getLatestMtimeMs(targetPath: string): number {
  try {
    const stat = fs.statSync(targetPath);
    if (!stat.isDirectory()) return stat.mtimeMs;
    let max = stat.mtimeMs;
    for (const entry of fs.readdirSync(targetPath)) {
      const full = path.join(targetPath, entry);
      const m = getLatestMtimeMs(full);
      if (m > max) max = m;
    }
    return max;
  } catch {
    return 0;
  }
}

function singleFileOfflinePlugin(): Plugin {
  let pendingBuild: Promise<void> | null = null;

  return {
    name: 'single-file-offline',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const htmlAsset = bundle['index.html'];
      if (!htmlAsset || htmlAsset.type !== 'asset') return;

      let html = String(htmlAsset.source);

      // Remove any modulepreload links Vite might add
      html = html.replace(/<link[^>]+rel=["']modulepreload["'][^>]*>\s*/gi, '');

      for (const [fileName, item] of Object.entries(bundle)) {
        if (fileName.endsWith('.css') && item.type === 'asset') {
          const escaped = fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const linkRegex = new RegExp(
            `<link[^>]+href=["'][^"']*${escaped}["'][^>]*>`,
            'i'
          );
          if (linkRegex.test(html)) {
            const cssSource = String(item.source).replace(/<\/style/gi, '<\\/style');
            html = html.replace(linkRegex, () => `<style>${cssSource}</style>`);
            delete bundle[fileName];
          }
        } else if (fileName.endsWith('.js') && item.type === 'chunk' && item.isEntry) {
          const escaped = fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const scriptRegex = new RegExp(
            `<script[^>]+src=["'][^"']*${escaped}["'][^>]*>\\s*</script>\\s*`,
            'i'
          );
          if (scriptRegex.test(html)) {
            const safeCode = item.code.replace(/<\/script/gi, '<\\/script');
            html = html.replace(scriptRegex, '');
            if (html.includes('</body>')) {
              html = html.replace('</body>', () => `<script>${safeCode}</script>\n  </body>`);
            } else {
              html += `<script>${safeCode}</script>`;
            }
            delete bundle[fileName];
          }
        }
      }

      htmlAsset.source = html;
      this.emitFile({
        type: 'asset',
        fileName: 'bestpaint-offline.html',
        source: html,
      });
    },
    configureServer(server) {
      server.middlewares.use('/bestpaint-offline.html', async (_req, res, next) => {
        try {
          const rootDir = server.config.root || process.cwd();
          const distHtmlPath = path.join(rootDir, 'dist', 'index.html');
          const distStat = fs.existsSync(distHtmlPath) ? fs.statSync(distHtmlPath) : null;
          const srcMtime = Math.max(
            getLatestMtimeMs(path.join(rootDir, 'src')),
            getLatestMtimeMs(path.join(rootDir, 'index.html')),
            getLatestMtimeMs(path.join(rootDir, 'vite.config.ts'))
          );

          if (!distStat || srcMtime > distStat.mtimeMs) {
            if (!pendingBuild) {
              pendingBuild = (async () => {
                const prevNodeEnv = process.env.NODE_ENV;
                process.env.NODE_ENV = 'production';
                try {
                  await viteBuild({
                    root: rootDir,
                    configFile: path.join(rootDir, 'vite.config.ts'),
                    mode: 'production',
                    logLevel: 'silent',
                  });
                } finally {
                  process.env.NODE_ENV = prevNodeEnv;
                }
              })().finally(() => {
                pendingBuild = null;
              });
            }
            await pendingBuild;
          }

          const html = fs.readFileSync(distHtmlPath, 'utf-8');
          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.setHeader('Cache-Control', 'no-store');
          res.end(html);
        } catch (err) {
          next(err);
        }
      });
    },
  };
}

export default defineConfig(({command}) => {
  if (command === 'build') {
    process.env.NODE_ENV = 'production';
  }
  return {
    base: './',
    plugins: [react(), tailwindcss(), singleFileOfflinePlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      cssCodeSplit: false,
      assetsInlineLimit: 100000000,
      rollupOptions: {
        output: {
          format: 'iife' as const,
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
