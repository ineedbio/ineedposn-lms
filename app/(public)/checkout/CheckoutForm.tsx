"use client";

import { useState } from "react";
import Link from "next/link";

export default function CheckoutForm({ courseId }: { courseId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function onFileChange(f: File | null) {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function submit() {
    if (!file) {
      setError("กรุณาแนบสลิปการโอนเงิน");
      return;
    }
    setSubmitting(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);
    const uploadRes = await fetch("/api/payments/slip", { method: "POST", body: formData });
    if (!uploadRes.ok) {
      setSubmitting(false);
      setError("อัปโหลดสลิปไม่สำเร็จ ลองใหม่อีกครั้ง");
      return;
    }
    const { url } = await uploadRes.json();

    const payRes = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId, slipImageUrl: url }),
    });
    setSubmitting(false);
    if (!payRes.ok) {
      const data = await payRes.json();
      setError(data.error ?? "ส่งคำขอไม่สำเร็จ ลองใหม่อีกครั้ง");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="border border-border-light rounded-card p-10 text-center flex flex-col items-center gap-4">
        <div className="text-[22px] font-extrabold tracking-[-0.02em]">ส่งคำขอลงทะเบียนแล้ว</div>
        <p className="text-secondary text-[15px] max-w-xs">
          ทีมงานจะตรวจสอบสลิปและอนุมัติภายใน 24 ชั่วโมง
        </p>
        <Link
          href="/dashboard"
          className="mt-2 h-[46px] px-8 rounded-pill bg-ink text-white text-sm font-semibold flex items-center justify-center hover:bg-dark-hover transition-all duration-150 active:scale-[0.97]"
        >
          ไปที่ห้องเรียนของฉัน
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className="text-[13px] font-semibold text-ink block mb-2">แนบสลิปการโอนเงิน</label>
        <label className="flex flex-col items-center justify-center gap-2 h-40 rounded-xl border-[1.5px] border-dashed border-border cursor-pointer hover:border-ink transition overflow-hidden">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="ตัวอย่างสลิป" className="w-full h-full object-contain" />
          ) : (
            <span className="text-sm text-secondary">คลิกเพื่อเลือกไฟล์รูปสลิป</span>
          )}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>
      )}

      <button
        onClick={submit}
        disabled={submitting}
        className="h-[50px] rounded-pill bg-ink text-white text-base font-semibold flex items-center justify-center hover:bg-dark-hover hover:shadow-md transition-all duration-150 active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100"
      >
        {submitting ? "กำลังส่ง..." : "ยืนยันการชำระเงิน"}
      </button>
    </div>
  );
}
