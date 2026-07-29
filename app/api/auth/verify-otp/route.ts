import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { email, otp } = await req.json();
  if (!email || !otp) {
    return NextResponse.json({ error: "กรอกข้อมูลไม่ครบ" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !user.otpCode || !user.otpExpiry) {
    return NextResponse.json({ error: "รหัส OTP ไม่ถูกต้อง" }, { status: 400 });
  }
  if (user.otpCode !== otp) {
    return NextResponse.json({ error: "รหัส OTP ไม่ถูกต้อง" }, { status: 400 });
  }
  if (user.otpExpiry < new Date()) {
    return NextResponse.json({ error: "รหัส OTP หมดอายุแล้ว" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, otpCode: null, otpExpiry: null },
  });

  return NextResponse.json({ ok: true });
}

// Resend a fresh OTP for an unverified account.
export async function PUT(req: Request) {
  const { email } = await req.json();
  const user = await prisma.user.findUnique({ where: { email: email?.toLowerCase() } });
  if (!user || user.emailVerified) {
    return NextResponse.json({ ok: true }); // don't leak account state
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
  await prisma.user.update({ where: { id: user.id }, data: { otpCode: otp, otpExpiry } });

  const { sendRegistrationOtp } = await import("@/lib/email");
  await sendRegistrationOtp({ email: user.email, otp });

  return NextResponse.json({ ok: true });
}
