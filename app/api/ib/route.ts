// Backend of the web app (public/ineedbio/app.js): one POST endpoint speaking the same
// { action, data, token } protocol as backend/Code.gs, backed by Neon. See lib/ib/api.ts.
import { handle, type Payload } from "@/lib/ib/api";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let p: Payload;
  try {
    p = JSON.parse(await req.text());
  } catch {
    return Response.json({ ok: false, error: "BAD_INPUT", message: "คำขอไม่ถูกต้อง" });
  }
  return Response.json(await handle(p), { headers: { "Cache-Control": "no-store" } });
}

export function GET() {
  return Response.json({ ok: true, data: { service: "INeedBio API", time: new Date().toISOString() } });
}
