export const isBrowser = typeof window !== 'undefined';
export const isMobile = isBrowser ? window.matchMedia('(pointer: coarse)').matches : false;
export const canUseDOM: boolean =
  typeof window !== 'undefined' &&
  typeof window.document !== 'undefined' &&
  typeof window.document.createElement !== 'undefined';
export const isApple: boolean = canUseDOM && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

// Public contact API endpoint. Overridable via env for cleanliness; falls back
// to the deployed endpoint so static builds work without extra config.
export const CONTACT_API_URL: string =
  process.env.NEXT_PUBLIC_CONTACT_API_URL ?? 'https://vs7dthj3vb.execute-api.us-west-1.amazonaws.com/api/contact';

// Delivered as a <meta> policy because the static export has no server to set
// headers; frame-ancestors is not honoured in <meta>, so X-Frame-Options from
// CloudFront still covers framing. The export has no executable inline script
// (__NEXT_DATA__ and JSON-LD are data blocks), so script-src stays 'self'.
// SSR markup carries style attributes, which needs 'unsafe-inline' for styles.
export const CONTENT_SECURITY_POLICY: string = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self' ${new URL(CONTACT_API_URL).origin}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');
