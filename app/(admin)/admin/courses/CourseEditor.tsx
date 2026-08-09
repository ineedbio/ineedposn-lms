"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Attachment = { id: string; fileName: string; fileUrl: string };
type Lesson = {
  id: string;
  title: string;
  youtubeUrl: string | null;
  duration: number | null;
  isPreview: boolean;
  attachments: Attachment[];
};
type Course = {
  id: string;
  title: string;
  description: string;
  price: number;
  subjectId: string;
  isPublished: boolean;
  paymentQrUrl: string | null;
  lessons: Lesson[];
};

export default function CourseEditor({
  course,
  subjects,
}: {
  course: Course;
  subjects: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description);
  const [price, setPrice] = useState(course.price);
  const [subjectId, setSubjectId] = useState(course.subjectId);
  const [isPublished, setIsPublished] = useState(course.isPublished);
  const [qrUploading, setQrUploading] = useState(false);

  async function saveCourse(patch: Record<string, unknown>) {
    await fetch(`/api/admin/courses/${course.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    router.refresh();
  }

  async function deleteCourse() {
    if (!confirm("ลบคอร์สนี้? บทเรียนทั้งหมดจะถูกลบด้วย")) return;
    const res = await fetch(`/api/admin/courses/${course.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "ลบไม่สำเร็จ");
      return;
    }
    router.push("/admin/courses");
    router.refresh();
  }

  async function addLesson() {
    const res = await fetch("/api/admin/lessons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId: course.id }),
    });
    if (res.ok) router.refresh();
  }

  async function uploadQr(file: File | null) {
    if (!file) return;
    setQrUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    await fetch(`/api/admin/courses/${course.id}/qr`, { method: "POST", body: formData });
    setQrUploading(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-7">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-extrabold tracking-[-0.02em]">แก้ไขคอร์ส</h2>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm font-medium text-secondary cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => {
                setIsPublished(e.target.checked);
                saveCourse({ isPublished: e.target.checked });
              }}
            />
            เผยแพร่
          </label>
          <button
            onClick={deleteCourse}
            className="text-[13px] font-semibold text-muted hover:text-ink transition"
          >
            ลบคอร์สนี้
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-secondary">ชื่อคอร์ส</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => saveCourse({ title })}
            className="h-11 rounded-[10px] border-[1.5px] border-border px-3.5 text-sm focus:outline-none focus:border-ink transition"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-secondary">วิชา</label>
          <select
            value={subjectId}
            onChange={(e) => {
              setSubjectId(e.target.value);
              saveCourse({ subjectId: e.target.value });
            }}
            className="h-11 rounded-[10px] border-[1.5px] border-border px-3.5 text-sm bg-white focus:outline-none focus:border-ink transition"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-secondary">คำอธิบาย</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => saveCourse({ description })}
          rows={2}
          className="rounded-[10px] border-[1.5px] border-border px-3.5 py-2.5 text-sm focus:outline-none focus:border-ink transition resize-y"
        />
      </div>

      <div className="flex gap-8">
        <div className="flex flex-col gap-1.5 max-w-[220px]">
          <label className="text-xs font-semibold text-secondary">ราคา (บาท)</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            onBlur={() => saveCourse({ price })}
            className="h-11 rounded-[10px] border-[1.5px] border-border px-3.5 text-sm focus:outline-none focus:border-ink transition"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-secondary">
            QR PromptPay รับเงินคอร์สนี้
          </label>
          <div className="flex items-center gap-3">
            {course.paymentQrUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={course.paymentQrUrl}
                alt="QR PromptPay"
                className="w-16 h-16 rounded-lg border-[1.5px] border-border object-contain"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg border-[1.5px] border-dashed border-border flex items-center justify-center text-muted text-[10px] text-center">
                ยังไม่มี QR
              </div>
            )}
            <label className="cursor-pointer bg-panel border-[1.5px] border-border px-3.5 py-2.5 rounded-lg text-xs font-semibold text-ink hover:border-ink transition">
              {qrUploading ? "กำลังอัปโหลด..." : course.paymentQrUrl ? "เปลี่ยน QR" : "อัปโหลด QR"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => uploadQr(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          <p className="text-xs text-muted max-w-[280px]">
            แต่ละคอร์สตั้ง QR รับเงินของตัวเองได้ — ใช้เมื่อแต่ละคอร์สโอนเข้าคนละบัญชี
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3.5 pt-5 border-t border-border-light">
        <div className="flex justify-between items-center">
          <div className="text-base font-bold">บทเรียน (ลิงก์ YouTube)</div>
          <button
            onClick={addLesson}
            className="text-[13px] font-semibold text-ink bg-panel px-4 py-2 rounded-pill hover:bg-border-light transition-all duration-150 active:scale-[0.96]"
          >
            + เพิ่มบทเรียน
          </button>
        </div>

        {course.lessons.map((lesson, i) => (
          <LessonEditor key={lesson.id} lesson={lesson} index={i} onSaved={() => router.refresh()} />
        ))}
        {course.lessons.length === 0 && <p className="text-muted text-sm">ยังไม่มีบทเรียน</p>}
      </div>
    </div>
  );
}

