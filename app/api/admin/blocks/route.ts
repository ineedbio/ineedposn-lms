import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, ApiError } from "@/lib/rbac";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { page, type, heading, sub, bg, fg } = await req.json();
    if (!page || !type) return NextResponse.json({ error: "ข้อมูลไม่ครบ" }, { status: 400 });

    const count = await prisma.pageBlock.count({ where: { page } });
    const block = await prisma.pageBlock.create({
      data: {
        page,
        type,
        order: count,
        isPublished: true,
        contentJson: { heading: heading ?? "", sub: sub ?? "", bg: bg ?? "#f5f5f7", fg: fg ?? "#1d1d1f" },
      },
    });
    return NextResponse.json(block, { status: 201 });
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
