"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const inputClass =
  "h-12 rounded-xl border-[1.5px] border-border px-4 text-[15px] focus:outline-none focus:border-ink transition";
const labelClass = "text-[13px] font-semibold text-ink";

function VerifyOtpForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "ยืนยันไม่สำเร็จ");
      return;
    }
    router.push("/login?verified=1");
  }

  async function resend() {
    setResent(false);
    await fetch("/api/auth/verify-otp", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setResent(true);
  }

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-[400px] flex flex-col gap-8">
        <div className="text-center flex flex-col gap-2">
          <h1 className="text-[32px] font-extrabold tracking-[-0.02em]">ยืนยันอีเมล</h1>
          <p className="text-base text-secondary">กรอกรหัสยืนยันที่ส่งไปที่ {email}</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>
        )}
        {resent && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700">
            ส่งรหัสใหม่แล้ว ตรวจสอบอีเมลอีกครั้ง
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
          <button
            disabled={loading}
            className="mt-2 h-[50px] rounded-pill bg-ink text-white text-base font-semibold flex items-center justify-center hover:bg-dark-hover transition disabled:opacity-50"
          >
            {loading ? "กำลังยืนยัน..." : "ยืนยัน"}
          </button>
          <button type="button" onClick={resend} className="text-center text-[13px] text-secondary">
            ยังไม่ได้รับรหัส? ส่งใหม่
          </button>
        </form>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={null}>
      <VerifyOtpForm />
    </Suspense>
  );
}
