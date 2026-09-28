// Scheduled job (Vercel Cron, see vercel.json), once a day:
//  1) close the half-month finance period that just ended (Code.gs autoCloseFinance) — only when CRON_SECRET
//     is set and Vercel sent it; skipped while an expense of that period still waits for approval.
//  2) pull new lessons from the YouTube playlists linked to courses (Code.gs syncPlaylists) — needs YOUTUBE_API_KEY.
// When CRON_SECRET is set, Vercel sends it as a bearer token and other callers are refused.
import { autoCloseFinance, syncPlaylists } from "@/lib/ib/staff";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ ok: false, error: "FORBIDDEN" }, { status: 401 });
  const r = await rateLimit("ib", "cron:sync", { limit: 1, windowSeconds: 600 });
  if (!r.allowed) return Response.json({ ok: true, data: { skipped: "ran less than 10 minutes ago" } });
  let finance: unknown;
  try {
    finance = secret ? await autoCloseFinance() : { skipped: "CRON_SECRET is not set" };
  } catch (e) {
    console.error("[cron] finance", e);
    finance = { error: String(e) };
  }
  const sync = process.env.YOUTUBE_API_KEY ? await syncPlaylists() : { skipped: "YOUTUBE_API_KEY is not set" };
  return Response.json({ ok: true, data: { finance, sync } });
}
