import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, ApiError } from "@/lib/rbac";
import { deleteFile } from "@/lib/storage";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const attachment = await prisma.attachment.findUnique({ where: { id: params.id } });
    if (!attachment) return NextResponse.json({ error: "ไม่พบไฟล์" }, { status: 404 });
    await prisma.attachment.delete({ where: { id: params.id } });
    await deleteFile(attachment.fileUrl).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
