import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, ApiError } from "@/lib/rbac";
import { uploadFile } from "@/lib/storage";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    // A JSON body adds a link (e.g. a Google Drive file) instead of uploading one.
    if (req.headers.get("content-type")?.includes("application/json")) {
      const { fileName, fileUrl } = await req.json();
      const url = String(fileUrl ?? "").trim();
      if (!/^https:\/\//.test(url)) return NextResponse.json({ error: "ลิงก์ต้องขึ้นต้นด้วย https://" }, { status: 400 });
      const attachment = await prisma.attachment.create({
        data: { lessonId: params.id, fileName: String(fileName ?? "").trim() || "ไฟล์ประกอบ", fileUrl: url },
      });
      return NextResponse.json(attachment, { status: 201 });
    }
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const url = await uploadFile(file, "attachments");
    const attachment = await prisma.attachment.create({
      data: { lessonId: params.id, fileName: file.name, fileUrl: url },
    });
    return NextResponse.json(attachment, { status: 201 });
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
