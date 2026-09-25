import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, ApiError } from "@/lib/rbac";

/**
 * Account actions from หลังบ้าน → ผู้ใช้:
 *   { action: "reset" }                     clear the device lock (user is logged out, can log in anywhere)
 *   { action: "role", role: "ADMIN"|"STUDENT" }
 *   { action: "ban", banned: boolean }      banned users are logged out and cannot log in
 * Clearing currentSessionId ends the user's current session on their next request.
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireAdmin();
    if ((session.user as any).id === params.id) {
      return NextResponse.json({ error: "แก้สิทธิ์บัญชีของตัวเองไม่ได้" }, { status: 400 });
    }
    const body = await req.json();
    let data: Record<string, unknown>;
    if (body.action === "reset") data = { currentSessionId: null, currentDeviceInfo: null };
    else if (body.action === "role" && (body.role === "ADMIN" || body.role === "STUDENT")) data = { role: body.role };
    else if (body.action === "ban" && typeof body.banned === "boolean")
      data = body.banned ? { isBanned: true, currentSessionId: null, currentDeviceInfo: null } : { isBanned: false };
    else return NextResponse.json({ error: "คำสั่งไม่ถูกต้อง" }, { status: 400 });

    await prisma.user.update({ where: { id: params.id }, data });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
