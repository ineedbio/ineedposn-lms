import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireUser, ApiError } from "@/lib/rbac";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const Schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"),
});

/**
 * Lets an already-signed-in user (student or admin) change their own
 * password by confirming the current one — the only path previously
 * available was "forgot password", which requires access to the account's
 * email inbox and shouldn't be the only way to do a routine password change.
 */
export async function POST(req: Request) {
  try {
    const session = await requireUser();
    const userId = (session.user as any).id as string;

    // Limit guesses at the CURRENT password even from an already-authenticated
    // session (e.g. a shared/borrowed device) — 5 tries per 15 minutes.
    const rl = await rateLimit("change-password", userId, { limit: 5, windowSeconds: 15 * 60 });
    if (!rl.allowed) return rateLimitResponse(rl.retryAfterSeconds);

    const parsed = Schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { currentPassword, newPassword } = parsed.data;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: "ไม่พบบัญชีผู้ใช้" }, { status: 404 });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return NextResponse.json({ error: "รหัสผ่านปัจจุบันไม่ถูกต้อง" }, { status: 400 });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: userId }, data: { password: hashed } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
