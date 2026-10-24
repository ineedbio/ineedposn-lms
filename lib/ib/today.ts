// หลังบ้าน › ภาพรวมวันนี้ (admin.today, round 7v): one Thai day's sign-ups and enrolments, the member totals, the
// members who have no course yet and the cells ranking. Read only — nothing here writes to the database.
// The day runs 00:00–23:59 Asia/Bangkok. "Member" = a verified student account (no admin / teacher role).
// "Enrolled" = an ACTIVE, unexpired Enrollment (what stateOf calls approved: paid, granted or a legacy student's free
// access). Slips waiting (Payment PENDING + Bill reviewing) are counted apart; rejected ones never count.
// Enrolments of a day go by order date: Payment.createdAt (a cart bill's payments carry the bill's createdAt;
// reviewedAt is the approval) and Bill.createdAt for bills still being reviewed.
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { dayDiff, today as cellsToday } from "./cells";
import { subjectKey } from "./subjects";
import type { Data } from "./api";
import { APP, bkkDate, err, iso } from "./util";

const MEMBER: Prisma.UserWhereInput = {
  emailVerified: true,
  OR: [{ roles: "", role: "STUDENT" }, { AND: [{ NOT: { roles: "" } }, { NOT: { roles: { contains: "admin" } } }, { NOT: { roles: { contains: "teacher" } } }] }],
};
const MEMBER_SQL = Prisma.sql`u."emailVerified" AND ((u.roles = '' AND u.role = 'STUDENT') OR (u.roles <> '' AND u.roles NOT LIKE '%admin%' AND u.roles NOT LIKE '%teacher%'))`;
const activeEnr = (): Prisma.EnrollmentWhereInput => ({ status: "ACTIVE", OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] });
const heardLabel: Record<string, string> = Object.fromEntries(APP.HEARD);
const fullName = (u: { firstName: string; lastName: string }) => ((u.firstName || "") + " " + (u.lastName || "")).trim();
type BillItem = { course_id?: string; title?: string; net?: number; price?: number };

