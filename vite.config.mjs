import { defineConfig } from 'vite';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import fs from 'fs';
import http from 'http';
import https from 'https';
import { minify as terserMinify } from 'terser';
import * as esbuild from 'esbuild';

// Backend origin — single named constant, toggle this one line to point at the deployed
// backend instead of local dev. QPAIX's Spring Boot backend runs on port 8127 (not ind-fab's
// 8126) so both can run side by side on the same machine without a port clash.
const BACKEND_ORIGIN = 'http://localhost:8127';
const backendUrl = new URL(BACKEND_ORIGIN);
const backendClient = backendUrl.protocol === 'https:' ? https : http;

// Dynamically gather all HTML files (root + html/**) for multi-page bundling.
function collectHtmlFiles(dir, base = __dirname) {
  let results = {};
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) continue;
      Object.assign(results, collectHtmlFiles(full, base));
    } else if (entry.name.endsWith('.html')) {
      const relPath = full.slice(base.length + 1).replace(/\.html$/, '').replace(/[\\/]/g, '-');
      results[relPath || 'index'] = full;
    }
  }
  return results;
}

const inputOptions = {
  ...collectHtmlFiles(__dirname),
};
// Avoid double-counting root index.html plus any nested index.html files under html/.
if (fs.existsSync(resolve(__dirname, 'index.html'))) {
  inputOptions['index'] = resolve(__dirname, 'index.html');
}

// Clean-URL map — add an entry here every time a new top-level page is scaffolded under html/.
const cleanUrlMap = {
  '/': '/index.html',
  '/about': '/html/company/about-us.html',
  '/services': '/html/services/services.html',
  '/products': '/html/products/products.html',
  '/team': '/html/company/team.html',
  '/careers': '/html/company/careers.html',
  '/blog': '/html/blog/blog.html',
  '/faq': '/html/company/faq.html',
  '/contact': '/html/company/contact.html',
  '/privacy-policy': '/html/company/privacy-policy.html',
  '/login': '/html/company/login.html',
};

