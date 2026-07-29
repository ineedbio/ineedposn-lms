"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
    <main className="max-w-sm mx-auto px-6 py-20">
      <h1 className="text-2xl font-bold mb-2">ลืมรหัสผ่าน</h1>
      <p className="text-sm text-secondary mb-6">
        {step === 1
          ? "กรอกอีเมลที่ใช้สมัคร เราจะส่งรหัสยืนยันไปให้"
          : `กรอกรหัสยืนยันที่ส่งไปที่ ${email}`}
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm mb-5">{error}</div>
      )}

      {step === 1 ? (
        <form onSubmit={requestOtp} className="space-y-4">
          <div>
            <label className="block text-xs text-secondary mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm"
            />
          </div>
          <button
            disabled={loading}
            className="w-full bg-ink text-white rounded-pill py-3 text-sm font-medium disabled:opacity-50"
          >
            {loading ? "กำลังส่ง..." : "ส่งรหัสยืนยัน"}
          </button>
        </form>
      ) : (
        <form onSubmit={resetPassword} className="space-y-4">
          <div>
            <label className="block text-xs text-secondary mb-1">รหัสยืนยัน (OTP) 6 หลัก</label>
            <input
              type="text"
              required
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm tracking-widest"
            />
          </div>
          <div>
            <label className="block text-xs text-secondary mb-1">รหัสผ่านใหม่</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm"
            />
          </div>
          <button
            disabled={loading}
            className="w-full bg-ink text-white rounded-pill py-3 text-sm font-medium disabled:opacity-50"
          >
            {loading ? "กำลังบันทึก..." : "ตั้งรหัสผ่านใหม่"}
          </button>
          <button
            type="button"
            onClick={() => setStep(1)}
            className="w-full text-xs text-secondary"
          >
            ยังไม่ได้รับรหัส? ส่งใหม่
          </button>
        </form>
      )}
    </main>
  );
}
