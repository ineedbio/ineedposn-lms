import { NextResponse } from "next/server";
import { requireAdmin, ApiError } from "@/lib/rbac";
import { uploadFile } from "@/lib/storage";

const ALLOWED_FOLDERS = ["covers", "page-blocks"] as const;

export async function POST(req: Request) {
  try {
    await requireAdmin();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = formData.get("folder") as string | null;

    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
    if (!folder || !ALLOWED_FOLDERS.includes(folder as any)) {
      return NextResponse.json({ error: "Invalid folder" }, { status: 400 });
    }

    const url = await uploadFile(file, folder);
    return NextResponse.json({ url }, { status: 201 });
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
