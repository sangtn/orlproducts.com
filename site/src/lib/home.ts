// Everything the homepage shows, derived from the app data (site/src/data/apps/*.json).
import { apps, pageUrl, shortName, isNew, type App } from './apps';

export const site = (origin: string) => ({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization', '@id': `${origin}/#org`, name: 'ORIENTPRO',
      legalName: 'LA Investment and Trade Joint Stock Company', alternateName: 'ORIENTPRO – LA INVESTMENT & TRADE., JSC',
      url: `${origin}/`, logo: `${origin}/assets/images/favicon.png`, email: 'info@orlproducts.com',
      sameAs: ['https://apps.apple.com/us/developer/orientpro-lam-an-investment-trade-jsc/id1614396757', 'https://play.google.com/store/apps/developer?id=ORIENTPRO'],
    },
    { '@type': 'WebSite', '@id': `${origin}/#website`, url: `${origin}/`, name: 'ORIENTPRO', publisher: { '@id': `${origin}/#org` }, inLanguage: 'en' },
  ],
});

export const TELEGRAM = 'https://t.me/+MF4aYRoVeEJlMTVl';

const released = (a: App) => a.appStore?.released ?? '';
const updated = (a: App) => a.appStore?.updated ?? '';
const byBrand = (a: App, b: App) => shortName(a).localeCompare(shortName(b));
/** Newest releases first (the last 30 days), then A–Z by the name people know the app by. */
export const current = apps.filter((a) => a.group === 'current')
  .sort((a, b) => Number(isNew(b)) - Number(isNew(a)) || (isNew(a) && isNew(b) ? released(b).localeCompare(released(a)) : byBrand(a, b)));
export const legacy = apps.filter((a) => a.group === 'legacy').sort(byBrand);
/** New releases lead, then priority apps, then the most recently updated. */
export const featured = [...current].sort((a, b) => Number(isNew(b)) - Number(isNew(a)) || released(b).localeCompare(released(a)) * Number(isNew(a) && isNew(b))
  || Number(b.priority) - Number(a.priority) || updated(b).localeCompare(updated(a))).slice(0, 6);

export const stats = {
  total: apps.length,
  onAppStore: apps.filter((a) => a.appStore).length,
  onWatch: apps.filter((a) => a.platforms.watch).length,
  onPlay: apps.filter((a) => a.platforms.android).length,
  languages: new Set(apps.flatMap((a) => a.appStore?.languages ?? [])).size,
};

/** Clean in-app screens (no marketing caption) for device frames. Apps not listed have no clean screen yet. */
const CLEAN: Record<string, string> = {
  vizmath: '/assets/home/vizmath.webp',
  raykin: '/assets/home/raykin.webp',
  origamilearn: '/assets/home/origamilearn.webp',
  chemistry3d: '/assets/home/chemistry3d.webp',
  'world-monitor': '/assets/apps/world-monitor/iphone-02.webp',
  aurora: '/assets/apps/aurora/iphone-01.webp',
  pinbord: '/assets/apps/pinbord/iphone-03.webp',
  omnidoc: '/assets/apps/omnidoc/android-01.webp',
};
export const cleanShot = (a: App) => CLEAN[a.slug] ?? null;
/** The App Store / Play listing's first screenshot (usually a captioned poster); falls back to a clean screen. */
export const poster = (a: App) => a.screenshots.iphone?.[0] ?? a.screenshots.android?.[0] ?? CLEAN[a.slug] ?? null;
/** Device frame that matches where the screenshot came from. */
export const frameFor = (a: App) => (a.platforms.iphone ? 'iphone' : 'android');


/** Plain links to every app page and policy, kept for App Store and Play reviewers (and the 404 page's #app-directory link). */
export const directory = apps.map((a) => ({
  name: a.name,
  links: [
    ['Overview', a.generatePage ? pageUrl(a) : a.web.landing],
    ['Privacy', a.web.privacy],
    ['Terms', a.web.terms],
    ['Support', a.web.support],
  ].filter(([, h]) => h) as [string, string][],
})).filter((d) => d.links.length);


export { apps, pageUrl, shortName };
