import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

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
  const body = await req.json();
  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
  if (existing) {
    return NextResponse.json({ error: "อีเมลนี้ถูกใช้งานแล้ว" }, { status: 409 });
  }

  const hashed = await bcrypt.hash(data.password, 12);

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
    },
  });

  // TODO: send OTP verification email here (see /api/auth/otp) before
  // flipping emailVerified — stubbed for now so registration isn't blocked
  // during initial rollout.

  return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
}
