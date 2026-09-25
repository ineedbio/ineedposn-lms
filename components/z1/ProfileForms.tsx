"use client";

import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { GRADES } from "@/lib/z1";
import { Field, GoalFields, Select, Spin, useZ1 } from "./client";

type U = Record<"firstName" | "lastName" | "nickname" | "grade" | "school" | "phone" | "email" | "avatarUrl" | "dreamFaculty" | "dreamUniversity" | "currentFaculty" | "currentUniversity", string>;

/** Profile, password and logout cards of the Apps Script profile page. */
export default function ProfileForms({ user }: { user: U }) {
  const router = useRouter();
  const { toast } = useZ1();
  const [v, setV] = useState<Record<string, string>>({ ...user });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [pw, setPw] = useState({ old: "", next: "" });
  const [pwErr, setPwErr] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const set = (k: string, x: string) => setV((o) => ({ ...o, [k]: x }));
  const grades = GRADES.includes(v.grade) || !v.grade ? GRADES : [v.grade, ...GRADES];

  async function saveProfile() {
    const fd = new FormData();
    for (const k of ["firstName", "lastName", "nickname", "school", "phone", "dreamFaculty", "dreamUniversity", "currentFaculty", "currentUniversity"]) fd.append(k, v[k] ?? "");
    fd.append("gradeLevel", v.grade ?? "");
    const res = await fetch("/api/user/profile", { method: "PATCH", body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "บันทึกไม่สำเร็จ");
    return data;
  }

  return (
    <>
      <form
        className="card form"
        onSubmit={async (e) => {
          e.preventDefault();
          setErr("");
          setBusy(true);
          try {
            await saveProfile();
            toast("บันทึกแล้ว");
            router.refresh();
          } catch (x) {
            setErr((x as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <h3>ข้อมูลผู้เรียน</h3>
        <div className="row2">
          <Field label="ชื่อ" name="firstName" value={v.firstName} onChange={(x) => set("firstName", x)} />
          <Field label="นามสกุล" name="lastName" value={v.lastName} onChange={(x) => set("lastName", x)} />
        </div>
        <div className="row2">
          <Field label="ชื่อเล่น" name="nickname" value={v.nickname} onChange={(x) => set("nickname", x)} />
          <Select label="ระดับชั้น" name="grade" value={v.grade || "ม.4"} options={grades} onChange={(x) => set("grade", x)} />
        </div>
        <Field label="โรงเรียน (หรือโรงเรียนที่จบมา)" name="school" value={v.school} onChange={(x) => set("school", x)} />
        <GoalFields v={v} set={set} />
        <div className="row2">
          <Field label="เบอร์โทร" name="phone" mode="tel" value={v.phone} onChange={(x) => set("phone", x)} />
          <Field label="อีเมล" name="email" value={v.email} disabled />
        </div>
        {err && <p className="err">{err}</p>}
        <button className="pill" style={{ justifySelf: "start" }} disabled={busy}>{busy ? <Spin /> : "บันทึก"}</button>
      </form>

      <form
        className="card form"
        onSubmit={async (e) => {
          e.preventDefault();
          setPwErr("");
          setPwBusy(true);
          try {
            const res = await fetch("/api/user/change-password", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ currentPassword: pw.old, newPassword: pw.next, confirmPassword: pw.next }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "เปลี่ยนรหัสผ่านไม่สำเร็จ");
            toast("เปลี่ยนรหัสผ่านแล้ว");
            setPw({ old: "", next: "" });
          } catch (x) {
            setPwErr((x as Error).message);
          } finally {
            setPwBusy(false);
          }
        }}
      >
        <h3>เปลี่ยนรหัสผ่าน</h3>
        <Field label="รหัสผ่านเดิม" name="old_password" type="password" auto="current-password" value={pw.old} onChange={(x) => setPw({ ...pw, old: x })} />
        <Field label="รหัสผ่านใหม่ (อย่างน้อย 8 ตัว)" name="password2" type="password" auto="new-password" value={pw.next} onChange={(x) => setPw({ ...pw, next: x })} />
        {pwErr && <p className="err">{pwErr}</p>}
        <button className="pill ghost" style={{ justifySelf: "start" }} disabled={pwBusy}>{pwBusy ? <Spin /> : "เปลี่ยนรหัสผ่าน"}</button>
      </form>

      <div className="card spread" style={{ order: 10 }}>
        <div><h3>ออกจากระบบ</h3><p className="sm ink2">ถ้าจะใช้เครื่องอื่น เข้าสู่ระบบที่เครื่องใหม่ได้เลย เครื่องนี้จะออกจากระบบเอง</p></div>
        <button className="pill danger" onClick={() => signOut({ callbackUrl: "/" })}>ออกจากระบบ</button>
      </div>
    </>
  );
}
