// ชีทสรุป (summary sheet PDFs) — back office only.
// The storefront isn't open yet: SHEETS_ON_SALE is the switch for the whole feature, and until it is true no
// public action reads these tables (every action below is registered as adminOnly in api.ts). The future
// shop page follows the approved demo (cover title, subject, pages, "ดูตัวอย่างฟรี N หน้า", bundles).
//
// PDFs are stored like other uploads (FileBlob), split in parts: a request to the API can't carry more than
// ~4 MB, so the admin page sends a file in parts (admin.sheet.part) and then attaches them in order
// (admin.sheet.file.commit). Reading a file back works the same way, one part per request.
import type { Sheet, SheetBundle, User } from "@prisma/client";
import { prisma } from "../prisma";
import { log, type Ctx, type Data } from "./api";
import { APP, clip, err, iso } from "./util";

export const SHEETS_ON_SALE = false;

const PART_MAX = 2 * 1024 * 1024 + 1024; // raw bytes per part (the page sends 2 MB)
const FULL_MAX = 60 * 1024 * 1024, SAMPLE_MAX = 15 * 1024 * 1024;
const PART_MIME = "application/x-ib-part", PDF_PART_MIME = "application/pdf-part";
type Kind = "file" | "sample";

const csv = (v: unknown) => String(v || "").split(",").map((x) => x.trim()).filter(Boolean);
const month = (v: unknown) => {
  const m = String(v || "").trim();
  if (m && !/^20\d\d-(0[1-9]|1[0-2])$/.test(m)) throw err("BAD_INPUT", "เลือกเดือนและปีที่อัปเดตล่าสุด");
  return m || null;
};
const int = (v: unknown, label: string, opt = false) => {
  const s = String(v ?? "").replace(/[,฿\s]/g, "");
  if (s === "") { if (opt) return null; throw err("BAD_INPUT", "ใส่" + label); }
  const n = Math.round(Number(s));
  if (!isFinite(n) || n < 0) throw err("BAD_INPUT", label + "ต้องเป็นตัวเลข 0 ขึ้นไป");
  return n;
};
const kindOf = (v: unknown): Kind => (v === "sample" ? "sample" : "file");

function sheetOut(s: Sheet) {
  return {
    sheet_id: s.id, title: s.title, cover_title: s.coverTitle || "", subject: s.subject, subject_name: APP.SUBJECTS[s.subject] || s.subject,
    price: s.price, full_price: s.fullPrice || 0, pages: s.pages || 0, sample_pages: s.samplePages || 0, description: s.description || "",
    updated_month: s.updatedMonth || "", sort_order: s.sortOrder,
    file: s.fileParts ? { name: s.fileName, size: s.fileSize, parts: csv(s.fileParts).length } : null,
    sample: s.sampleParts ? { name: s.sampleName, size: s.sampleSize, parts: csv(s.sampleParts).length } : null,
    updated_at: iso(s.updatedAt),
  };
}
function bundleOut(b: SheetBundle, all: Sheet[]) {
  const ids = csv(b.sheetIds).filter((id) => all.some((s) => s.id === id));
  const normal = ids.reduce((a, id) => a + (all.find((s) => s.id === id)?.price || 0), 0);
  return { bundle_id: b.id, title: b.title, description: b.description || "", price: b.price, sheet_ids: ids, normal, save: Math.max(0, normal - b.price), sort_order: b.sortOrder };
}

export async function adminSheets() {
  const [list, bundles] = await Promise.all([
    prisma.sheet.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.sheetBundle.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
  ]);
  return { on_sale: SHEETS_ON_SALE, sheets: list.map(sheetOut), bundles: bundles.map((b) => bundleOut(b, list)) };
}

export async function sheetSave(d: Data, _c: Ctx, me: User) {
  const subject = String(d.subject || "");
  if (!APP.SUBJECTS[subject]) throw err("BAD_INPUT", "เลือกวิชา");
  const title = clip(d.title, 160);
  if (!title) throw err("BAD_INPUT", "ใส่ชื่อชีท");
  const price = int(d.price, "ราคา") as number, fullPrice = int(d.full_price, "ราคาก่อนลด", true);
  if (fullPrice !== null && fullPrice > 0 && fullPrice <= price) throw err("BAD_INPUT", "ราคาก่อนลดต้องมากกว่าราคาขาย (หรือเว้นว่าง)");
  const data = {
    title, subject, price, fullPrice: fullPrice || null, coverTitle: clip(d.cover_title, 80) || null,
    pages: int(d.pages, "จำนวนหน้า", true), samplePages: int(d.sample_pages, "จำนวนหน้าตัวอย่าง", true),
    description: clip(d.description, 1500) || null, updatedMonth: month(d.updated_month), sortOrder: Number(d.sort_order) || 0,
  };
  if (d.sheet_id) {
    const s = await prisma.sheet.findUnique({ where: { id: String(d.sheet_id) } });
    if (!s) throw err("NOT_FOUND", "ไม่พบชีทนี้");
    const out = await prisma.sheet.update({ where: { id: s.id }, data });
    await log(me, "sheet.edit", s.id + " " + title);
    return sheetOut(out);
  }
  const out = await prisma.sheet.create({ data });
  await log(me, "sheet.create", out.id + " " + title);
  return sheetOut(out);
}

