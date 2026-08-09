import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendRegistrationOtp } from "@/lib/email";
import { uploadFile } from "@/lib/storage";

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const RegisterSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  nickname: z.string().optional(),
  school: z.string().optional(),
  gradeLevel: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email(),
  password: z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"),
});

export async function POST(req: Request) {
  const formData = await req.formData();
  const raw = Object.fromEntries(
    ["firstName", "lastName", "nickname", "school", "gradeLevel", "phone", "email", "password"].map((k) => [
      k,
      formData.get(k)?.toString() ?? "",
    ])
  );
  const parsed = RegisterSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
  if (existing) {
    return NextResponse.json({ error: "อีเมลนี้ถูกใช้งานแล้ว" }, { status: 409 });
  }

  const avatarFile = formData.get("avatar") as File | null;
  const avatarUrl = avatarFile && avatarFile.size > 0 ? await uploadFile(avatarFile, "avatars") : null;

  const hashed = await bcrypt.hash(data.password, 12);
  const otp = generateOtp();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  const user = await prisma.user.create({
    data: {
      email: data.email.toLowerCase(),
      password: hashed,
      firstName: data.firstName,
      lastName: data.lastName,
      nickname: data.nickname,
      school: data.school,
      gradeLevel: data.gradeLevel,
      phone: data.phone,
      role: "STUDENT",
      emailVerified: false,
      otpCode: otp,
      otpExpiry,
      avatarUrl,
    },
  });

  await sendRegistrationOtp({ email: user.email, otp });

  return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
}
