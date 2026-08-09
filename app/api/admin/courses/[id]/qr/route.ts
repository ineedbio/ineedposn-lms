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

    const url = await uploadFile(file, "payment-qr");
    const course = await prisma.course.update({
      where: { id: params.id },
      data: { paymentQrUrl: url },
    });
    return NextResponse.json({ paymentQrUrl: course.paymentQrUrl }, { status: 201 });
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
