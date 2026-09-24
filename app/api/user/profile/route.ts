import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadFile, deleteFile } from "@/lib/storage";

// ดึงข้อมูลโปรไฟล์ปัจจุบัน
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      firstName: true,
      lastName: true,
      nickname: true,
      school: true,
      gradeLevel: true,
      phone: true,
      email: true,
      avatarUrl: true,
    },
  });

  return NextResponse.json(user);
}

// อัปเดตข้อมูลโปรไฟล์ + รูปภาพ
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const firstName = formData.get("firstName")?.toString().trim();
  const lastName = formData.get("lastName")?.toString().trim();
  const nickname = formData.get("nickname")?.toString().trim() || null;
  const school = formData.get("school")?.toString().trim() || null;
  const gradeLevel = formData.get("gradeLevel")?.toString().trim() || null;
  const phone = formData.get("phone")?.toString().trim() || null;
  const avatarFile = formData.get("avatar") as File | null;

  if (!firstName || !lastName) {
    return NextResponse.json({ error: "กรุณากรอกชื่อและนามสกุล" }, { status: 400 });
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  let avatarUrl = currentUser?.avatarUrl;

  // ถ้ามีการอัปโหลดรูปใหม่
  if (avatarFile && avatarFile.size > 0) {
    try {
      // ลบรูปเก่าใน R2 ทิ้ง เพื่อไม่ให้เปลืองพื้นที่
      if (currentUser?.avatarUrl) {
        await deleteFile(currentUser.avatarUrl);
      }
      // อัปโหลดรูปใหม่
      avatarUrl = await uploadFile(avatarFile, "avatars");
    } catch (err) {
      console.error("[profile] upload avatar failed", err);
      return NextResponse.json({ error: "อัปโหลดรูปไม่สำเร็จ" }, { status: 500 });
    }
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      firstName,
      lastName,
      nickname,
      school,
      gradeLevel,
      phone,
      avatarUrl,
    },
  });

  return NextResponse.json({
    ok: true,
    user: {
      name: `${updated.firstName} ${updated.lastName}`,
      avatarUrl: updated.avatarUrl,
    },
  });
}