function LessonEditor({
  lesson,
  index,
  onSaved,
}: {
  lesson: Lesson;
  index: number;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(lesson.title);
  const [minutes, setMinutes] = useState(lesson.duration ? Math.round(lesson.duration / 60) : 0);
  const [youtubeUrl, setYoutubeUrl] = useState(lesson.youtubeUrl ?? "");
  const [isPreview, setIsPreview] = useState(lesson.isPreview);
  const [uploading, setUploading] = useState(false);

  async function save(patch: Record<string, unknown>) {
    await fetch(`/api/admin/lessons/${lesson.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    onSaved();
  }

  async function remove() {
    if (!confirm("ลบบทเรียนนี้?")) return;
    await fetch(`/api/admin/lessons/${lesson.id}`, { method: "DELETE" });
    onSaved();
  }

  async function onFile(file: File | null) {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    await fetch(`/api/admin/lessons/${lesson.id}/attachments`, { method: "POST", body: formData });
    setUploading(false);
    onSaved();
  }

  async function removeAttachment(id: string) {
    await fetch(`/api/admin/attachments/${id}`, { method: "DELETE" });
    onSaved();
  }

  return (
    <div className="flex flex-col gap-2.5 p-3.5 rounded-2xl bg-panel">
      <div className="grid grid-cols-[24px_1fr_90px_50px] gap-3 items-center">
        <div className="text-[13px] text-muted text-center">{index + 1}</div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => save({ title })}
          placeholder="ชื่อบทเรียน"
          className="h-10 rounded-lg border-[1.5px] border-border px-3 text-[13px] bg-white focus:outline-none focus:border-ink transition"
        />
        <input
          type="number"
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
          onBlur={() => save({ durationMinutes: minutes })}
          placeholder="นาที"
          className="h-10 rounded-lg border-[1.5px] border-border px-3 text-[13px] bg-white focus:outline-none focus:border-ink transition"
        />
        <button
          onClick={remove}
          className="text-[13px] font-semibold text-muted hover:text-ink transition text-center"
        >
          ลบ
        </button>
      </div>
      <input
        value={youtubeUrl}
        onChange={(e) => setYoutubeUrl(e.target.value)}
        onBlur={() => save({ youtubeUrl })}
        placeholder="ลิงก์วิดีโอ YouTube: https://youtube.com/watch?v=..."
        className="h-10 rounded-lg border-[1.5px] border-border px-3 text-[13px] bg-white focus:outline-none focus:border-ink transition w-full"
      />
      <div className="flex items-center gap-3 flex-wrap">
        <label className="flex items-center gap-1.5 text-xs font-medium text-secondary cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isPreview}
            onChange={(e) => {
              setIsPreview(e.target.checked);
              save({ isPreview: e.target.checked });
            }}
          />
          เปิดให้ทดลองเรียนฟรี
        </label>
        <label className="cursor-pointer bg-white border-[1.5px] border-border px-3.5 py-2 rounded-lg text-xs font-semibold text-ink hover:border-ink transition">
          {uploading ? "กำลังอัปโหลด..." : "แนบไฟล์ประกอบการเรียน"}
          <input type="file" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
        </label>
        {lesson.attachments.map((a) => (
          <div
            key={a.id}
            className="flex items-center gap-2 text-xs font-semibold bg-white border-[1.5px] border-border px-3 py-1.5 rounded-pill"
          >
            <a href={a.fileUrl} target="_blank" rel="noreferrer" className="truncate max-w-[140px]">
              {a.fileName}
            </a>
            <button onClick={() => removeAttachment(a.id)} className="text-muted hover:text-ink">
              ×
            </button>
          </div>
        ))}
        {lesson.attachments.length === 0 && (
          <div className="text-xs text-muted">ยังไม่มีไฟล์แนบ (PDF, สไลด์, ใบงาน)</div>
        )}
      </div>
    </div>
  );
}
