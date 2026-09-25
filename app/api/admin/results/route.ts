import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, ApiError } from "@/lib/rbac";
import { parseResultFields } from "@/lib/result-fields";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { data, error } = parseResultFields(await req.json());
    if (error) return NextResponse.json({ error }, { status: 400 });
    if (!data.nickname || !data.year) return NextResponse.json({ error: "ใส่ชื่อเล่นและปี" }, { status: 400 });
    const r = await prisma.studentResult.create({ data: data as any });
    return NextResponse.json(r, { status: 201 });
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