function vercelRewritesDev() {
  return {
    name: 'clean-url-dev',
    configureServer(server) {
      try {
        const directorSrc = 'C:/Users/aksha/.gemini/antigravity-ide/brain/675511c9-30ef-4b15-978f-b9616cd65351/.user_uploaded/media_1789567263812.jpg';
        const directorDest = resolve(__dirname, 'images/director.jpg');
        if (fs.existsSync(directorSrc)) {
          fs.copyFileSync(directorSrc, directorDest);
        }

        const teamDir = resolve(__dirname, 'images/team');
        if (!fs.existsSync(teamDir)) fs.mkdirSync(teamDir, { recursive: true });

        const teamFiles = [
          'heli.jpg', 'rinkal.jpg', 'sarang.jpg', 'hiten.jpg',
          'utsav.jpg', 'sawan-1.jpg', 'durgesh.jpg', 'nikunj.jpg',
          'alka.jpg', 'dev.jpg', 'darshan.jpg', 'avinash.jpg'
        ];

        teamFiles.forEach(file => {
          const destPath = resolve(teamDir, file);
          if (!fs.existsSync(destPath)) {
            https.get('https://www.qpaix.com/assets/Career/' + file, (res) => {
              if (res.statusCode === 200) {
                const fileStream = fs.createWriteStream(destPath);
                res.pipe(fileStream);
                fileStream.on('finish', () => {
                  fileStream.close();
                });
              }
            }).on('error', () => {});
          }
        });

        const clientsDir = resolve(__dirname, 'images/clients');
        if (!fs.existsSync(clientsDir)) fs.mkdirSync(clientsDir, { recursive: true });

        const clientFiles = [
          'our_partner_1.png',
          'our_partner_2.png',
          'our_partner_3.png',
          'our_partner_4.png',
          'our_partner_5.svg'
        ];

        clientFiles.forEach(file => {
          const destPath = resolve(clientsDir, file);
          https.get('https://www.qpaix.com/img/' + file, (res) => {
            if (res.statusCode === 200) {
              const fileStream = fs.createWriteStream(destPath);
              res.pipe(fileStream);
              fileStream.on('finish', () => {
                fileStream.close();
                // Overwrite legacy placeholder files
                if (file === 'our_partner_1.png') {
                  fs.copyFileSync(destPath, resolve(__dirname, 'images/client_logo1.png'));
                  fs.copyFileSync(destPath, resolve(__dirname, 'images/client_logo-1.png'));
                } else if (file === 'our_partner_2.png') {
                  fs.copyFileSync(destPath, resolve(__dirname, 'images/client_logo2.png'));
                  fs.copyFileSync(destPath, resolve(__dirname, 'images/client_logo-2.png'));
                } else if (file === 'our_partner_3.png') {
                  fs.copyFileSync(destPath, resolve(__dirname, 'images/client_logo3.png'));
                  fs.copyFileSync(destPath, resolve(__dirname, 'images/client_logo-3.png'));
                } else if (file === 'our_partner_4.png') {
                  fs.copyFileSync(destPath, resolve(__dirname, 'images/client_logo4.png'));
                  fs.copyFileSync(destPath, resolve(__dirname, 'images/client_logo-4.png'));
                } else if (file === 'our_partner_5.svg') {
                  fs.copyFileSync(destPath, resolve(__dirname, 'images/client_logo5.svg'));
                }
              });
            }
          }).on('error', (err) => {
            console.error('[Client Logo Download Error]', file, err.message);
          });
        });

        // Instant sync if files already exist on disk
        if (fs.existsSync(resolve(clientsDir, 'our_partner_1.png'))) {
          fs.copyFileSync(resolve(clientsDir, 'our_partner_1.png'), resolve(__dirname, 'images/client_logo1.png'));
          fs.copyFileSync(resolve(clientsDir, 'our_partner_1.png'), resolve(__dirname, 'images/client_logo-1.png'));
        }
        if (fs.existsSync(resolve(clientsDir, 'our_partner_2.png'))) {
          fs.copyFileSync(resolve(clientsDir, 'our_partner_2.png'), resolve(__dirname, 'images/client_logo2.png'));
          fs.copyFileSync(resolve(clientsDir, 'our_partner_2.png'), resolve(__dirname, 'images/client_logo-2.png'));
        }
        if (fs.existsSync(resolve(clientsDir, 'our_partner_3.png'))) {
          fs.copyFileSync(resolve(clientsDir, 'our_partner_3.png'), resolve(__dirname, 'images/client_logo3.png'));
          fs.copyFileSync(resolve(clientsDir, 'our_partner_3.png'), resolve(__dirname, 'images/client_logo-3.png'));
        }
        if (fs.existsSync(resolve(clientsDir, 'our_partner_4.png'))) {
          fs.copyFileSync(resolve(clientsDir, 'our_partner_4.png'), resolve(__dirname, 'images/client_logo4.png'));
          fs.copyFileSync(resolve(clientsDir, 'our_partner_4.png'), resolve(__dirname, 'images/client_logo-4.png'));
        }
        if (fs.existsSync(resolve(clientsDir, 'our_partner_5.svg'))) {
          fs.copyFileSync(resolve(clientsDir, 'our_partner_5.svg'), resolve(__dirname, 'images/client_logo5.svg'));
          fs.copyFileSync(resolve(clientsDir, 'our_partner_5.svg'), resolve(__dirname, 'images/client_logo5.png'));
          fs.copyFileSync(resolve(clientsDir, 'our_partner_5.svg'), resolve(__dirname, 'images/client_logo-5.png'));
        }
      } catch (e) {
        console.error('[Director/Team/Client Image Copy Error]', e);
      }

      server.middlewares.use((req, res, next) => {
        if (req.method === 'POST' && req.url === '/api/save-compressed-image') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const { filename, base64Data, width, height } = JSON.parse(body);
              const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
              const buffer = Buffer.from(cleanBase64, 'base64');
              const targetPath = resolve(__dirname, filename);
              fs.writeFileSync(targetPath, buffer);

              // SVG compression: create SVG embedding the compressed image
              const svgPath = targetPath.replace(/\.jpg$/, '.svg');
              const w = width || 600;
              const h = height || 650;
              const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" height="100%">\n  <image href="data:image/jpeg;base64,${cleanBase64}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"/>\n</svg>`;
              fs.writeFileSync(svgPath, svgContent, 'utf-8');

              const svgStats = fs.statSync(svgPath);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, jpgSize: buffer.length, svgSize: svgStats.size }));
            } catch (err) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        if (req.url.startsWith('/api') || req.url.startsWith('/admin')) return next();
        const url = new URL(req.url, `http://${req.headers.host}`);
        const pathname = url.pathname;

        if (cleanUrlMap[pathname]) {
          req.url = cleanUrlMap[pathname] + url.search;
          return next();
        }

        // Per-slug real static files (see PROJECT_STATUS.md's forty-fifth follow-up) take
        // priority: /services/<slug> and /products/<slug> now resolve to a genuine baked HTML
        // file for every currently-known offering, /careers/<slug> likewise for every currently-
        // known posting. Only a slug with no real file (a brand-new offering/posting not yet
        // baked, or one created after the last resync) falls through to the shared template —
        // this same real-file-first-then-shared-template order is also exactly what
        // PageHtmlGeneratorService's slug-to-file-path map on the backend must stay in sync with,
        // so extend both together whenever a new offering/career is added.
        if (pathname.startsWith('/services/') && fs.existsSync(resolve(__dirname, 'html' + pathname + '.html'))) {
          req.url = '/html' + pathname + '.html' + url.search;
          return next();
        }
        if (pathname.startsWith('/products/') && fs.existsSync(resolve(__dirname, 'html' + pathname + '.html'))) {
          req.url = '/html' + pathname + '.html' + url.search;
          return next();
        }
        if (pathname.startsWith('/careers/') && fs.existsSync(resolve(__dirname, 'html/company' + pathname.replace('/careers', '') + '.html'))) {
          req.url = '/html/company' + pathname.replace('/careers', '') + '.html' + url.search;
          return next();
        }

        // Shared-template routing for entity detail pages — fallback only, for any slug with no
        // real per-slug file yet; the template's own JS fetches the entity by slug from the
        // backend and fills the page client-side.
        if ((pathname.startsWith('/services/') || pathname.startsWith('/pages/services/')) && !fs.existsSync(resolve(__dirname, pathname.replace(/^\//, '')))) {
          req.url = '/html/services/template-offering.html' + url.search;
          return next();
        }
        if (pathname.startsWith('/products/') && !fs.existsSync(resolve(__dirname, pathname.replace(/^\//, '')))) {
          req.url = '/html/products/template-offering.html' + url.search;
          return next();
        }
        if (pathname.startsWith('/blog/') && !fs.existsSync(resolve(__dirname, pathname.replace(/^\//, '')))) {
          req.url = '/html/blog/template-post.html' + url.search;
          return next();
        }
        if (pathname.startsWith('/careers/') && !fs.existsSync(resolve(__dirname, pathname.replace(/^\//, '')))) {
          req.url = '/html/company/template-career.html' + url.search;
          return next();
        }

        next();
      });
    }
  };
}

export default defineConfig({
  server: {
    port: 5174,
    host: true,
    proxy: {
      '/api': { target: BACKEND_ORIGIN, changeOrigin: true, secure: false },
      '/admin': { target: BACKEND_ORIGIN, changeOrigin: true, secure: false },
    },
  },

  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
    rollupOptions: {
      input: inputOptions,
    },
  },

  plugins: [
    vercelRewritesDev(),
    {
      name: 'qpaix-anti-flash-inject',
      transformIndexHtml(html) {
        if (html.includes('qpaix-anti-flash.js')) return html;
        return html.replace(
          '</head>',
          '    <script src="/js/qpaix-anti-flash.js"></script>\n  </head>'
        );
      },
    },

    // ─── PREVIEW: Clean URLs + API proxy ─────────────────────────────────────
    {
      name: 'preview-server-setup',
      configurePreviewServer(server) {
        server.middlewares.use((req, res, next) => {
          const pathname = req.url.split('?')[0].split('#')[0];
          const query = req.url.includes('?') ? '?' + req.url.split('?')[1] : '';

          if (req.url.startsWith('/api/') || req.url.startsWith('/admin/')) {
            const options = {
              hostname: backendUrl.hostname,
              port: backendUrl.port || (backendUrl.protocol === 'https:' ? 443 : 80),
              path: req.url, method: req.method || 'GET',
              headers: {
                host: backendUrl.host,
                cookie: req.headers.cookie || '',
                'content-type': req.headers['content-type'] || '',
                'content-length': req.headers['content-length'] || ''
              },
              timeout: 5000
            };
            const backendReq = backendClient.request(options, (backendRes) => {
              res.writeHead(backendRes.statusCode, backendRes.headers);
              backendRes.pipe(res);
            });
            backendReq.on('error', () => {
              if (!res.headersSent) { res.statusCode = 503; res.end('{}'); }
            });
            backendReq.on('timeout', () => {
              backendReq.destroy();
              if (!res.headersSent) { res.statusCode = 503; res.end('{}'); }
            });
            req.pipe(backendReq);
            return;
          }

          if (cleanUrlMap[pathname]) {
            req.url = cleanUrlMap[pathname] + query;
            return next();
          }

          if (pathname !== '/' && !pathname.includes('.')) {
            req.url = pathname + '.html' + query;
            return next();
          }

          next();
        });
      }
    },

    viteStaticCopy({
      targets: [
        { src: 'images', dest: '.' },
        { src: 'webfonts', dest: '.' },
        { src: 'videos', dest: '.' },
        { src: 'css', dest: '.' },
        { src: 'js', dest: '.' },
        { src: 'html', dest: '.' },
        // vercel.json must sit at the deployed project root for Vercel to read its rewrites.
        { src: 'vercel.json', dest: '.' },
      ],
    }),

    // ─── PRODUCTION MINIFICATION ──────────────────────────────────────────────
    // viteStaticCopy() above copies js/ and css/ into dist/ verbatim — Vite's own bundler only
    // touches files that go through Rollup's module graph (the per-page HTML entries), not
    // statically-copied assets. Runs in closeBundle so it executes after viteStaticCopy's own
    // closeBundle has already placed files in dist/. Only touches dist/ — npm run dev keeps
    // serving fully readable source files.
    {
      name: 'minify-static-assets',
      apply: 'build',
      async closeBundle() {
        const jsDir = resolve(__dirname, 'dist', 'js');
        const cssDir = resolve(__dirname, 'dist', 'css');

        let jsBefore = 0, jsAfter = 0;
        if (fs.existsSync(jsDir)) {
          for (const file of fs.readdirSync(jsDir)) {
            if (!file.endsWith('.js') || file.endsWith('.min.js')) continue;
            const filePath = resolve(jsDir, file);
            const code = fs.readFileSync(filePath, 'utf8');
            jsBefore += Buffer.byteLength(code);
            try {
              const result = await terserMinify(code, { compress: true, mangle: true });
              if (result.code) {
                fs.writeFileSync(filePath, result.code);
                jsAfter += Buffer.byteLength(result.code);
              } else {
                jsAfter += Buffer.byteLength(code);
              }
            } catch (e) {
              console.warn(`[minify] Skipped ${file} (parse error, copied as-is): ${e.message.split('\n')[0]}`);
              jsAfter += Buffer.byteLength(code);
            }
          }
        }

        let cssBefore = 0, cssAfter = 0;
        if (fs.existsSync(cssDir)) {
          for (const file of fs.readdirSync(cssDir)) {
            if (!file.endsWith('.css') || file.endsWith('.min.css')) continue;
            const filePath = resolve(cssDir, file);
            const code = fs.readFileSync(filePath, 'utf8');
            cssBefore += Buffer.byteLength(code);
            try {
              const result = await esbuild.transform(code, { loader: 'css', minify: true });
              fs.writeFileSync(filePath, result.code);
              cssAfter += Buffer.byteLength(result.code);
            } catch (e) {
              console.warn(`[minify] Skipped ${file} (parse error, copied as-is): ${e.message.split('\n')[0]}`);
              cssAfter += Buffer.byteLength(code);
            }
          }
        }

        const fmt = (n) => (n / 1024).toFixed(1) + 'KB';
        console.log(`[minify] JS:  ${fmt(jsBefore)} -> ${fmt(jsAfter)}`);
        console.log(`[minify] CSS: ${fmt(cssBefore)} -> ${fmt(cssAfter)}`);
      },
    },
  ],
});