export async function sheetDelete(d: Data, _c: Ctx, me: User) {
  const s = await prisma.sheet.findUnique({ where: { id: String(d.sheet_id || "") } });
  if (!s) throw err("NOT_FOUND", "ไม่พบชีทนี้");
  await dropParts(s.fileParts); await dropParts(s.sampleParts);
  await prisma.sheet.delete({ where: { id: s.id } });
  for (const b of await prisma.sheetBundle.findMany()) {
    const ids = csv(b.sheetIds);
    if (ids.includes(s.id)) await prisma.sheetBundle.update({ where: { id: b.id }, data: { sheetIds: ids.filter((x) => x !== s.id).join(",") } });
  }
  await log(me, "sheet.delete", s.id + " " + s.title);
  return true;
}

async function dropParts(parts: string) { const ids = csv(parts); if (ids.length) await prisma.fileBlob.deleteMany({ where: { id: { in: ids } } }); }

/** One part of an upload. Returns its id; admin.sheet.file.commit attaches the parts in order. */
export async function sheetPart(d: Data) {
  const b64 = String(d.data || "");
  if (!b64 || !/^[A-Za-z0-9+/=]+$/.test(b64)) throw err("BAD_INPUT", "ไฟล์เสียหาย ลองอัปโหลดใหม่");
  const buf = Buffer.from(b64, "base64");
  if (!buf.length || buf.length > PART_MAX) throw err("BAD_INPUT", "ส่วนของไฟล์ใหญ่เกินไป");
  // Parts left behind by an upload that never finished are cleared after a few hours.
  await prisma.fileBlob.deleteMany({ where: { mime: PART_MIME, createdAt: { lt: new Date(Date.now() - 6 * 36e5) } } });
  const blob = await prisma.fileBlob.create({ data: { mime: PART_MIME, data: buf, isPublic: false } });
  return { part_id: blob.id, size: buf.length };
}

export async function sheetFileCommit(d: Data, _c: Ctx, me: User) {
  const s = await prisma.sheet.findUnique({ where: { id: String(d.sheet_id || "") } });
  if (!s) throw err("NOT_FOUND", "ไม่พบชีทนี้");
  const kind = kindOf(d.kind), ids = (Array.isArray(d.parts) ? d.parts : []).map(String);
  if (!ids.length || ids.length > 40) throw err("BAD_INPUT", "ไม่มีไฟล์");
  const rows = await prisma.fileBlob.findMany({ where: { id: { in: ids }, mime: PART_MIME } });
  if (rows.length !== ids.length) throw err("BAD_INPUT", "อัปโหลดไม่ครบ ลองอัปโหลดใหม่");
  const byId = new Map(rows.map((r) => [r.id, r]));
  const size = ids.reduce((a, id) => a + byId.get(id)!.data.length, 0);
  if (size > (kind === "file" ? FULL_MAX : SAMPLE_MAX)) { await dropParts(ids.join(",")); throw err("BAD_INPUT", "ไฟล์ใหญ่เกิน " + (kind === "file" ? 60 : 15) + " MB"); }
  if (Number(d.size) && Number(d.size) !== size) { await dropParts(ids.join(",")); throw err("BAD_INPUT", "อัปโหลดไม่ครบ ลองอัปโหลดใหม่"); }
  if (byId.get(ids[0])!.data.subarray(0, 5).toString("latin1") !== "%PDF-") { await dropParts(ids.join(",")); throw err("BAD_INPUT", "ไฟล์นี้ไม่ใช่ PDF"); }
  await prisma.fileBlob.updateMany({ where: { id: { in: ids } }, data: { mime: PDF_PART_MIME } });
  const name = clip(d.name, 160) || (kind === "file" ? "sheet.pdf" : "sample.pdf");
  const old = kind === "file" ? s.fileParts : s.sampleParts;
  await prisma.sheet.update({ where: { id: s.id }, data: kind === "file" ? { fileParts: ids.join(","), fileSize: size, fileName: name } : { sampleParts: ids.join(","), sampleSize: size, sampleName: name } });
  await dropParts(old);
  await log(me, "sheet.file", s.id + " " + (kind === "file" ? "ตัวเต็ม" : "ตัวอย่าง") + " " + name + " (" + Math.round(size / 1024) + " KB)");
  return sheetOut((await prisma.sheet.findUnique({ where: { id: s.id } }))!);
}

