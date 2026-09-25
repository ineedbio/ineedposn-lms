// Site-wide copy and contact details shown in the header, hero and footer.
// Hero text, contact details and PromptPay are editable in หลังบ้าน → ตั้งค่า (lib/settings.ts).
export const SITE = {
  name: "INeedBio",
  domain: "ineedbio.shop",
};

export type SubjectKey = "bio" | "chem" | "phys" | "math";

const SHORT: Record<SubjectKey, string> = { bio: "ชีวะ", chem: "เคมี", phys: "ฟิสิกส์", math: "คณิต" };

/** Maps a Subject (by slug, falling back to name) to one of the four accent colors in globals.css. */
export function subjectKey(s: { slug?: string | null; name?: string | null } | null | undefined): SubjectKey {
  const t = `${s?.slug ?? ""} ${s?.name ?? ""}`.toLowerCase();
  if (/chem|เคมี/.test(t)) return "chem";
  if (/phys|ฟิสิก/.test(t)) return "phys";
  if (/math|คณิต/.test(t)) return "math";
  return "bio";
}

/** Short Thai label used on typographic course covers ("ชีวะ", "เคมี" …). */
export function subjectShort(s: { slug?: string | null; name?: string | null } | null | undefined) {
  return SHORT[subjectKey(s)];
}

export function baht(n: number) {
  return n === 0 ? "ฟรี" : `฿${n.toLocaleString("th-TH")}`;
}

/** "1 ชม. 20 นาที" from a number of seconds. */
export function duration(seconds: number) {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} นาที`;
  return `${Math.floor(m / 60)} ชม.${m % 60 ? ` ${m % 60} นาที` : ""}`;
}
