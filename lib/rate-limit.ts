import { prisma } from "./prisma";

/**
 * Fixed-window rate limiter backed by Postgres.
 *
 * Deliberately NOT an in-memory Map: Vercel serverless functions are
 * stateless and not shared between concurrent invocations or cold starts,
 * so an in-memory counter would silently protect nothing under real load.
 *
 * Each call atomically increments a counter for (route, identifier,
 * current window) via upsert and reports whether the caller is over limit.
 */
export async function rateLimit(
  route: string,
  identifier: string,
  opts: { limit: number; windowSeconds: number }
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const windowMs = opts.windowSeconds * 1000;
  const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
  const key = `${route}:${identifier}:${windowStart}`;
  const expiresAt = new Date(windowStart + windowMs);

  const hit = await prisma.rateLimitHit.upsert({
    where: { key },
    create: { key, count: 1, expiresAt },
    update: { count: { increment: 1 } },
  });

  // Opportunistic cleanup of expired buckets so the table doesn't grow
  // forever — cheap, fire-and-forget, no separate cron job needed.
  if (Math.random() < 0.02) {
    prisma.rateLimitHit.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch(() => {});
  }

  const retryAfterSeconds = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 1000));
  return { allowed: hit.count <= opts.limit, retryAfterSeconds };
}

/**
 * Read-only version of rateLimit() — reports whether the caller is
 * currently over limit without counting this call as an attempt. Use this
 * to gate an action that shouldn't itself count as a "failure" (e.g. a
 * login that turns out to have the correct password) — call rateLimit()
 * separately, only on the actual failure path, to record it.
 */
export async function peekRateLimit(
  route: string,
  identifier: string,
  opts: { limit: number; windowSeconds: number }
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const windowMs = opts.windowSeconds * 1000;
  const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
  const key = `${route}:${identifier}:${windowStart}`;
  const expiresAt = new Date(windowStart + windowMs);

  const hit = await prisma.rateLimitHit.findUnique({ where: { key } });

  const retryAfterSeconds = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 1000));
  return { allowed: (hit?.count ?? 0) < opts.limit, retryAfterSeconds };
}

/** Best-effort client IP from standard proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(headers: Headers | Record<string, string | string[] | undefined>): string {
  const get = (name: string) =>
    headers instanceof Headers ? headers.get(name) : ([] as string[]).concat(headers[name] as any)[0];
  const fwd = get("x-forwarded-for");
  if (fwd) return String(fwd).split(",")[0].trim();
  return String(get("x-real-ip") ?? "unknown");
}

export function rateLimitResponse(retryAfterSeconds: number) {
  return new Response(
    JSON.stringify({ error: "คุณทำรายการถี่เกินไป กรุณาลองใหม่ภายหลัง" }),
    {
      status: 429,
      headers: { "Content-Type": "application/json", "Retry-After": String(retryAfterSeconds) },
    }
  );
}
