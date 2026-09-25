import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { issueOtp } from "@/lib/otp";
import { sendRegistrationOtp } from "@/lib/email";
import { uploadFile } from "@/lib/storage";
import { rateLimit, clientIp, rateLimitResponse } from "@/lib/rate-limit";

const RegisterSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  nickname: z.string().optional(),
  school: z.string().optional(),
  gradeLevel: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("อีเมลไม่ถูกต้อง"),
  password: z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"),
  dreamFaculty: z.string().optional(),
  dreamUniversity: z.string().optional(),
  currentFaculty: z.string().optional(),
  currentUniversity: z.string().optional(),
});

// Bumped when the terms text changes; stored with each account's acceptance.
const TERMS_VERSION = "2569-09-25";

export async function POST(req: Request) {
  // 5 sign-up attempts per IP per 15 minutes — generous for a real person,
  // enough to stop scripted account-creation spam.
  const ip = clientIp(req.headers);
  const rl = await rateLimit("register", ip, { limit: 5, windowSeconds: 15 * 60 });
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterSeconds);

  const formData = await req.formData();
  const raw = Object.fromEntries(
    ["firstName", "lastName", "nickname", "school", "gradeLevel", "phone", "email", "password",
      "dreamFaculty", "dreamUniversity", "currentFaculty", "currentUniversity"].map((k) => [
      k,
      formData.get(k)?.toString() ?? "",
    ])
  );
  if (!["1", "true", "on"].includes(formData.get("acceptTerms")?.toString() ?? "")) {
    return NextResponse.json({ error: "กรุณาติ๊กยอมรับข้อตกลงการใช้งานและนโยบายความเป็นส่วนตัวก่อน" }, { status: 400 });
  }
  const parsed = RegisterSchema.safeParse(raw);
  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
    return NextResponse.json({ error: first || "กรอกข้อมูลให้ครบ (ชื่อ นามสกุล อีเมล รหัสผ่าน)" }, { status: 400 });
  }
  const data = parsed.data;
  const email = data.email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing?.emailVerified) {
    return NextResponse.json({ error: "อีเมลนี้ถูกใช้งานแล้ว" }, { status: 409 });
  }

  const avatarFile = formData.get("avatar") as File | null;
  let avatarUrl: string | null = null;
  if (avatarFile && avatarFile.size > 0) {
    try {
      avatarUrl = await uploadFile(avatarFile, "avatars");
    } catch (err) {
      // The optional avatar must never block sign-up / OTP delivery.
      console.error("[register] avatar upload failed, continuing without it", err);
    }
  }

  const hashed = await bcrypt.hash(data.password, 12);

  const profile = {
    email,
    password: hashed,
    firstName: data.firstName,
    lastName: data.lastName,
    nickname: data.nickname,
    school: data.school,
    gradeLevel: data.gradeLevel,
    phone: data.phone,
    dreamFaculty: data.dreamFaculty || null,
    dreamUniversity: data.dreamUniversity || null,
    currentFaculty: data.currentFaculty || null,
    currentUniversity: data.currentUniversity || null,
    termsAcceptedAt: new Date(),
    termsVersion: TERMS_VERSION,
    role: "STUDENT" as const,
    emailVerified: false,
    ...(avatarUrl ? { avatarUrl } : {}),
  };

  // An unverified account can re-register (first OTP never arrived, typo in
  // profile, etc.) — overwrite the pending record instead of rejecting it.
  const user = existing
    ? await prisma.user.update({ where: { id: existing.id }, data: profile })
    : await prisma.user.create({ data: profile });

  const code = await issueOtp(user.id, "EMAIL_VERIFY");
  try {
    await sendRegistrationOtp({ email: user.email, otp: code });
  } catch (err) {
    console.error("[register] OTP email failed", err);
    return NextResponse.json(
      { error: "ส่งอีเมลยืนยันไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" },
      { status: 502 }
    );
  }

  return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
}
