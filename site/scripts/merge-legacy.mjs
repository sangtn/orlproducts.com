// After `astro build`: copy the hand-written site (repo root) into dist/, write sitemap.xml,
// then check SEO basics on every page. Pages Astro generated must pass; legacy pages only warn.
import { cpSync, existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = 'https://orlproducts.com';
const siteDir = fileURLToPath(new URL('..', import.meta.url));
const root = join(siteDir, '..');
const dist = join(siteDir, 'dist');

// Repo-root entries that are tooling, not website
const SKIP = new Set(['site', 'tools', '.git', '.github', '.claude', '.vercel', 'node_modules', 'ui-system.html',
  '.gitignore', '.vercelignore', 'vercel.json', 'package.json', 'package-lock.json', 'sitemap.xml', '.DS_Store']);

const walk = (dir) => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : [p];
});

// 1. Pages Astro produced (these win over a legacy file with the same name)
const generated = new Set(walk(dist).filter((f) => f.endsWith('.html')).map((f) => relative(dist, f)));

// 2. Copy the legacy site
let copied = 0;
for (const name of readdirSync(root)) {
  if (SKIP.has(name) || name.startsWith('.')) continue;
  const src = join(root, name);
  const dst = join(dist, name);
  if (statSync(src).isDirectory()) {
    cpSync(src, dst, { recursive: true, force: false, errorOnExist: false, filter: (s) => !s.endsWith('.DS_Store') });
  } else if (!existsSync(dst)) {
    cpSync(src, dst);
  } else continue;
  copied++;
}

// 3. sitemap.xml: lastmod comes from app data for generated app pages, and from the previous sitemap for legacy pages
const oldSitemap = existsSync(join(root, 'sitemap.xml')) ? readFileSync(join(root, 'sitemap.xml'), 'utf8') : '';
const oldLastmod = Object.fromEntries([...oldSitemap.matchAll(/<loc>([^<]+)<\/loc><lastmod>([^<]+)<\/lastmod>/g)].map((m) => [m[1], m[2]]));
const appData = Object.fromEntries(readdirSync(join(siteDir, 'src/data/apps')).map((f) => {
  const a = JSON.parse(readFileSync(join(siteDir, 'src/data/apps', f), 'utf8'));
  return [`${a.slug}.html`, a.appStore?.updated];
}));
const pages = walk(dist).filter((f) => f.endsWith('.html')).map((f) => relative(dist, f))
  .filter((p) => p !== '404.html' && !/^google[0-9a-f]+\.html$/.test(p) && !p.includes('/'))
  .sort((a, b) => (a === 'index.html' ? -1 : b === 'index.html' ? 1 : a.localeCompare(b)));
const urls = pages.map((p) => {
  const loc = p === 'index.html' ? `${SITE}/` : `${SITE}/${p}`;
  const lastmod = (generated.has(p) && appData[p]) || oldLastmod[loc];
  return `  <url><loc>${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`;
});
writeFileSync(join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);

// 4. SEO checks
const errors = [], warnings = [];
const titles = new Map(), descs = new Map();
for (const p of pages) {
  const html = readFileSync(join(dist, p), 'utf8');
  const head = html.slice(0, html.search(/<\/head>/i));
  const report = generated.has(p) ? errors : warnings;
  const decode = (s) => s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n)).replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  const title = decode(head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').trim();
  const desc = decode(head.match(/<meta name="description"[^>]*content="([^"]*)"/i)?.[1] ?? '');
  const canon = head.match(/<link rel="canonical" href="([^"]*)"/i)?.[1] ?? '';
  const h1s = (html.replace(/<svg[\s\S]*?<\/svg>/gi, '').match(/<h1[\s>]/gi) ?? []).length;
  if (!title) report.push(`${p}: missing <title>`);
  else if (title.length > 70) report.push(`${p}: title is ${title.length} characters (keep under 70)`);
  if (!desc) report.push(`${p}: missing meta description`);
  else if (desc.length < 70 || desc.length > 160) report.push(`${p}: description is ${desc.length} characters (keep 70-160)`);
  if (!canon.startsWith(`${SITE}/`)) report.push(`${p}: canonical is "${canon}"`);
  if (h1s !== 1) report.push(`${p}: ${h1s} <h1> elements`);
  for (const [, json] of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)) {
    try { JSON.parse(json); } catch { report.push(`${p}: invalid JSON-LD`); }
  }
  if (title) titles.set(title, [...(titles.get(title) ?? []), p]);
  if (desc) descs.set(desc, [...(descs.get(desc) ?? []), p]);
}
for (const [t, ps] of titles) if (ps.length > 1) errors.push(`duplicate title "${t}" on ${ps.join(', ')}`);
for (const [, ps] of descs) if (ps.length > 1) errors.push(`duplicate description on ${ps.join(', ')}`);

console.log(`merge-legacy: ${generated.size} generated pages, ${copied} legacy entries copied, ${pages.length} URLs in sitemap.xml`);
for (const w of warnings) console.warn(`  warning (legacy page): ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`  ERROR: ${e}`);
  process.exit(1);
}
console.log('  SEO checks passed for generated pages');
