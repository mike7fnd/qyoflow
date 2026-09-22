/**
 * Configuration checks that run once at boot rather than failing halfway
 * through someone's first sign-up.
 *
 * A missing Supabase key otherwise surfaces as a fetch error three screens in;
 * a wrong NEXT_PUBLIC_SITE_URL is worse, because it silently bakes the wrong
 * address into every QR code a business prints.
 */

export class ConfigError extends Error {
  constructor(problems: string[]) {
    super(
      `QyoFlow is not configured correctly:\n` +
        problems.map((p) => `  • ${p}`).join("\n") +
        `\n\nSee .env.example for the full list.`,
    );
    this.name = "ConfigError";
  }
}

function isPlaceholder(value: string) {
  return /placeholder|your-|changeme|example\.com/i.test(value);
}

/**
 * True when this is a real deployment rather than a production build someone is
 * running on their own machine. Hosting platforms all announce themselves;
 * QYOFLOW_ENFORCE_ENV=1 forces the strict checks anywhere else.
 */
export function isDeployed() {
  return Boolean(
    process.env.QYOFLOW_ENFORCE_ENV === "1" ||
      process.env.VERCEL ||
      process.env.RENDER ||
      process.env.FLY_APP_NAME ||
      process.env.RAILWAY_ENVIRONMENT ||
      process.env.K_SERVICE, // Cloud Run
  );
}

export interface EnvReport {
  fatal: string[];
  warnings: string[];
}

/** Collects everything that's wrong at once, rather than one thing at a time. */
export function checkEnv(): EnvReport {
  const fatal: string[] = [];
  const warnings: string[] = [];
  const deployed = isDeployed();

  // Only a deployment can be sure what its public address should be, so
  // site-URL problems stop a deploy but merely warn on a laptop.
  const note = (message: string) => (deployed ? fatal : warnings).push(message);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const site = process.env.NEXT_PUBLIC_SITE_URL;

  // Without these the app cannot do anything at all, anywhere.
  if (!url) fatal.push("NEXT_PUBLIC_SUPABASE_URL is not set");
  else if (!/^https:\/\/.+/.test(url))
    fatal.push("NEXT_PUBLIC_SUPABASE_URL must be an https:// URL");
  else if (isPlaceholder(url))
    note("NEXT_PUBLIC_SUPABASE_URL still holds a placeholder value");

  if (!anon) fatal.push("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set");
  else if (isPlaceholder(anon))
    note("NEXT_PUBLIC_SUPABASE_ANON_KEY still holds a placeholder value");

  // Account creation and the billing webhook both need the service role.
  if (!service) {
    note("SUPABASE_SERVICE_ROLE_KEY is not set — sign-up and billing webhooks will fail");
  }

  if (!site) {
    note("NEXT_PUBLIC_SITE_URL is not set — QR codes would be printed pointing at localhost");
  } else if (/localhost|127\.0\.0\.1/.test(site)) {
    note(`NEXT_PUBLIC_SITE_URL is "${site}" — every printed QR code would point there`);
  } else if (!/^https:\/\//.test(site)) {
    note("NEXT_PUBLIC_SITE_URL should be https://");
  }

  return { fatal, warnings };
}

/** Throws on anything that would make this deployment unsafe to serve. */
export function assertEnv() {
  const { fatal, warnings } = checkEnv();

  for (const warning of warnings) {
    console.warn(`[qyoflow] ${warning}`);
  }
  if (fatal.length) throw new ConfigError(fatal);
}

/** Whether billing is live, as opposed to recording plan changes directly. */
export function billingConfigured() {
  return Boolean(process.env.PAYMONGO_SECRET_KEY && process.env.PAYMONGO_WEBHOOK_SECRET);
}