/** Read a stored PDF back, one part per call (the admin page joins them to open the file). */
export async function sheetFileGet(d: Data) {
  const s = await prisma.sheet.findUnique({ where: { id: String(d.sheet_id || "") } });
  if (!s) throw err("NOT_FOUND", "ไม่พบชีทนี้");
  const kind = kindOf(d.kind), ids = csv(kind === "file" ? s.fileParts : s.sampleParts), i = Math.max(0, Number(d.index) || 0);
  if (!ids.length) throw err("NOT_FOUND", "ยังไม่ได้อัปโหลดไฟล์");
  if (i >= ids.length) throw err("BAD_INPUT", "ไม่มีส่วนนี้");
  const blob = await prisma.fileBlob.findUnique({ where: { id: ids[i] } });
  if (!blob) throw err("NOT_FOUND", "ไฟล์หาย อัปโหลดใหม่");
  return { index: i, parts: ids.length, name: kind === "file" ? s.fileName : s.sampleName, base64: Buffer.from(blob.data).toString("base64") };
}

export async function sheetFileDelete(d: Data, _c: Ctx, me: User) {
  const s = await prisma.sheet.findUnique({ where: { id: String(d.sheet_id || "") } });
  if (!s) throw err("NOT_FOUND", "ไม่พบชีทนี้");
  const kind = kindOf(d.kind);
  await dropParts(kind === "file" ? s.fileParts : s.sampleParts);
  await prisma.sheet.update({ where: { id: s.id }, data: kind === "file" ? { fileParts: "", fileSize: 0, fileName: "" } : { sampleParts: "", sampleSize: 0, sampleName: "" } });
  await log(me, "sheet.file.delete", s.id + " " + (kind === "file" ? "ตัวเต็ม" : "ตัวอย่าง"));
  return true;
}

export async function bundleSave(d: Data, _c: Ctx, me: User) {
  const title = clip(d.title, 160);
  if (!title) throw err("BAD_INPUT", "ใส่ชื่อชุด");
  const all = await prisma.sheet.findMany();
  const ids = (Array.isArray(d.sheet_ids) ? d.sheet_ids : csv(d.sheet_ids)).map(String).filter((id: string, i: number, a: string[]) => a.indexOf(id) === i && all.some((s) => s.id === id));
  if (ids.length < 2) throw err("BAD_INPUT", "เลือกชีทอย่างน้อย 2 เล่มสำหรับชุดนี้");
  const price = int(d.price, "ราคาชุด") as number, normal = ids.reduce((a: number, id: string) => a + (all.find((s) => s.id === id)?.price || 0), 0);
  if (price <= 0) throw err("BAD_INPUT", "ใส่ราคาชุด");
  if (normal && price >= normal) throw err("BAD_INPUT", "ราคาชุดต้องถูกกว่าซื้อแยก (รวม ฿" + normal + ")");
  const data = { title, description: clip(d.description, 600) || null, price, sheetIds: ids.join(","), sortOrder: Number(d.sort_order) || 0 };
  const b = d.bundle_id
    ? await prisma.sheetBundle.update({ where: { id: String(d.bundle_id) }, data }).catch(() => { throw err("NOT_FOUND", "ไม่พบชุดนี้"); })
    : await prisma.sheetBundle.create({ data });
  await log(me, d.bundle_id ? "sheet.bundle.edit" : "sheet.bundle.create", b.id + " " + title + " ฿" + price);
  return bundleOut(b, all);
}

export async function bundleDelete(d: Data, _c: Ctx, me: User) {
  const b = await prisma.sheetBundle.findUnique({ where: { id: String(d.bundle_id || "") } });
  if (!b) throw err("NOT_FOUND", "ไม่พบชุดนี้");
  await prisma.sheetBundle.delete({ where: { id: b.id } });
  await log(me, "sheet.bundle.delete", b.id + " " + b.title);
  return true;
}
