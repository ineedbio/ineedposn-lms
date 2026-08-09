import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, ApiError } from "@/lib/rbac";
import { uploadFile } from "@/lib/storage";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const existing = await prisma.pageBlock.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "ไม่พบบล็อกนี้" }, { status: 404 });

    const url = await uploadFile(file, "page-blocks");
    const content = { ...(existing.contentJson as unknown as Record<string, unknown>), imageUrl: url };
    const block = await prisma.pageBlock.update({ where: { id: params.id }, data: { contentJson: content } });
    return NextResponse.json(block, { status: 201 });
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
