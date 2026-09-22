/**
 * Content Security Policy.
 *
 * `'unsafe-inline'` on script-src is what Next's hydration bootstrap needs
 * without per-request nonces. The policy still does the work that matters: an
 * injected <script src> from another origin is blocked, and connect-src means
 * stolen data has nowhere to go — only this origin and this Supabase project
 * are reachable.
 *
 * To tighten further, emit a nonce from middleware and swap `'unsafe-inline'`
 * for `'nonce-…'`; Next picks the nonce up from the request's CSP header.
 */
function contentSecurityPolicy() {
  const dev = process.env.NODE_ENV !== "production";

  // Supabase serves REST, auth and the realtime websocket from the project host.
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseWs = supabase.replace(/^https:/, "wss:");

  return [
    "default-src 'self'",
    // 'unsafe-eval' is only needed by the dev-mode React refresh runtime.
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    // data: for generated QR codes, blob: for the download
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self' ${supabase} ${supabaseWs}${dev ? " ws: http://localhost:*" : ""}`,
    "form-action 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
    "manifest-src 'self'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ]
    .join("; ")
    .replace(/\s+/g, " ")
    .trim();
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy() },
          // Told to browsers only over HTTPS; harmless locally.
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), interest-cohort=()",
          },
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
      {
        // A customer's ticket is a private URL. Keep it out of shared caches
        // and out of search results.
        source: "/t/:token*",
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