export async function adminToday(d: Data) {
  const date = d.date ? String(d.date) : bkkDate();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(Date.parse(date + "T00:00:00+07:00"))) throw err("BAD_INPUT", "วันที่ต้องเป็นแบบ YYYY-MM-DD");
  const from = new Date(Date.parse(date + "T00:00:00+07:00")), to = new Date(from.getTime() + 864e5), inDay = { gte: from, lt: to };
  const now = bkkDate();

  const [members, enrolled, paidRow, pendPay, pendBill, signups, pays, bills, courses] = await Promise.all([
    prisma.user.count({ where: MEMBER }),
    prisma.user.count({ where: { ...MEMBER, enrollments: { some: activeEnr() } } }),
    prisma.$queryRaw<{ n: bigint }[]>`SELECT count(DISTINCT p."userId") AS n FROM "Payment" p
      JOIN "Enrollment" e ON e."userId" = p."userId" AND e."courseId" = p."courseId" AND e.status = 'ACTIVE' AND (e."expiresAt" IS NULL OR e."expiresAt" > now())
      JOIN "User" u ON u.id = p."userId"
      WHERE p.status = 'APPROVED' AND p.amount > 0 AND p."revokedAt" IS NULL AND ${MEMBER_SQL}`,
    prisma.payment.count({ where: { status: "PENDING" } }),
    prisma.bill.count({ where: { status: "reviewing" } }),
    prisma.user.findMany({ where: { ...MEMBER, createdAt: inDay }, orderBy: { createdAt: "asc" },
      select: { id: true, nickname: true, firstName: true, lastName: true, gradeLevel: true, school: true, heardFrom: true, createdAt: true } }),
    prisma.payment.findMany({ where: { createdAt: inDay, revokedAt: null, status: { in: ["APPROVED", "PENDING"] }, user: MEMBER }, orderBy: { createdAt: "asc" },
      select: { userId: true, courseId: true, amount: true, status: true, createdAt: true, user: { select: { nickname: true, firstName: true, lastName: true, createdAt: true } } } }),
    prisma.bill.findMany({ where: { createdAt: inDay, status: "reviewing", user: MEMBER }, orderBy: { createdAt: "asc" },
      select: { userId: true, items: true, createdAt: true, user: { select: { nickname: true, firstName: true, lastName: true, createdAt: true } } } }),
    prisma.course.findMany({ select: { id: true, slug: true, title: true, sortOrder: true, subject: { select: { slug: true, name: true } } } }),
  ]);
  const cById = new Map(courses.map((c) => [c.id, c])), cBySlug = new Map(courses.map((c) => [c.slug, c]));

  // ข. the day's enrolments, per course
  type Row = { subject: string; subject_name: string; course_id: string; title: string; approved: number; approved_amount: number; pending: number; pending_amount: number; _o: number };
  const per: Record<string, Row> = {}, people: Record<string, Set<string>> = {};
  const enrollList: Record<string, unknown>[] = [];
  const add = (cid: string, title: string, uid: string, amount: number, status: "approved" | "pending", at: Date, u: { nickname: string | null; firstName: string; lastName: string; createdAt: Date }) => {
    const c = cById.get(cid) || cBySlug.get(cid), k = subjectKey(c?.subject), key = c?.id || cid;
    const r = (per[key] ||= { subject: k, subject_name: APP.SUBJECTS[k] || "", course_id: c?.slug || cid, title: c?.title || title || cid, approved: 0, approved_amount: 0, pending: 0, pending_amount: 0, _o: c?.sortOrder ?? 999 });
    const who = (people[key + status] ||= new Set());
    if (!who.has(uid)) { who.add(uid); r[status]++; }
    r[(status + "_amount") as "approved_amount" | "pending_amount"] += amount;
    enrollList.push({ user_id: uid, nickname: u.nickname || "", name: fullName(u), course_id: c?.slug || cid, course: c?.title || title || cid, amount, status,
      at: iso(at), new_today: u.createdAt >= from && u.createdAt < to });
  };
  for (const p of pays) add(p.courseId, "", p.userId, p.amount, p.status === "APPROVED" ? "approved" : "pending", p.createdAt, p.user);
  for (const b of bills) for (const it of (Array.isArray(b.items) ? b.items : []) as BillItem[])
    add(String(it.course_id || ""), String(it.title || ""), b.userId, Math.round(Number(it.net ?? it.price) || 0), "pending", b.createdAt, b.user);
  const SUBJ_ORDER = Object.keys(APP.SUBJECTS);
  const enrolls = Object.values(per).sort((a, b) => SUBJ_ORDER.indexOf(a.subject) - SUBJ_ORDER.indexOf(b.subject) || a._o - b._o).map(({ _o, ...r }) => r);
  enrollList.sort((a, b) => String(a.at).localeCompare(String(b.at)));

  // ค. members with no approved course, newest first
  const noCourse = await prisma.user.findMany({ where: { ...MEMBER, enrollments: { none: activeEnr() } }, orderBy: { createdAt: "desc" },
    select: { id: true, nickname: true, firstName: true, lastName: true, gradeLevel: true, school: true, phone: true, lineId: true, email: true, createdAt: true, heardFrom: true } });
  const ids = noCourse.map((u) => u.id);
  const [pp, pb, leads] = ids.length ? await Promise.all([
    prisma.payment.groupBy({ by: ["userId"], where: { userId: { in: ids }, status: "PENDING" } }),
    prisma.bill.groupBy({ by: ["userId"], where: { userId: { in: ids }, status: "reviewing" } }),
    prisma.trialLead.findMany({ where: { userId: { in: ids } }, select: { userId: true, courseId: true }, orderBy: { createdAt: "asc" } }),
  ]) : [[], [], []];
  const hasPend = new Set([...pp.map((x) => x.userId), ...pb.map((x) => x.userId)]);
  const trialOf: Record<string, string[]> = {};
  for (const l of leads) (trialOf[l.userId] ||= []).push(cById.get(l.courseId)?.title || l.courseId);
  const no_course_list = noCourse.map((u) => {
    const joined = bkkDate(u.createdAt);
    return { user_id: u.id, nickname: u.nickname || "", name: fullName(u), grade: u.gradeLevel || "", school: u.school || "", phone: u.phone || "", line_id: u.lineId || "", email: u.email,
      created_at: iso(u.createdAt), days: Math.max(0, dayDiff(joined, now)), heard_from: heardLabel[u.heardFrom || ""] || "", has_pending: hasPend.has(u.id), trial_courses: trialOf[u.id] || [] };
  });

  // ง. cells: earned in total (every +delta in CellLedger, codes redeemed not taken off), balance = sum of all deltas
  const top = await prisma.$queryRaw<{ userId: string; total: bigint; balance: bigint; days: bigint }[]>`
    SELECT l."userId", SUM(GREATEST(l.delta, 0)) AS total, SUM(l.delta) AS balance,
      (SELECT count(*) FROM "StudyDay" d WHERE d."userId" = l."userId" AND d.credited) AS days
    FROM "CellLedger" l JOIN "User" u ON u.id = l."userId" WHERE ${MEMBER_SQL}
    GROUP BY l."userId" HAVING SUM(GREATEST(l.delta, 0)) > 0
    ORDER BY total DESC, days DESC, l."userId" LIMIT 50`;
  const tids = top.map((t) => t.userId);
  const [tu, ts, day] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: tids } }, select: { id: true, nickname: true, firstName: true, lastName: true, photoBlobId: true } }),
    prisma.streak.findMany({ where: { userId: { in: tids } } }),
    cellsToday(),
  ]);
  const uOf = new Map(tu.map((u) => [u.id, u])), sOf = new Map(ts.map((s) => [s.userId, s]));
  const cells_top = top.map((t, i) => {
    const u = uOf.get(t.userId), s = sOf.get(t.userId);
    const gap = s?.lastDay ? dayDiff(s.lastDay, day) : 99, alive = !!s && (gap <= 1 || gap - 1 <= s.freezes);
    return { rank: i + 1, user_id: t.userId, nickname: u?.nickname || "", name: u ? fullName(u) : "", has_photo: !!u?.photoBlobId,
      total: Number(t.total), balance: Number(t.balance), streak: alive ? s!.streak : 0, best: s?.best || 0, study_days: Number(t.days) };
  });

  return {
    date, today: now,
    totals: { members, enrolled: enrolled, paid: Number(paidRow[0]?.n || 0), no_course: members - enrolled, pending: pendPay + pendBill },
    day: {
      signups: { n: signups.length, list: signups.map((u) => ({ user_id: u.id, nickname: u.nickname || "", name: fullName(u), grade: u.gradeLevel || "", school: u.school || "",
        heard_from: heardLabel[u.heardFrom || ""] || "", created_at: iso(u.createdAt) })) },
      enrolls,
      enroll_list: enrollList,
    },
    no_course_list,
    cells_top,
  };
}
