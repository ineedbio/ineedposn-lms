// Scheduled job (Vercel Cron, see vercel.json): pull new lessons from the YouTube playlists linked to
// courses — what Code.gs does with its syncPlaylists() trigger. Needs YOUTUBE_API_KEY. When CRON_SECRET
// is set, Vercel sends it as a bearer token and other callers are refused.
import { syncPlaylists } from "@/lib/ib/staff";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ ok: false, error: "FORBIDDEN" }, { status: 401 });
  if (!process.env.YOUTUBE_API_KEY) return Response.json({ ok: true, data: { skipped: "YOUTUBE_API_KEY is not set" } });
  const r = await rateLimit("ib", "cron:sync", { limit: 1, windowSeconds: 600 });
  if (!r.allowed) return Response.json({ ok: true, data: { skipped: "ran less than 10 minutes ago" } });
  return Response.json({ ok: true, data: await syncPlaylists() });
}
