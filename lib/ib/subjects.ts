// Maps a Subject row (by slug, falling back to name) to the web app's four subject keys.
export type SubjectKey = "bio" | "chem" | "phys" | "math";

export function subjectKey(s: { slug?: string | null; name?: string | null } | null | undefined): SubjectKey {
  const t = `${s?.slug ?? ""} ${s?.name ?? ""}`.toLowerCase();
  if (/chem|เคมี/.test(t)) return "chem";
  if (/phys|ฟิสิก/.test(t)) return "phys";
  if (/math|คณิต/.test(t)) return "math";
  return "bio";
}
