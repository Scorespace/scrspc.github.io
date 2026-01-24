// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://yourusername.github.io',
  base: '/your-repo-name/',
  output: 'static',
  trailingSlash: 'always',
});
