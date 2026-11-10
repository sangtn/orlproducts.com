// @ts-check
import { defineConfig } from 'astro/config';

// Pages are written as /<name>.html so every URL the App Store, Play Console and Google
// already know keeps working. Legacy pages and /assets are copied in by scripts/merge-legacy.mjs.
export default defineConfig({
  site: 'https://orlproducts.com',
  trailingSlash: 'never',
  build: { format: 'file', inlineStylesheets: 'always' },
  publicDir: 'public',
  compressHTML: true,
});
