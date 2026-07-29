"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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
    <main className="max-w-sm mx-auto px-6 py-20">
      <h1 className="text-2xl font-bold mb-2">ยืนยันอีเมล</h1>
      <p className="text-sm text-ink/60 mb-6">กรอกรหัสยืนยันที่ส่งไปที่ {email}</p>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm mb-5">{error}</div>
      )}
      {resent && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm mb-5">
          ส่งรหัสใหม่แล้ว ตรวจสอบอีเมลอีกครั้ง
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-ink/60 mb-1">รหัสยืนยัน (OTP) 6 หลัก</label>
          <input
            type="text"
            required
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            className="w-full border border-black/10 rounded-lg px-3 py-2.5 text-sm tracking-widest"
          />
        </div>
        <button
          disabled={loading}
          className="w-full bg-black text-white rounded-full py-3 text-sm font-medium disabled:opacity-50"
        >
          {loading ? "กำลังยืนยัน..." : "ยืนยัน"}
        </button>
        <button type="button" onClick={resend} className="w-full text-xs text-ink/60 underline">
          ยังไม่ได้รับรหัส? ส่งใหม่
        </button>
      </form>
    </main>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={null}>
      <VerifyOtpForm />
    </Suspense>
  );
}
