"use client";

import { useState } from "react";
import Link from "next/link";
import Button from "@/components/Button";

const inputClass =
  "h-12 rounded-xl border-[1.5px] border-border px-4 text-[15px] focus:outline-none focus:border-accent transition";
const labelClass = "text-[13px] font-semibold text-ink";

export default function SettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error?.formErrors?.[0] ?? data.error ?? "ไม่สำเร็จ กรุณาลองใหม่");
      return;
    }

    setSuccess(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <div className="max-w-[1300px] mx-auto px-12 pt-14 pb-24">
      <div className="mb-10">
        <Link href="/dashboard" className="text-sm font-medium text-secondary hover:text-accent transition-colors">
          ← กลับหน้าหลัก
        </Link>
        <h1 className="text-[32px] font-extrabold tracking-[-0.02em] mt-3">ตั้งค่าบัญชี</h1>
      </div>

      <div className="max-w-[420px] flex flex-col gap-6">
        <div>
          <h2 className="text-lg font-bold mb-1">เปลี่ยนรหัสผ่าน</h2>
          <p className="text-sm text-secondary">ยืนยันรหัสผ่านปัจจุบันก่อนตั้งรหัสผ่านใหม่</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700">
            เปลี่ยนรหัสผ่านสำเร็จแล้ว
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>รหัสผ่านปัจจุบัน</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>รหัสผ่านใหม่</label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>ยืนยันรหัสผ่านใหม่</label>
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
            />
          </div>
          <Button disabled={loading} className="mt-2">
            {loading ? "กำลังบันทึก..." : "เปลี่ยนรหัสผ่าน"}
          </Button>
        </form>
      </div>
    </div>
  );
}
