"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Badge, Btn, Field, api, inputCls, toast, useConfirm } from "@/components/admin/ui";
import { baht, subjectKey } from "@/lib/site";
import { youtubeId } from "@/lib/course-fields";
import CourseModal, { type CourseForm } from "../CourseModal";

type Attachment = { id: string; fileName: string; fileUrl: string };
type Lesson = {
  id: string;
  title: string;
  chapter: string;
  type: string;
  youtubeUrl: string;
  minutes: number;
  isPreview: boolean;
  hasQuiz: boolean;
  attachments: Attachment[];
};

const NO_CHAPTER = "ไม่ระบุบท";

export default function CourseAdmin({
  course: courseProp,
  subjects,
  subject,
  slug,
  students,
  lessons,
}: {
  course: CourseForm;
  subjects: { id: string; name: string }[];
  subject: { name: string; slug: string };
  slug: string;
  students: number;
  lessons: Lesson[];
}) {
  const router = useRouter();
  const course = courseProp as CourseForm & { id: string };
  const [editCourse, setEditCourse] = useState(false);
  const [editing, setEditing] = useState<Lesson | null>(null);
  const [items, setItems] = useState(lessons);
  const formRef = useRef<HTMLDivElement>(null);
  useEffect(() => setItems(lessons), [lessons]);

  const chapters: string[] = [];
  items.forEach((l) => {
    const ch = l.chapter || NO_CHAPTER;
    if (!chapters.includes(ch)) chapters.push(ch);
  });

  // ---- drag to reorder (a drop onto a lesson in another chapter moves it into that chapter) ----
  const dragId = useRef<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  async function drop(targetId: string) {
    const from = dragId.current;
    dragId.current = null;
    setOver(null);
    if (!from || from === targetId) return;
    const list = [...items];
    const fi = list.findIndex((l) => l.id === from);
    const moved = { ...list[fi] };
    list.splice(fi, 1);
    const ti = list.findIndex((l) => l.id === targetId);
    const target = list[ti];
    const chapterChanged = (moved.chapter || "") !== (target.chapter || "");
    moved.chapter = target.chapter;
    list.splice(fi <= ti ? ti + 1 : ti, 0, moved);
    setItems(list);
    try {
      await api("/api/admin/lessons/reorder", "POST", {
        courseId: course.id,
        order: list.map((l) => l.id),
        chapters: chapterChanged ? { [moved.id]: moved.chapter } : undefined,
      });
      toast("บันทึกลำดับใหม่แล้ว");
      router.refresh();
    } catch (e) {
      toast((e as Error).message, true);
      setItems(lessons);
    }
  }

  return (
    <div className={`s-${subjectKey(subject)} grid gap-5 px-6 py-7 md:px-8`}>
      <Link href="/admin/courses" className="w-fit text-sm text-secondary no-underline hover:text-ink">← คอร์สทั้งหมด</Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid gap-1">
          <span className="text-[13px] font-semibold text-accent">{subject.name} · {slug}</span>
          <h1 className="text-[26px] font-bold leading-tight">{course.title}</h1>
          <span className="text-sm text-secondary">
            {course.isPublished ? "เปิดขาย" : "ฉบับร่าง"} · {baht(Number(course.price) || 0)} · นักเรียน {students} คน
          </span>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <a href={`/courses/${slug}`} target="_blank" rel="noreferrer" className="rounded-pill border border-border px-3 py-0.5 text-[12.5px] text-secondary no-underline hover:opacity-85">
            ดูหน้าขาย
          </a>
          <Btn variant="ghost" small onClick={() => setEditCourse(true)}>แก้ไขข้อมูลและหน้าแนะนำ</Btn>
        </div>
      </div>

      <div ref={formRef} className="rounded-2xl border border-border p-5">
        <LessonForm
          key={editing?.id ?? "new"}
          courseId={course.id}
          lesson={editing}
          chapters={chapters.filter((c) => c !== NO_CHAPTER)}
          onDone={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[17px] font-bold">ลำดับตอน · {items.length} ตอน</h3>
        <span className="text-[13px] text-muted">ลาก ⋮⋮ เพื่อเรียงใหม่ ระบบบันทึกให้เอง</span>
      </div>
      {items.length ? (
        <div className="overflow-hidden rounded-2xl border border-border">
          {chapters.map((ch) => {
            const rows = items.filter((l) => (l.chapter || NO_CHAPTER) === ch);
            return (
              <div key={ch}>
                <div className="flex items-center justify-between border-b border-border bg-panel px-4 py-2 text-sm font-semibold">
                  <span>{ch}</span>
                  <span className="text-[12.5px] font-normal text-muted">{rows.length} ตอน</span>
                </div>
                {rows.map((l) => (
                  <div
                    key={l.id}
                    draggable
                    onDragStart={(e) => {
                      dragId.current = l.id;
                      e.dataTransfer.effectAllowed = "move";
                      try { e.dataTransfer.setData("text/plain", l.id); } catch {}
                    }}
                    onDragOver={(e) => {
                      if (!dragId.current || dragId.current === l.id) return;
                      e.preventDefault();
                      setOver(l.id);
                    }}
                    onDragLeave={() => setOver((o) => (o === l.id ? null : o))}
                    onDrop={(e) => {
                      e.preventDefault();
                      drop(l.id);
                    }}
                    onDragEnd={() => setOver(null)}
                    className={`flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0 ${over === l.id ? "bg-accent-soft" : "bg-paper"}`}
                  >
                    <span className="cursor-grab select-none text-muted" aria-hidden="true">⋮⋮</span>
                    <span className="min-w-0 flex-1 truncate">
                      {l.title}{" "}
                      {l.isPreview && <Badge tone="inv">ดูฟรี</Badge>}{" "}
                      {l.type === "QUIZ" && <Badge tone="wait">ข้อสอบ</Badge>}{" "}
                      {l.attachments.length > 0 && <Badge>ไฟล์ {l.attachments.length}</Badge>}
                    </span>
                    <span className="font-mono text-xs text-muted">{l.minutes} นาที</span>
                    <Btn
                      variant="quiet"
                      small
                      onClick={() => {
                        setEditing(l);
                        formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                      }}
                    >
                      แก้ไข
                    </Btn>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center text-secondary">ยังไม่มีตอน เพิ่มตอนแรกได้จากฟอร์มด้านบน</div>
      )}

      {editCourse && <CourseModal course={course} subjects={subjects} onClose={() => setEditCourse(false)} />}
    </div>
  );
}

function LessonForm({ courseId, lesson, chapters, onDone }: { courseId: string; lesson: Lesson | null; chapters: string[]; onDone: () => void }) {
  const [f, setF] = useState({
    chapter: lesson ? lesson.chapter : chapters[chapters.length - 1] ?? "บทที่ 1",
    title: lesson?.title ?? "",
    youtubeUrl: lesson?.youtubeUrl ?? "",
    durationMinutes: lesson?.minutes ? String(lesson.minutes) : "",
    isPreview: lesson?.isPreview ?? false,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [files, setFiles] = useState<Attachment[]>(lesson?.attachments ?? []);
  const [link, setLink] = useState({ name: "", url: "" });
  const [upBusy, setUpBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const { confirm, confirmNode } = useConfirm();
  const yt = f.youtubeUrl.trim();
  const ytid = youtubeId(yt);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      if (lesson) await api(`/api/admin/lessons/${lesson.id}`, "PATCH", f);
      else await api("/api/admin/lessons", "POST", { ...f, courseId });
      toast(lesson ? "บันทึกการแก้ไขแล้ว" : "เพิ่มตอนแล้ว");
      onDone();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  async function remove() {
    if (!lesson) return;
    const ok = await confirm({ title: "ลบตอนนี้?", body: `ตอน “${lesson.title}” จะหายจากคอร์ส ความคืบหน้าของนักเรียนในตอนนี้จะไม่ถูกนับ`, ok: "ลบตอน", danger: true });
    if (!ok) return;
    try {
      await api(`/api/admin/lessons/${lesson.id}`, "DELETE");
      toast("ลบตอนแล้ว");
      onDone();
    } catch (e) {
      toast((e as Error).message, true);
    }
  }

  async function uploadFile(file?: File) {
    if (!file || !lesson) return;
    setUpBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const a = await api<Attachment>(`/api/admin/lessons/${lesson.id}/attachments`, "POST", fd);
      setFiles((xs) => [...xs, a]);
      toast("อัปโหลดไฟล์แล้ว");
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setUpBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function addLink() {
    if (!lesson) return;
    try {
      const a = await api<Attachment>(`/api/admin/lessons/${lesson.id}/attachments`, "POST", { fileName: link.name, fileUrl: link.url });
      setFiles((xs) => [...xs, a]);
      setLink({ name: "", url: "" });
      toast("เพิ่มลิงก์แล้ว");
    } catch (e) {
      toast((e as Error).message, true);
    }
  }

  async function removeFile(a: Attachment) {
    try {
      await api(`/api/admin/attachments/${a.id}`, "DELETE");
      setFiles((xs) => xs.filter((x) => x.id !== a.id));
    } catch (e) {
      toast((e as Error).message, true);
    }
  }

  return (
    <form className="grid gap-3.5" onSubmit={save}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[17px] font-bold">{lesson ? "แก้ไขตอน" : "เพิ่มตอนใหม่"}</h3>
        {lesson && (
          <button type="button" onClick={onDone} className="text-sm text-secondary underline underline-offset-[3px] hover:text-ink">
            ยกเลิกการแก้ไข
          </button>
        )}
      </div>
      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field label="บท" hint="เลือกบทเดิม หรือพิมพ์ชื่อบทใหม่">
          <input className={inputCls} list="chlist" value={f.chapter} onChange={(e) => setF({ ...f, chapter: e.target.value })} placeholder="เช่น บทที่ 2 เซลล์" />
          <datalist id="chlist">{chapters.map((c) => <option key={c} value={c} />)}</datalist>
        </Field>
        <Field label="ชื่อตอน">
          <input className={inputCls} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="เช่น 2.5 การแบ่งเซลล์" required />
        </Field>
      </div>
      {lesson?.type !== "QUIZ" && (
        <Field label="ลิงก์ YouTube (ตั้งค่าคลิปเป็น Unlisted)">
          <input className={inputCls} value={f.youtubeUrl} onChange={(e) => setF({ ...f, youtubeUrl: e.target.value })} placeholder="https://youtu.be/..." />
        </Field>
      )}
      {yt && (ytid ? (
        <div className="flex items-center gap-3 rounded-xl bg-panel p-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`https://i.ytimg.com/vi/${ytid}/mqdefault.jpg`} alt="" className="h-[54px] w-24 flex-none rounded-lg bg-panel-2 object-cover" />
          <div className="text-sm">
            <div className="font-medium text-ok">✓ อ่านลิงก์ได้</div>
            <div className="text-[13px] text-muted">รหัสคลิป <span className="font-mono">{ytid}</span> · นักเรียนจะไม่เห็นลิงก์เต็ม</div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-no-soft px-3 py-2 text-sm text-no">ลิงก์นี้ไม่ใช่ลิงก์ YouTube ลองคัดลอกจากปุ่ม “แชร์” ใต้คลิปอีกครั้ง</div>
      ))}
      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field label="ความยาว (นาที)">
          <input className={inputCls} inputMode="numeric" value={f.durationMinutes} onChange={(e) => setF({ ...f, durationMinutes: e.target.value })} />
        </Field>
        <label className="flex items-center gap-2 self-end pb-2.5 text-sm">
          <input type="checkbox" checked={f.isPreview} onChange={(e) => setF({ ...f, isPreview: e.target.checked })} />
          ให้คนที่ยังไม่ซื้อดูตอนนี้ฟรี (ตอนตัวอย่าง)
        </label>
      </div>

      {lesson && (
        <div className="grid gap-2 rounded-xl border border-border p-3.5">
          <span className="text-sm font-medium">ไฟล์ประกอบ (ชีท / PDF)</span>
          {files.length > 0 && (
            <ul className="grid gap-1.5">
              {files.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 rounded-lg bg-panel px-3 py-1.5 text-sm">
                  <a href={a.fileUrl} target="_blank" rel="noreferrer" className="truncate">{a.fileName}</a>
                  <button type="button" onClick={() => removeFile(a)} className="text-muted hover:text-no" aria-label={`ลบ ${a.fileName}`}>×</button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <input ref={fileInput} type="file" hidden onChange={(e) => uploadFile(e.target.files?.[0])} />
            <Btn variant="quiet" small busy={upBusy} onClick={() => fileInput.current?.click()}>อัปโหลดไฟล์</Btn>
            <span className="text-[13px] text-muted">หรือแปะลิงก์</span>
            <input className={`${inputCls} !w-40 !py-1.5 text-sm`} placeholder="ชื่อไฟล์" value={link.name} onChange={(e) => setLink({ ...link, name: e.target.value })} />
            <input className={`${inputCls} !w-auto min-w-[200px] flex-1 !py-1.5 text-sm`} placeholder="https://drive.google.com/..." value={link.url} onChange={(e) => setLink({ ...link, url: e.target.value })} />
            <Btn variant="quiet" small disabled={!link.url.trim()} onClick={addLink}>เพิ่มลิงก์</Btn>
          </div>
        </div>
      )}
      {!lesson && <p className="text-[13px] text-muted">เพิ่มไฟล์ประกอบได้หลังบันทึกตอน (กด “แก้ไข” ที่ตอนนั้น)</p>}

      {err && <p className="text-sm text-no">{err}</p>}
      <div className="flex flex-wrap gap-2.5">
        <Btn type="submit" busy={busy}>{lesson ? "บันทึกการแก้ไข" : "เพิ่มตอน"}</Btn>
        {lesson && <Btn variant="danger" onClick={remove}>ลบตอนนี้</Btn>}
      </div>
      {confirmNode}
    </form>
  );
}
