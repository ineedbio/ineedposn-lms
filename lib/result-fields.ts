/** Validates a "ผลงานนักเรียน" (hall of fame) entry from the admin form. */
export function parseResultFields(body: any): { data: Record<string, unknown>; error?: string } {
  const data: Record<string, unknown> = {};
  const str = (k: string) => (typeof body[k] === "string" ? body[k].trim() : undefined);
  const nickname = str("nickname");
  if (nickname !== undefined) {
    if (!nickname) return { data, error: "ใส่ชื่อเล่น" };
    data.nickname = nickname;
  }
  const year = str("year");
  if (year !== undefined) {
    if (!/^25\d\d$/.test(year)) return { data, error: "ปี พ.ศ. ต้องเป็นตัวเลข 4 หลัก เช่น 2569" };
    data.year = year;
  }
  for (const k of ["school", "center", "review", "photoUrl"]) {
    const v = str(k);
    if (v !== undefined) data[k] = v || null;
  }
  if (typeof data.photoUrl === "string" && !/^https:\/\//.test(data.photoUrl)) return { data, error: "ลิงก์รูปต้องขึ้นต้นด้วย https://" };
  if (typeof body.subjectId === "string") data.subjectId = body.subjectId || null;
  if (typeof body.isPublished === "boolean") data.isPublished = body.isPublished;
  if (body.sortOrder !== undefined && body.sortOrder !== "") {
    const n = Number(body.sortOrder);
    if (!Number.isInteger(n)) return { data, error: "ลำดับต้องเป็นจำนวนเต็ม" };
    data.sortOrder = n;
  }
  return { data };
}
