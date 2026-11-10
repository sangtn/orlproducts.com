// Turn a store description (plain text with blank lines, ALL-CAPS headings and • bullets)
// into structured blocks the app page can render with real headings and lists.

export type Block =
  | { type: 'h'; text: string }
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] };

const BULLET = /^\s*[•\-–\*]\s+/;

function isHeading(line: string, hasMore: boolean): boolean {
  const t = line.trim();
  if (!t || t.length > 60 || /[.!?:,;]$/.test(t) || BULLET.test(t)) return false;
  if (/https?:\/\/|@[\w-]+\./.test(t)) return false; // a line with a link or an email is content, not a heading
  const letters = t.replace(/[^A-Za-z]/g, '');
  const allCaps = letters.length >= 3 && letters === letters.toUpperCase();
  return allCaps || (hasMore && t.split(/\s+/).length <= 7);
}

export function parseDescription(text: string): Block[] {
  const blocks: Block[] = [];
  for (const chunk of text.replace(/\r/g, '').split(/\n\s*\n/)) {
    const lines = chunk.split('\n').map((l) => l.trim()).filter(Boolean);
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (BULLET.test(line)) {
        const items: string[] = [];
        while (i < lines.length && BULLET.test(lines[i])) items.push(lines[i++].replace(BULLET, ''));
        blocks.push({ type: 'ul', items });
      } else if (isHeading(line, i + 1 < lines.length || lines.length === 1)) {
        blocks.push({ type: 'h', text: line });
        i++;
      } else {
        const para: string[] = [];
        const hasLink = (l: string) => /https?:\/\/|@[\w-]+\./.test(l);
        // A line with a link (Privacy Policy: …, Terms of Use: …) stands on its own
        while (i < lines.length && !BULLET.test(lines[i]) && !(para.length && (hasLink(lines[i]) || hasLink(para[para.length - 1])))) para.push(lines[i++]);
        blocks.push({ type: 'p', text: para.join(' ') });
      }
    }
  }
  return blocks;
}

/** First real paragraph, cut at a word boundary, for meta descriptions (120-155 chars). */
export function summary(text: string, max = 155, min = 110): string {
  // Join opening paragraphs until there is enough to describe the app (a one-line tagline is too short).
  let s = '';
  for (const b of parseDescription(text)) {
    if (b.type !== 'p') { if (s) break; else continue; }
    s = s ? `${s} ${b.text}` : b.text;
    if (s.length >= min) break;
  }
  s = (s || text).replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:\-–—]$/, '') + '…';
}

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Where a policy link in store text should point on this site. */
export interface LinkTargets { privacy: string; terms: string; site: string }

/**
 * Turn the plain URLs and emails in store text into real links. Privacy and terms links are pointed at
 * this app's own pages (store texts still carry the general privacy page, old Wix pages and a wrong
 * orientpro.com domain); http:// becomes https://.
 */
export function linkify(text: string, t: LinkTargets): string {
  const parts = text.split(/(https?:\/\/[^\s<>"]+|[\w.+-]+@[\w-]+\.[a-z]{2,}(?:\.[a-z]{2,})?)/gi);
  return parts.map((part, i) => {
    if (i % 2 === 0) return escapeHtml(part);
    if (part.includes('@') && !part.startsWith('http')) return `<a href="mailto:${escapeHtml(part)}">${escapeHtml(part)}</a>`;
    const trail = part.match(/[).,;:!?]+$/)?.[0] ?? '';
    let url = part.slice(0, part.length - trail.length).replace(/^http:\/\//, 'https://');
    const isOurs = /^https:\/\/(www\.)?(orlproducts\.com|orientpro\.com|orlincproducts\.wixsite\.com)\//i.test(url);
    if (isOurs && /privacy/i.test(url)) url = t.site + t.privacy;
    else if (isOurs && /terms/i.test(url)) url = t.site + t.terms;
    const external = !url.startsWith(t.site);
    return `<a href="${escapeHtml(url)}"${external ? ' rel="noopener"' : ''}>${escapeHtml(url)}</a>${escapeHtml(trail)}`;
  }).join('');
}
