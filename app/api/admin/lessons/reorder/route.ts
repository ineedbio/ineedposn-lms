import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, ApiError } from "@/lib/rbac";

/** Saves a new lesson order (and optional chapter changes) after a drag in the admin list. */
export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { courseId, order, chapters } = await req.json();
    if (!courseId || !Array.isArray(order)) return NextResponse.json({ error: "ข้อมูลไม่ครบ" }, { status: 400 });
    const lessons = await prisma.lesson.findMany({ where: { courseId }, select: { id: true } });
    const ids = new Set(lessons.map((l) => l.id));
    if (order.length !== ids.size || !order.every((id: unknown) => typeof id === "string" && ids.has(id))) {
      return NextResponse.json({ error: "รายการตอนไม่ตรงกับคอร์ส ลองรีเฟรชหน้า" }, { status: 400 });
    }
    await prisma.$transaction(
      order.map((id: string, i: number) =>
        prisma.lesson.update({
          where: { id },
          data: { order: i, ...(chapters && typeof chapters[id] === "string" ? { chapter: chapters[id] || null } : {}) },
        })
      )
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
