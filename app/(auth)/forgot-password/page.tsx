"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const inputClass =
  "h-12 rounded-xl border-[1.5px] border-border px-4 text-[15px] focus:outline-none focus:border-ink transition";
const labelClass = "text-[13px] font-semibold text-ink";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    setStep(2);
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp, newPassword }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error?.formErrors?.[0] ?? data.error ?? "ไม่สำเร็จ");
      return;
    }
    router.push("/login?reset=1");
  }

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-[400px] flex flex-col gap-8">
        <div className="text-center flex flex-col gap-2">
          <h1 className="text-[32px] font-extrabold tracking-[-0.02em]">ลืมรหัสผ่าน</h1>
          <p className="text-base text-secondary">
            {step === 1
              ? "กรอกอีเมลที่ใช้สมัคร เราจะส่งรหัสยืนยันไปให้"
              : `กรอกรหัสยืนยันที่ส่งไปที่ ${email}`}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>
        )}

        {step === 1 ? (
          <form onSubmit={requestOtp} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>อีเมล</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>
            <button
              disabled={loading}
              className="mt-2 h-[50px] rounded-pill bg-ink text-white text-base font-semibold flex items-center justify-center hover:bg-dark-hover transition disabled:opacity-50"
            >
              {loading ? "กำลังส่ง..." : "ส่งรหัสยืนยัน"}
            </button>
          </form>
        ) : (
          <form onSubmit={resetPassword} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>รหัสยืนยัน (OTP) 6 หลัก</label>
              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className={`${inputClass} tracking-widest`}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>รหัสผ่านใหม่</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClass}
              />
            </div>
            <button
              disabled={loading}
              className="mt-2 h-[50px] rounded-pill bg-ink text-white text-base font-semibold flex items-center justify-center hover:bg-dark-hover transition disabled:opacity-50"
            >
              {loading ? "กำลังบันทึก..." : "ตั้งรหัสผ่านใหม่"}
            </button>
            <button type="button" onClick={() => setStep(1)} className="text-center text-[13px] text-secondary">
              ยังไม่ได้รับรหัส? ส่งใหม่
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
