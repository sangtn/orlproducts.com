// Typed access to the generated app data (site/src/data/apps/*.json, written by tools/sync_store_data.py).

export interface App {
  slug: string;
  name: string;
  subtitle: string | null;
  brand: string | null;
  tagline: string | null;
  group: 'current' | 'legacy';
  priority: boolean;
  accent: { base: string; ink: string; inkDark: string; on: string };
  category: string | null;
  appStore: null | {
    id: number; url: string; bundleId: string; version: string; released: string; updated: string;
    minimumOs: string; languages: string[]; price: string;
    rating: null | { value: number; count: number };
    contentRating: string; icon: string; developerWebsite: string;
  };
  iosStatus: 'live' | 'in-review' | null;
  googlePlay: null | { package: string; url: string };
  androidStatus: 'live' | 'in-progress' | null;
  platforms: { iphone?: boolean; ipad?: boolean; mac?: 'native' | 'ipad-app'; watch?: boolean; vision?: 'native' | 'ipad-app'; android: boolean; wearOs: boolean };
  surfaces: Record<string, boolean>;
  web: { landing: string | null; privacy: string | null; terms: string | null; support: string | null };
  generatePage: boolean;
  contentLang: string;
  metaDescription: string | null;
  description: string;
  screenshots: { iphone?: string[]; ipad?: string[]; android?: string[] };
  issues: string[];
}

const modules = import.meta.glob<App>('../data/apps/*.json', { eager: true, import: 'default' });
export const apps: App[] = Object.values(modules).sort((a, b) =>
  a.group === b.group ? a.name.localeCompare(b.name) : a.group === 'current' ? -1 : 1,
);
export const bySlug = (slug: string) => apps.find((a) => a.slug === slug)!;

/** Short display name: "VizMath: 3D Math Visualizer" -> "VizMath". */
export const shortName = (a: App) => a.brand ?? a.name.split(/\s[:\-–]\s|:\s/)[0].trim();
/** What the app is, in a few words, from its store name ("Kayak, Canoe & SUP"). */
export const tagline = (a: App) => a.tagline ?? a.subtitle ?? a.category ?? '';

/** Released on the App Store or Google Play in the last 30 days (at build time). */
export const NEW_DAYS = 30;
export const isNew = (a: App) => !!a.appStore?.released && Date.now() - Date.parse(a.appStore.released) < NEW_DAYS * 864e5;

/** Where a card should link: our page if there is one, otherwise the store listing. */
export const pageUrl = (a: App) =>
  a.generatePage ? `/${a.slug}.html` : a.web.landing ?? a.appStore?.url ?? a.googlePlay?.url ?? '/';

export const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', vi: 'Vietnamese', ja: 'Japanese', ko: 'Korean', zh: 'Chinese', es: 'Spanish', fr: 'French',
  de: 'German', it: 'Italian', pt: 'Portuguese', ru: 'Russian', ar: 'Arabic', hi: 'Hindi', th: 'Thai',
  id: 'Indonesian', tr: 'Turkish', nl: 'Dutch', pl: 'Polish', sv: 'Swedish', uk: 'Ukrainian', ms: 'Malay',
  nb: 'Norwegian', da: 'Danish', fi: 'Finnish', cs: 'Czech', el: 'Greek', he: 'Hebrew', hu: 'Hungarian', ro: 'Romanian',
};
