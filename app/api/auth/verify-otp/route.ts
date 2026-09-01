import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { issueOtp, verifyOtp, type VerifyOtpResult } from "@/lib/otp";
import { sendRegistrationOtp } from "@/lib/email";

const OTP_ERROR: Record<Extract<VerifyOtpResult, { ok: false }>["reason"], string> = {
  NOT_FOUND: "รหัส OTP ไม่ถูกต้อง",
  INVALID: "รหัส OTP ไม่ถูกต้อง",
  EXPIRED: "รหัส OTP หมดอายุแล้ว กรุณาขอรหัสใหม่",
  TOO_MANY_ATTEMPTS: "กรอกรหัสผิดหลายครั้งเกินไป กรุณาขอรหัสใหม่",
};

export async function POST(req: Request) {
  const { email, otp } = await req.json();
  if (!email || !otp) {
    return NextResponse.json({ error: "กรอกข้อมูลไม่ครบ" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: String(email).toLowerCase() },
  });
  if (!user) {
    return NextResponse.json({ error: "รหัส OTP ไม่ถูกต้อง" }, { status: 400 });
  }
  if (user.emailVerified) {
    return NextResponse.json({ ok: true });
  }

  const result = await verifyOtp(user.id, "EMAIL_VERIFY", String(otp));
  if (!result.ok) {
    return NextResponse.json({ error: OTP_ERROR[result.reason] }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true },
  });

  return NextResponse.json({ ok: true });
}

// Resend a fresh OTP for an unverified account.
export async function PUT(req: Request) {
  const { email } = await req.json();
  const user = await prisma.user.findUnique({
    where: { email: email ? String(email).toLowerCase() : "" },
  });
  if (!user || user.emailVerified) {
    return NextResponse.json({ ok: true }); // don't leak account state
  }

  const code = await issueOtp(user.id, "EMAIL_VERIFY");
  try {
    await sendRegistrationOtp({ email: user.email, otp: code });
  } catch (err) {
    console.error("[verify-otp] resend failed", err);
    return NextResponse.json({ error: "ส่งอีเมลไม่สำเร็จ กรุณาลองใหม่" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
