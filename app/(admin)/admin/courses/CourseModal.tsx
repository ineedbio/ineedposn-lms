"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import ImageField from "@/components/admin/ImageField";
import { Btn, Field, Modal, Section, api, inputCls, toast, useConfirm } from "@/components/admin/ui";

export type CourseForm = {
  id?: string;
  title: string;
  subjectId: string;
  level: string;
  isPublished: boolean;
  subtitle: string;
  price: string;
  fullPrice: string;
  sortOrder: string;
  coverImage: string;
  trailerYoutube: string;
  highlights: string;
  audience: string;
  description: string;
  instructorName: string;
  instructorTitle: string;
  instructorBio: string;
  instructorPhoto: string;
  faq: string;
  paymentQrUrl?: string | null;
};

const LEVELS = ["สอวน.", "A-Level", "ม.4", "ม.5", "ม.6", "ม.ต้น", "อื่นๆ"];

export default function CourseModal({ course, subjects, onClose }: { course?: CourseForm; subjects: { id: string; name: string }[]; onClose: () => void }) {
  const router = useRouter();
  const isNew = !course?.id;
  const [f, setF] = useState<CourseForm & { slug?: string }>(
    course ?? {
      title: "", subjectId: subjects[0]?.id ?? "", level: "", isPublished: false, subtitle: "", price: "790", fullPrice: "", sortOrder: "0",
      coverImage: "", trailerYoutube: "", highlights: "", audience: "", description: "", instructorName: "", instructorTitle: "",
      instructorBio: "", instructorPhoto: "", faq: "", slug: "",
    }
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [qr, setQr] = useState(course?.paymentQrUrl ?? null);
  const [qrBusy, setQrBusy] = useState(false);
  const qrInput = useRef<HTMLInputElement>(null);
  const { confirm, confirmNode } = useConfirm();
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const { id, paymentQrUrl, ...body } = f;
    try {
      const saved = await api<{ id: string }>(isNew ? "/api/admin/courses" : `/api/admin/courses/${id}`, isNew ? "POST" : "PATCH", body);
      toast("บันทึกคอร์สแล้ว");
      onClose();
      if (isNew) router.push(`/admin/courses/${saved.id}`);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  async function uploadQr(file?: File) {
    if (!file || !course?.id) return;
    setQrBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await api<{ paymentQrUrl: string }>(`/api/admin/courses/${course.id}/qr`, "POST", fd);
      setQr(r.paymentQrUrl);
      toast("อัปโหลด QR แล้ว");
      router.refresh();
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setQrBusy(false);
    }
  }

  async function remove() {
    if (!course?.id) return;
    const ok = await confirm({ title: `ลบคอร์ส “${course.title}”?`, body: "บทเรียนทั้งหมดในคอร์สนี้จะถูกลบด้วย ลบไม่ได้ถ้ามีนักเรียนลงทะเบียนหรือชำระเงินแล้ว", ok: "ลบคอร์ส", danger: true });
    if (!ok) return;
    try {
      await api(`/api/admin/courses/${course.id}`, "DELETE");
      toast("ลบคอร์สแล้ว");
      onClose();
      router.push("/admin/courses");
      router.refresh();
    } catch (e) {
      toast((e as Error).message, true);
    }
  }

  const area = (k: keyof typeof f, ph = "") => <textarea className={`${inputCls} min-h-[92px] resize-y`} value={String(f[k] ?? "")} onChange={set(k)} placeholder={ph} />;
  const text = (k: keyof typeof f, ph = "", mode?: "numeric") => <input className={inputCls} value={String(f[k] ?? "")} onChange={set(k)} placeholder={ph} inputMode={mode} />;

  return (
    <Modal wide title={isNew ? "คอร์สใหม่" : "แก้ไขคอร์ส"} onClose={onClose}>
      <form className="grid gap-3.5" onSubmit={save}>
        <Section title="ข้อมูลหลัก" />
        {isNew && (
          <Field label="รหัสคอร์ส (ภาษาอังกฤษ ใช้ในลิงก์)" hint="เว้นว่างได้ ระบบจะสร้างให้">
            {text("slug", "เช่น bio-posn-2027")}
          </Field>
        )}
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="วิชา">
            <select className={inputCls} value={f.subjectId} onChange={set("subjectId")}>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="ระดับ / สนามสอบ">
            <select className={inputCls} value={f.level} onChange={set("level")}>
              <option value="">— ไม่ระบุ —</option>
              {LEVELS.concat(f.level && !LEVELS.includes(f.level) ? [f.level] : []).map((l) => <option key={l}>{l}</option>)}
            </select>
          </Field>
        </div>
        <Field label="สถานะ">
          <select className={inputCls} value={f.isPublished ? "1" : ""} onChange={(e) => setF({ ...f, isPublished: !!e.target.value })}>
            <option value="">ฉบับร่าง (ยังไม่แสดงหน้าเว็บ)</option>
            <option value="1">เปิดขาย</option>
          </select>
        </Field>
        <Field label="ชื่อคอร์ส">{text("title")}</Field>
        <Field label="คำโปรยสั้น (แสดงบนการ์ดและใต้ชื่อคอร์ส)">{text("subtitle")}</Field>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="ราคาขาย (บาท)">{text("price", "", "numeric")}</Field>
          <Field label="ราคาเต็ม (ขีดฆ่า, ไม่ใส่ก็ได้)">{text("fullPrice", "เช่น 1090", "numeric")}</Field>
        </div>
        <Field label="ลำดับการแสดง (น้อยขึ้นก่อน)">{text("sortOrder", "", "numeric")}</Field>
        <Field label="รูปปกคอร์ส (ไม่ใส่ก็ได้)">
          <ImageField folder="covers" value={f.coverImage} onChange={(v) => setF({ ...f, coverImage: v })} />
        </Field>

        {!isNew && (
          <>
            <Section title="การรับเงิน" hint="ถ้าคอร์สนี้โอนเข้าบัญชีอื่น อัปโหลดรูป QR รับเงินของบัญชีนั้น ถ้าไม่ใส่ ระบบใช้พร้อมเพย์กลางในหน้าตั้งค่า" />
            <div className="flex items-center gap-3">
              {qr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qr} alt="QR รับเงิน" className="h-20 w-20 rounded-lg border border-border bg-white object-contain" />
              ) : (
                <div className="grid h-20 w-20 place-items-center rounded-lg border border-dashed border-border text-center text-[11px] text-muted">ใช้ QR กลาง</div>
              )}
              <input ref={qrInput} type="file" accept="image/*" hidden onChange={(e) => uploadQr(e.target.files?.[0])} />
              <Btn variant="quiet" small busy={qrBusy} onClick={() => qrInput.current?.click()}>{qr ? "เปลี่ยน QR" : "อัปโหลด QR"}</Btn>
            </div>
          </>
        )}

        <Section title="หน้าแนะนำคอร์ส" hint="ช่องไหนเว้นว่าง ส่วนนั้นจะไม่แสดงบนหน้าเว็บ" />
        <Field label="คลิปแนะนำคอร์ส (ลิงก์ YouTube)" hint="แสดงใต้ชื่อคอร์ส ทุกคนดูได้ ใช้คลิป Unlisted หรือ Public ก็ได้">
          {text("trailerYoutube", "https://youtu.be/...")}
        </Field>
        <Field label="จุดเด่นของคอร์ส (บรรทัดละ 1 ข้อ)">{area("highlights", "ครบทุกบทตามขอบเขต สอวน.\nมีชีทสรุปทุกบท\nตะลุยข้อสอบเก่า 10 ปี")}</Field>
        <Field label="คอร์สนี้เหมาะกับ (บรรทัดละ 1 ข้อ)">{area("audience", "นักเรียน ม.3–ม.5 ที่จะสอบค่าย 1\nคนที่ยังไม่เคยเรียนชีวะเชิงลึก")}</Field>
        <Field label="รายละเอียดคอร์ส">{area("description")}</Field>

        <Section title="ผู้สอน" />
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="ชื่อผู้สอน">{text("instructorName", "เช่น พี่ไอซ์")}</Field>
          <Field label="ตำแหน่ง / ผลงานสั้น ๆ">{text("instructorTitle", "เช่น อดีตผู้แทนค่าย สอวน.")}</Field>
        </div>
        <Field label="ประวัติผู้สอน (บรรทัดละ 1 ข้อ จะแสดงเป็นรายการ)">{area("instructorBio", "จบจากโรงเรียน...\nค่าย 1 โอลิมปิกวิชาการ สาขา...\nปัจจุบัน...")}</Field>
        <Field label="รูปผู้สอน (ไม่ใส่ก็ได้)">
          <ImageField folder="instructors" value={f.instructorPhoto} onChange={(v) => setF({ ...f, instructorPhoto: v })} />
        </Field>

        <Section title="คำถามที่พบบ่อย" hint="แต่ละข้อเว้น 1 บรรทัดว่าง บรรทัดแรกเป็นคำถาม บรรทัดต่อไปเป็นคำตอบ ระบบเติมคำถามพื้นฐาน (ดูได้นานแค่ไหน, กี่เครื่อง, อนุมัติเมื่อไร) ต่อท้ายให้เอง" />
        <Field label="คำถามเฉพาะคอร์สนี้">{area("faq", "ต้องมีพื้นฐานอะไรก่อนไหม\nไม่ต้อง คอร์สเริ่มจากพื้นฐาน\n\nมีแบบฝึกหัดไหม\nมีท้ายทุกบท")}</Field>

        {err && <p className="text-sm text-no">{err}</p>}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <Btn type="submit" busy={busy}>บันทึกคอร์ส</Btn>
          {!isNew && <Btn variant="danger" small onClick={remove}>ลบคอร์ส</Btn>}
        </div>
      </form>
      {confirmNode}
    </Modal>
  );
}
