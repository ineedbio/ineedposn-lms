import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, ApiError } from "@/lib/rbac";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const body = await req.json();

    const existing = await prisma.pageBlock.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "ไม่พบบล็อกนี้" }, { status: 404 });

    const content = { ...(existing.contentJson as unknown as Record<string, unknown>) };
    for (const key of ["heading", "sub", "bg", "fg"]) {
      if (typeof body[key] === "string") content[key] = body[key];
    }

    const data: any = { contentJson: content };
    if (typeof body.isPublished === "boolean") data.isPublished = body.isPublished;
    if (typeof body.order === "number") data.order = body.order;

    const block = await prisma.pageBlock.update({ where: { id: params.id }, data });
    return NextResponse.json(block);
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    await prisma.pageBlock.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
