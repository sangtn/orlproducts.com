// Turn the client-side translations (assets/i18n/<set>.<lang>.json, applied by assets/js/orl-i18n.js)
// into real pages at /<lang>/<page>.html that search engines can index, with hreflang between them.
// The replacement rules mirror apply() in orl-i18n.js so the static page matches what visitors saw.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'node-html-parser';

const SITE = 'https://orlproducts.com';
const EMAIL = 'info@orlproducts.com';
const ATTRS = ['alt', 'content', 'title', 'placeholder', 'aria-label', 'src'];
const OG_LOCALE = { en: 'en_US', vi: 'vi_VN', ja: 'ja_JP', ko: 'ko_KR', es: 'es_ES', fr: 'fr_FR', de: 'de_DE', it: 'it_IT', 'pt-BR': 'pt_BR', 'zh-Hans': 'zh_CN', 'zh-Hant': 'zh_TW' };

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s) => esc(s).replace(/"/g, '&quot;');


const textOf = (h) => h.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();

/** Keep whole sentences up to max characters; cut at a word only when the first sentence alone is too long. */
function clampDescription(s, max = 158) {
  if (s.length <= max) return s;
  const sentences = s.match(/[^.!?。！？]+[.!?。！？]+["”」』)]?\s*/g) ?? [s];
  let out = '';
  for (const sen of sentences) { if ((out + sen).trim().length > max) break; out += sen; }
  out = out.trim();
  if (out.length >= 50) return out;
  const cut = s.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return (space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[,;:、，\s]+$/, '') + '…';
}

/** First paragraph of real text after the <h1>: the page's own translated introduction. */
function firstParagraph(root) {
  const h = root.toString();
  const rest = h.slice(Math.max(0, h.search(/<h1[\s>]/i)));
  for (const m of rest.matchAll(/<p[\s>][\s\S]*?<\/p>/gi)) {
    const t = textOf(m[0]);
    if (t.length > 40) return t;
  }
  return null;
}

/** Pages that load orl-i18n.js, with their translation set and the languages that have a JSON file. */
function findTranslatedPages(dist) {
  const out = [];
  for (const file of readdirSync(dist).filter((f) => f.endsWith('.html'))) {
    const html = readFileSync(join(dist, file), 'utf8');
    if (!html.includes('orl-i18n.js')) continue;
    const set = html.match(/data-i18n-page="([^"]+)"/)?.[1] ?? 'origamilearn';
    const langs = readdirSync(join(dist, 'assets/i18n'))
      .filter((f) => f.startsWith(`${set}.`) && f.endsWith('.json'))
      .map((f) => f.slice(set.length + 1, -5));
    if (langs.length) out.push({ file, set, langs, html });
  }
  return out;
}

/** Root-relative URL for an asset or page link, pointing page links at the same language when it exists. */
function rewriteUrl(value, lang, localized) {
  if (!value || /^(https?:|\/\/|\/|#|mailto:|tel:|data:|javascript:)/i.test(value)) return value;
  const clean = value.replace(/^\.\//, '');
  const page = clean.split(/[?#]/)[0];
  if (lang && localized.has(`${lang}/${page}`)) return `/${lang}/${clean}`;
  return `/${clean}`;
}

function applyDict(root, dict, contact) {
  for (const el of root.querySelectorAll('[data-i18n]')) {
    const v = dict[el.getAttribute('data-i18n')];
    if (typeof v !== 'string') continue;
    if (v.includes('%EMAIL%')) {
      const link = `<a href="${escAttr(contact)}"${/^https?:/i.test(contact) ? ' target="_blank" rel="noopener"' : ''}>${EMAIL}</a>`;
      el.set_content(v.split('%EMAIL%').map(esc).join(link));
    } else if (el.getAttribute('data-i18n-html') === 'keep') {
      el.set_content(v);
    } else {
      el.set_content(esc(v));
    }
  }
  for (const attr of ATTRS) {
    for (const el of root.querySelectorAll(`[data-i18n-${attr}]`)) {
      const v = dict[el.getAttribute(`data-i18n-${attr}`)];
      if (typeof v === 'string') el.setAttribute(attr, v);
    }
  }
  const title = root.querySelector('title');
  if (title && !title.hasAttribute('data-i18n') && typeof dict['meta.title'] === 'string') title.set_content(esc(dict['meta.title']));
}

function setHead(root, { url, lang, alternates }) {
  const head = root.querySelector('head');
  head.querySelectorAll('link[rel="alternate"][hreflang]').forEach((n) => n.remove());
  const canon = head.querySelector('link[rel="canonical"]');
  if (canon) canon.setAttribute('href', url);
  const ogUrl = head.querySelector('meta[property="og:url"]');
  if (ogUrl) ogUrl.setAttribute('content', url);
  head.querySelector('meta[property="og:locale"]')?.remove();
  const links = alternates.map(([l, u]) => `<link rel="alternate" hreflang="${l}" href="${u}">`).join('\n');
  head.insertAdjacentHTML('beforeend', `\n<meta property="og:locale" content="${OG_LOCALE[lang] ?? lang}">\n${links}\n`);
}

function markPicker(root, lang, urls) {
  const picker = root.querySelector('[data-lang-select]');
  if (picker) for (const o of picker.querySelectorAll('option')) {
    if (o.getAttribute('value') === lang) o.setAttribute('selected', ''); else o.removeAttribute('selected');
  }
  for (const a of root.querySelectorAll('[data-lang-option]')) {
    const l = a.getAttribute('data-lang-option');
    if (urls[l]) a.setAttribute('href', urls[l]);
    a.setAttribute('aria-current', l === lang ? 'true' : 'false');
  }
}

/** Writes /<lang>/<page>.html for every translation and adds hreflang to the English pages. Returns the new paths. */
export function prerenderTranslations(dist) {
  const pages = findTranslatedPages(dist);
  const localized = new Set(pages.flatMap((p) => p.langs.map((l) => `${l}/${p.file}`)));
  const written = [];
  for (const { file, set, langs, html } of pages) {
    const urls = { en: `${SITE}/${file}` };
    for (const l of langs) urls[l] = `${SITE}/${l}/${file}`;
    const alternates = [...Object.entries(urls), ['x-default', urls.en]];
    const enTitle = textOf(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '');
    const contact = html.match(/data-i18n-contact="([^"]+)"/)?.[1] ?? 'https://t.me/+MF4aYRoVeEJlMTVl';

    // English original: same content, plus hreflang and real picker links
    const en = parse(html, { comment: true });
    setHead(en, { url: urls.en, lang: 'en', alternates });
    markPicker(en, 'en', urls);
    writeFileSync(join(dist, file), en.toString());

    for (const lang of langs) {
      const dict = JSON.parse(readFileSync(join(dist, 'assets/i18n', `${set}.${lang}.json`), 'utf8'));
      const root = parse(html, { comment: true });
      applyDict(root, dict, contact);
      // Page-specific SEO text: the shared JSON key gives legal pages the landing page's
      // description and a bare "Support" title, which would repeat across apps and pages.
      const descEl = root.querySelector('meta[name="description"]');
      if (descEl) {
        let d = descEl.getAttribute('content') ?? '';
        if (file !== `${set}.html` && descEl.getAttribute('data-i18n-content') === 'meta.description') d = firstParagraph(root) ?? d;
        descEl.setAttribute('content', clampDescription(d));
        root.querySelector('meta[property="og:description"]')?.setAttribute('content', clampDescription(d));
      }
      const titleEl = root.querySelector('title');
      const appName = enTitle.includes(' — ') ? enTitle.split(' — ').pop() : null;
      if (titleEl && appName && file !== `${set}.html`) {
        const t = textOf(titleEl.innerHTML);
        const short = appName.split(':')[0].trim();
        if (!t.includes(short)) titleEl.set_content(esc(`${t} — ${(t + appName).length <= 62 ? appName : short}`));
      }
      const htmlEl = root.querySelector('html');
      htmlEl.setAttribute('lang', lang);
      htmlEl.setAttribute('data-i18n-static', lang);
      for (const el of root.querySelectorAll('[href],[src],[srcset],[poster]')) {
        for (const attr of ['href', 'src', 'poster']) {
          const v = el.getAttribute(attr);
          if (v) el.setAttribute(attr, rewriteUrl(v, lang, localized));
        }
        const ss = el.getAttribute('srcset');
        if (ss) el.setAttribute('srcset', ss.split(',').map((part) => {
          const [u, ...rest] = part.trim().split(/\s+/);
          return [rewriteUrl(u, null, localized), ...rest].join(' ');
        }).join(', '));
      }
      setHead(root, { url: urls[lang], lang, alternates });
      markPicker(root, lang, urls);
      mkdirSync(join(dist, lang), { recursive: true });
      writeFileSync(join(dist, lang, file), root.toString());
      written.push(`${lang}/${file}`);
    }
  }
  return written;
}

export const hasTranslations = (dist) => existsSync(join(dist, 'assets/i18n'));
