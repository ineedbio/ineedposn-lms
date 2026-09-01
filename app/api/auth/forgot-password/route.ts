import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { issueOtp } from "@/lib/otp";
import { sendPasswordResetOtp } from "@/lib/email";

export async function POST(req: Request) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "กรุณากรอกอีเมล" }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { email: String(email).toLowerCase() },
  });

  // Always return success even if the email doesn't exist — prevents leaking
  // which emails have accounts (standard practice).
  if (!user) {
    return NextResponse.json({ ok: true });
  }

  const code = await issueOtp(user.id, "PASSWORD_RESET");
  try {
    await sendPasswordResetOtp({ email: user.email, otp: code });
  } catch (err) {
    // Still return ok to avoid leaking account state; the user can retry.
    console.error("[forgot-password] email failed", err);
  }

  return NextResponse.json({ ok: true });
}
