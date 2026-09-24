import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DB_KEY = "posn_camp1_results";

// 1. ดึงข้อมูล สอวน. จาก Neon DB
export async function GET() {
  const record = await prisma.themeSetting.findUnique({ where: { key: DB_KEY } });
  const data = record?.value ? JSON.parse(record.value) : [];
  return NextResponse.json(data);
}

// 2. บันทึก/อัปเดตข้อมูลทั้งหมดลง Neon DB
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json(); // array ของนักเรียน สอวน.
    await prisma.themeSetting.upsert({
      where: { key: DB_KEY },
      update: { value: JSON.stringify(body) },
      create: { key: DB_KEY, value: JSON.stringify(body) },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}