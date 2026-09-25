import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

/**
 * Visit /api/bootstrap?secret=YOUR_BOOTSTRAP_SECRET once, right after the
 * first successful deploy, to create the admin login and a sample subject
 * so the site isn't empty. Protected by BOOTSTRAP_SECRET so no one else can
 * trigger it. Safe to leave in place — it no-ops if the admin already
 * exists — but you can also delete this file once you're set up.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");

  if (!process.env.BOOTSTRAP_SECRET || secret !== process.env.BOOTSTRAP_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existingAdmin = await prisma.user.findUnique({
    where: { email: "admin@ineedposn.com" },
  });
  if (existingAdmin) {
    return NextResponse.json({ message: "Admin already exists, nothing to do." });
  }

  const adminPassword = await bcrypt.hash("ChangeMe123!", 12);
  await prisma.user.create({
    data: {
      email: "admin@ineedposn.com",
      password: adminPassword,
      firstName: "Admin",
      lastName: "INeedPOSN",
      role: "ADMIN",
      emailVerified: true,
    },
  });

  const biology = await prisma.subject.upsert({
    where: { slug: "biology" },
    update: {},
    create: { name: "Biology", slug: "biology", colorTheme: "#1D7A4C" },
  });

  const category = await prisma.category.upsert({
    where: { id: "seed-category-camp1" },
    update: {},
    create: { id: "seed-category-camp1", name: "Camp 1", subjectId: biology.id },
  });

  await prisma.course.upsert({
    where: { slug: "biology-camp-1" },
    update: {},
    create: {
      title: "สอวน. Biology — Camp 1",
      slug: "biology-camp-1",
      description: "ปูพื้นเซลล์และพันธุศาสตร์ ครอบคลุมทุกหัวข้อสำคัญของค่าย 1",
      price: 1200,
      isPublished: true,
      subjectId: biology.id,
      categoryId: category.id,
    },
  });

  return NextResponse.json({
    message: "Bootstrap complete. Admin login: admin@ineedposn.com / ChangeMe123! — change this password immediately.",
  });
}
