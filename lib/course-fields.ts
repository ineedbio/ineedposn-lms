/** Pulls the 11-character video id out of any YouTube link (or accepts a bare id). */
export function youtubeId(input: unknown): string | null {
  const s = String(input ?? "").trim();
  if (!s) return null;
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  const m = s.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

const TEXT_FIELDS = [
  "title", "description", "subtitle", "level", "highlights", "audience",
  "instructorName", "instructorTitle", "instructorBio", "instructorPhoto", "faq", "coverImage",
] as const;

/**
 * Validates the course fields sent by the admin course modal. Only keys present
 * in the body are returned, so PATCH updates just what changed.
 */
export function parseCourseFields(body: any): { data: Record<string, unknown>; error?: string } {
  const data: Record<string, unknown> = {};
  for (const k of TEXT_FIELDS) {
    if (typeof body[k] === "string") data[k] = body[k].trim() || (k === "title" || k === "description" ? "" : null);
  }
  if ("title" in data && !data.title) return { data, error: "ใส่ชื่อคอร์ส" };
  for (const k of ["price", "fullPrice", "sortOrder"] as const) {
    if (body[k] === undefined) continue;
    if (body[k] === "" || body[k] === null) {
      if (k === "fullPrice") data[k] = null;
      continue;
    }
    const n = Number(body[k]);
    if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) return { data, error: "ราคาและลำดับต้องเป็นจำนวนเต็มไม่ติดลบ" };
    data[k] = n;
  }
  if (typeof body.subjectId === "string" && body.subjectId) data.subjectId = body.subjectId;
  if (typeof body.isPublished === "boolean") data.isPublished = body.isPublished;
  if (body.trailerYoutube !== undefined) {
    const raw = String(body.trailerYoutube ?? "").trim();
    const id = youtubeId(raw);
    if (raw && !id) return { data, error: "ลิงก์คลิปแนะนำไม่ใช่ลิงก์ YouTube" };
    data.trailerYoutube = id;
  }
  for (const k of ["coverImage", "instructorPhoto"] as const) {
    const v = data[k];
    if (typeof v === "string" && !/^https:\/\//.test(v)) return { data, error: "ลิงก์รูปต้องขึ้นต้นด้วย https://" };
  }
  return { data };
}

/** Validates lesson fields from the admin lesson form (only keys present in the body). */
export function parseLessonFields(body: any): { data: Record<string, unknown>; error?: string } {
  const data: Record<string, unknown> = {};
  if (typeof body.title === "string") {
    if (!body.title.trim()) return { data, error: "ใส่ชื่อตอน" };
    data.title = body.title.trim();
  }
  if (typeof body.chapter === "string") data.chapter = body.chapter.trim() || null;
  if (typeof body.youtubeUrl === "string") {
    const raw = body.youtubeUrl.trim();
    const id = youtubeId(raw);
    if (raw && !id) return { data, error: "ลิงก์นี้ไม่ใช่ลิงก์ YouTube" };
    data.youtubeUrl = id ? `https://www.youtube.com/embed/${id}` : null;
  }
  if (body.durationMinutes !== undefined && body.durationMinutes !== "") {
    const n = Number(body.durationMinutes);
    if (!Number.isFinite(n) || n < 0) return { data, error: "ความยาวต้องเป็นตัวเลข (นาที)" };
    data.duration = Math.round(n * 60);
  }
  if (typeof body.isPreview === "boolean") data.isPreview = body.isPreview;
  return { data };
}
