/**
 * Single source of truth for brand colors that are shared between Tailwind
 * (tailwind.config.js requires this file) and code that can't use Tailwind
 * classes — most notably the WebGL canvas. Plain CommonJS so the Tailwind
 * config can require it at build time.
 */
const themeTokens = {
  /** The site-wide accent — mirrors Tailwind's default orange-400, used as text-orange-400 etc. */
  orange400: '#fb923c',
  /** Secondary brand yellow — exposed to Tailwind as the custom `yellow` token. */
  yellow: '#efc603',
};

// eslint-disable-next-line no-undef
module.exports = themeTokens;
