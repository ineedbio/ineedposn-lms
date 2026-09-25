"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Btn, Field, api, inputCls, toast } from "@/components/admin/ui";
import { DEFAULT_PRIVACY, DEFAULT_TERMS } from "@/lib/legal";
import { SETTING_KEYS, type Settings } from "@/lib/setting-keys";

export default function SettingsClient({ saved, defaults }: { saved: Record<string, string>; defaults: Settings }) {
  const router = useRouter();
  const [f, setF] = useState<Record<string, string>>(() => Object.fromEntries(SETTING_KEYS.map((k) => [k, saved[k] ?? ""])));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const input = (k: string, ph?: string, mode?: "numeric") => (
    <input className={inputCls} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} placeholder={ph ?? (defaults as any)[k]} inputMode={mode} />
  );
  const area = (k: string) => <textarea className={`${inputCls} min-h-[160px] resize-y font-mono text-[13px]`} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} placeholder="เว้นว่าง = ใช้ข้อความมาตรฐาน" />;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await api("/api/admin/settings", "PUT", f);
      toast("บันทึกแล้ว");
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5 px-6 py-7 md:px-8">
      <h1 className="text-[26px] font-bold">ตั้งค่า</h1>
      <form className="grid max-w-[640px] gap-3.5 rounded-2xl border border-border p-5" onSubmit={save}>
        <h3 className="text-base font-bold">หน้าแรก</h3>
        <Field label="ข้อความเล็กเหนือหัวข้อ">{input("hero_eyebrow")}</Field>
        <Field label="หัวข้อใหญ่ (ใส่ | เพื่อขึ้นบรรทัดใหม่ บรรทัดที่ 2 จะเป็นสีเขียว)">{input("hero_title")}</Field>
        <Field label="ข้อความใต้หัวข้อ">{input("hero_subtitle")}</Field>

        <h3 className="mt-1.5 text-base font-bold">ทั่วไป</h3>
        <Field label="ประกาศบนหัวเว็บ (เว้นว่างเพื่อซ่อน)">{input("announcement", "เช่น เปิดรับสมัครคอร์สชีววิทยา สอวน. รอบ 2027 แล้ว")}</Field>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="เบอร์หรือเลขบัตรพร้อมเพย์">{input("promptpay_id", defaults.promptpay_id, "numeric")}</Field>
          <Field label="ชื่อบัญชีที่แสดงใต้ QR">{input("promptpay_name")}</Field>
        </div>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="IG ติดต่อ (ไม่ต้องใส่ @)">{input("contact_ig")}</Field>
          <Field label="เบอร์ติดต่อเรื่องด่วน">{input("contact_phone")}</Field>
        </div>

        <h3 className="mt-1.5 text-base font-bold">ข้อตกลงและนโยบาย</h3>
        <p className="text-[13px] text-muted">
          เว้นว่างไว้ = ใช้ข้อความมาตรฐานของระบบ ถ้าจะแก้ ให้กดปุ่มด้านล่างเพื่อใส่ข้อความมาตรฐานลงช่องแล้วแก้ต่อ ใช้ # หัวข้อใหญ่, ## หัวข้อย่อย, - รายการ และ {"{ig}"} {"{phone}"} แทนช่องทางติดต่อ
        </p>
        <Btn
          variant="quiet"
          small
          className="justify-self-start"
          onClick={() => setF({ ...f, terms_text: f.terms_text || DEFAULT_TERMS, privacy_text: f.privacy_text || DEFAULT_PRIVACY })}
        >
          ใส่ข้อความมาตรฐานลงในช่องเพื่อแก้ไข
        </Btn>
        <Field label="ข้อตกลงการใช้งาน">{area("terms_text")}</Field>
        <Field label="นโยบายความเป็นส่วนตัว">{area("privacy_text")}</Field>
        <Field label="อีเมลที่รับแจ้งเตือนคำขอใหม่ (คั่นด้วย , )">{input("admin_emails", "a@gmail.com, b@gmail.com")}</Field>
        {err && <p className="text-sm text-no">{err}</p>}
        <Btn type="submit" busy={busy} className="justify-self-start">บันทึก</Btn>
      </form>
    </div>
  );
}
