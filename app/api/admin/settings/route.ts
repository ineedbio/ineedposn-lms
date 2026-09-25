import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, ApiError } from "@/lib/rbac";
import { SETTING_KEYS } from "@/lib/settings";

/** Saves หลังบ้าน → ตั้งค่า. An empty value falls back to the built-in default. */
export async function PUT(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const pp = String(body.promptpay_id ?? "").replace(/[^0-9]/g, "");
    if (pp && ![10, 13, 15].includes(pp.length)) {
      return NextResponse.json({ error: "พร้อมเพย์ต้องเป็นเบอร์โทร 10 หลัก หรือเลขบัตร 13 หลัก" }, { status: 400 });
    }
    const emails = String(body.admin_emails ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    if (emails.some((e) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e))) {
      return NextResponse.json({ error: "อีเมลแจ้งเตือนไม่ถูกต้อง (คั่นหลายอีเมลด้วย , )" }, { status: 400 });
    }
    const clean: Record<string, string> = {};
    for (const k of SETTING_KEYS) if (typeof body[k] === "string") clean[k] = body[k].trim();
    if ("promptpay_id" in clean) clean.promptpay_id = pp;
    if ("contact_ig" in clean) clean.contact_ig = clean.contact_ig.replace(/^@/, "");
    if ("admin_emails" in clean) clean.admin_emails = emails.join(", ");
    if ("enroll_open" in clean) clean.enroll_open = clean.enroll_open === "1" ? "1" : "0";

    await prisma.$transaction(
      Object.entries(clean).map(([key, value]) =>
        prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } })
      )
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
