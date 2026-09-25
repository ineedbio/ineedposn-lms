"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ImageField from "@/components/admin/ImageField";
import { AdminHeader, Badge, Btn, Empty, Field, Modal, api, inputCls, toast, useConfirm } from "@/components/admin/ui";

type Row = {
  id?: string;
  nickname: string;
  year: string;
  subjectId: string;
  subjectName?: string;
  school: string;
  center: string;
  review: string;
  photoUrl: string;
  isPublished: boolean;
  sortOrder: string;
};

export default function ResultsClient({ rows, subjects }: { rows: Row[]; subjects: { id: string; name: string }[] }) {
  const [edit, setEdit] = useState<Row | null>(null);
  const blank: Row = { nickname: "", year: String(new Date().getFullYear() + 543), subjectId: subjects[0]?.id ?? "", school: "", center: "", review: "", photoUrl: "", isPublished: true, sortOrder: "0" };
  return (
    <div className="grid gap-5 px-6 py-7 md:px-8">
      <AdminHeader title="ผลงานนักเรียน" sub={'น้องที่ติดค่ายจะขึ้นในส่วน "Hall of fame" บนหน้าแรก หน้า "ผลงานน้องๆ" และรีวิวจะขึ้นในหน้าคอร์สวิชาเดียวกัน'}>
        <Btn small onClick={() => setEdit(blank)}>+ เพิ่มน้อง</Btn>
      </AdminHeader>
      {rows.length ? (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-panel text-left text-[13px] text-secondary">
              <tr>
                <th className="w-14 px-4 py-2.5" />
                <th className="px-4 py-2.5 font-medium">ชื่อเล่น</th>
                <th className="px-4 py-2.5 font-medium">สาขา · ปี</th>
                <th className="px-4 py-2.5 font-medium">ศูนย์</th>
                <th className="px-4 py-2.5 font-medium">รีวิว</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-4 py-2.5">
                    <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-panel text-xs text-muted">
                      {r.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.photoUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        r.nickname.slice(0, 1)
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {r.nickname} {!r.isPublished && <Badge>ซ่อน</Badge>}
                    <div className="text-[12.5px] text-muted">{r.school}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    {r.subjectName}
                    <div className="text-[12.5px] text-muted">{r.year}</div>
                  </td>
                  <td className="px-4 py-2.5 text-[13.5px]">{r.center || "–"}</td>
                  <td className="px-4 py-2.5 text-[13.5px]">{r.review ? "มี" : <span className="text-muted">ไม่มี</span>}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Btn variant="quiet" small onClick={() => setEdit(r)}>แก้ไข</Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>ยังไม่มีข้อมูล เพิ่มน้องคนแรกได้เลย</Empty>
      )}
      {edit && <ResultModal r={edit} subjects={subjects} onClose={() => setEdit(null)} />}
    </div>
  );
}

function ResultModal({ r, subjects, onClose }: { r: Row; subjects: { id: string; name: string }[]; onClose: () => void }) {
  const router = useRouter();
  const [f, setF] = useState(r);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const { confirm, confirmNode } = useConfirm();
  const set = (k: keyof Row) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const { id, subjectName, ...body } = f;
      await api(id ? `/api/admin/results/${id}` : "/api/admin/results", id ? "PATCH" : "POST", body);
      toast("บันทึกแล้ว");
      onClose();
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }
  async function remove() {
    if (!(await confirm({ title: `ลบ ${r.nickname}?`, body: "ข้อมูลและรีวิวของน้องจะหายจากเว็บ", ok: "ลบ", danger: true }))) return;
    try {
      await api(`/api/admin/results/${r.id}`, "DELETE");
      toast("ลบแล้ว");
      onClose();
      router.refresh();
    } catch (e) {
      toast((e as Error).message, true);
    }
  }

  return (
    <Modal wide title={r.id ? "แก้ไขข้อมูลน้อง" : "เพิ่มน้องที่ติดค่าย"} onClose={onClose}>
      <form className="grid gap-3.5" onSubmit={save}>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="ชื่อเล่น (แสดงบนเว็บ)"><input className={inputCls} value={f.nickname} onChange={set("nickname")} required /></Field>
          <Field label="ปี พ.ศ."><input className={inputCls} inputMode="numeric" value={f.year} onChange={set("year")} /></Field>
        </div>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="สาขาที่ติด">
            <select className={inputCls} value={f.subjectId} onChange={set("subjectId")}>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="การแสดงผล">
            <select className={inputCls} value={f.isPublished ? "1" : ""} onChange={(e) => setF({ ...f, isPublished: !!e.target.value })}>
              <option value="1">แสดงบนเว็บ</option>
              <option value="">ซ่อน</option>
            </select>
          </Field>
        </div>
        <Field label="โรงเรียน"><input className={inputCls} value={f.school} onChange={set("school")} /></Field>
        <Field label="ศูนย์ สอวน."><input className={inputCls} value={f.center} onChange={set("center")} placeholder="เช่น ศูนย์มหาวิทยาลัยศิลปากร" /></Field>
        <Field label="รีวิวจากน้อง (เว้นว่างได้)"><textarea className={`${inputCls} min-h-[92px] resize-y`} value={f.review} onChange={set("review")} /></Field>
        <Field label="รูปน้อง">
          <ImageField folder="results" value={f.photoUrl} onChange={(v) => setF({ ...f, photoUrl: v })} placeholder="https://... หรือกดอัปโหลดรูป" />
        </Field>
        <Field label="ลำดับการแสดง (น้อยขึ้นก่อน)"><input className={inputCls} inputMode="numeric" value={f.sortOrder} onChange={set("sortOrder")} /></Field>
        <p className="text-[13px] text-muted">ขออนุญาตน้องก่อนใช้รูปและรีวิวบนเว็บ บนเว็บจะแสดงแค่ชื่อเล่น โรงเรียน และศูนย์</p>
        {err && <p className="text-sm text-no">{err}</p>}
        <div className="flex flex-wrap gap-2.5">
          <Btn type="submit" busy={busy}>บันทึก</Btn>
          {r.id && <Btn variant="danger" onClick={remove}>ลบ</Btn>}
        </div>
      </form>
      {confirmNode}
    </Modal>
  );
}
