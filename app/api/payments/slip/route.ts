import { NextResponse } from "next/server";
import { requireUser, ApiError } from "@/lib/rbac";
import { uploadFile } from "@/lib/storage";

export async function POST(req: Request) {
  try {
    await requireUser();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const url = await uploadFile(file, "slips");
    return NextResponse.json({ url }, { status: 201 });
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
