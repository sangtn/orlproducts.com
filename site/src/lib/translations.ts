// App text translations (site/src/data/i18n/<lang>/<slug>.json) and which legacy pages exist per language.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { App } from './apps';

export interface Translation {
  lang: string; slug: string; reviewed: boolean;
  subtitle: string | null; description: string; metaDescription: string;
}

const mods = import.meta.glob<Translation>('../data/i18n/*/*.json', { eager: true, import: 'default' });
export const translations: Translation[] = Object.values(mods);
export const translationFor = (slug: string, lang: string) => translations.find((t) => t.slug === slug && t.lang === lang);
export const translatedLangs = (slug: string) => translations.filter((t) => t.slug === slug).map((t) => t.lang).sort();

/** URL of an app's page in a language: the translated page when it exists, otherwise the original. */
export function appPageUrl(app: App, lang: string): string {
  if (!app.generatePage) return app.web.landing ?? app.appStore?.url ?? app.googlePlay?.url ?? '/';
  if (lang !== app.contentLang && translationFor(app.slug, lang)) return `/${lang}/${app.slug}.html`;
  return `/${app.slug}.html`;
}

/** Legacy hand-written pages (privacy, support…) are prerendered per language from assets/i18n/<set>.<lang>.json. */
export function localizedLegacy(path: string, lang: string): string {
  if (lang === 'en') return path;
  const file = path.replace(/^\//, '');
  const set = file.replace(/(-privacy|-support|-terms)?\.html$/, '');
  return existsSync(join(process.cwd(), '..', 'assets', 'i18n', `${set}.${lang}.json`)) ? `/${lang}/${file}` : path;
}
