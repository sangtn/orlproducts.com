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
        while (i < lines.length && !BULLET.test(lines[i])) para.push(lines[i++]);
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
