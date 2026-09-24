"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

const GRADE_OPTIONS = ["มัธยมศึกษาปีที่ 4", "มัธยมศึกษาปีที่ 5", "มัธยมศึกษาปีที่ 6", "อื่น ๆ"];
const inputClass =
  "h-12 rounded-xl border-[1.5px] border-border px-4 text-[15px] focus:outline-none focus:border-ink transition";
const labelClass = "text-[13px] font-semibold text-ink";

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    nickname: "",
    school: "",
    gradeLevel: GRADE_OPTIONS[0],
    phone: "",
    email: "",
  });
  const [customGrade, setCustomGrade] = useState("");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    async function loadProfile() {
      const res = await fetch("/api/user/profile");
      if (res.ok) {
        const data = await res.json();
        const isStandardGrade = GRADE_OPTIONS.slice(0, 3).includes(data.gradeLevel);
        setForm({
          firstName: data.firstName ?? "",
          lastName: data.lastName ?? "",
          nickname: data.nickname ?? "",
          school: data.school ?? "",
          gradeLevel: isStandardGrade ? data.gradeLevel : "อื่น ๆ",
          phone: data.phone ?? "",
          email: data.email ?? "",
        });
        if (!isStandardGrade && data.gradeLevel) {
          setCustomGrade(data.gradeLevel);
        }
        if (data.avatarUrl) {
          setAvatarPreview(data.avatarUrl);
        }
      }
      setFetching(false);
    }
    loadProfile();
  }, []);

  function onAvatarChange(file: File | null) {
    setAvatar(file);
    if (file) setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    const finalGrade = form.gradeLevel === "อื่น ๆ" ? (customGrade.trim() || "อื่น ๆ") : form.gradeLevel;
    const formData = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      formData.append(k, k === "gradeLevel" ? finalGrade : v);
    });
    if (avatar) formData.append("avatar", avatar);

    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      body: formData,
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMessage({ type: "error", text: data.error ?? "บันทึกข้อมูลไม่สำเร็จ" });
      return;
    }

    // อัปเดต NextAuth Session ทันที (ให้รูปและชื่อบน Navbar เปลี่ยนตาม)
    await update({
      name: data.user.name,
      avatarUrl: data.user.avatarUrl,
    });

    setMessage({ type: "success", text: "บันทึกข้อมูลส่วนตัวเรียบร้อยแล้ว" });
  }

  if (fetching) return <div className="p-12 text-center text-secondary">กำลังโหลด...</div>;

  return (
    <div className="max-w-[700px] mx-auto px-6 py-12">
      <h1 className="text-[28px] font-extrabold tracking-[-0.02em] mb-8">ตั้งค่าบัญชีและโปรไฟล์</h1>

      {message.text && (
        <div
          className={`mb-6 p-4 rounded-xl text-sm ${
            message.type === "error"
              ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-green-50 text-green-700 border border-green-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6 bg-panel p-8 rounded-[24px]">
        {/* ส่วนรูปโปรไฟล์ */}
        <div className="flex items-center gap-6 pb-6 border-b border-border">
          <label className="relative w-20 h-20 rounded-full bg-white border-[1.5px] border-dashed border-border flex items-center justify-center cursor-pointer overflow-hidden hover:border-ink transition">
            {avatarPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarPreview} alt="รูปโปรไฟล์" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs text-muted text-center px-2">เพิ่มรูป</span>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onAvatarChange(e.target.files?.[0] ?? null)}
            />
          </label>
          <div>
            <div className="text-sm font-bold text-ink">รูปโปรไฟล์</div>
            <div className="text-xs text-secondary mt-1">คลิกที่รูปเพื่อเปลี่ยนรูปใหม่ (เก็บที่ Cloudflare R2)</div>
          </div>
        </div>

        {/* ชื่อจริง - นามสกุล */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>ชื่อจริง</label>
            <input
              type="text"
              required
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>นามสกุล</label>
            <input
              type="text"
              required
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>

        {/* ชื่อเล่น - ระดับชั้น */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>ชื่อเล่น</label>
            <input
              type="text"
              value={form.nickname}
              onChange={(e) => setForm({ ...form, nickname: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>ระดับชั้น</label>
            <select
              value={form.gradeLevel}
              onChange={(e) => setForm({ ...form, gradeLevel: e.target.value })}
              className={`${inputClass} bg-white`}
            >
              {GRADE_OPTIONS.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </div>
        </div>

        {form.gradeLevel === "อื่น ๆ" && (
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>โปรดระบุระดับชั้น</label>
            <input
              type="text"
              required
              placeholder="เช่น ปริญญาตรี, บุคคลทั่วไป"
              value={customGrade}
              onChange={(e) => setCustomGrade(e.target.value)}
              className={inputClass}
            />
          </div>
        )}

        {/* โรงเรียน - เบอร์โทร */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>โรงเรียน / สถาบัน</label>
            <input
              type="text"
              value={form.school}
              onChange={(e) => setForm({ ...form, school: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>เบอร์โทร</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>

        {/* อีเมล (อ่านอย่างเดียว) */}
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>อีเมล (ใช้เข้าสู่ระบบ)</label>
          <input
            type="email"
            disabled
            value={form.email}
            className={`${inputClass} bg-border/40 text-secondary cursor-not-allowed`}
          />
        </div>

        <button
          disabled={loading}
          className="mt-4 h-[48px] rounded-pill bg-ink text-white text-sm font-semibold hover:bg-dark-hover transition disabled:opacity-50"
        >
          {loading ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
        </button>
      </form>
    </div>
  );
}