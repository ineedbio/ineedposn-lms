import { prisma } from "@/lib/prisma";
import Link from "next/link";

// Query the DB per-request instead of at build time — avoids build
// failures if the DB isn't reachable from Vercel's build environment.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const courses = await prisma.course.findMany({
    where: { isPublished: true },
    include: { subject: true },
    take: 8,
  });

  return (
    <main className="max-w-5xl mx-auto px-6 py-16">
      <h1 className="text-4xl font-bold tracking-tight mb-3">
        เข้าใจชีววิทยาในแบบที่ไม่ลืม
      </h1>
      <p className="text-ink/60 mb-10">
        คอร์สติวชีววิทยาสำหรับสอวน. และสอบเข้ามหาวิทยาลัย
      </p>

      <div className="grid grid-cols-2 gap-4">
        {courses.map((c) => (
          <Link
            key={c.id}
            href={`/courses/${c.slug}`}
            className="border border-black/10 rounded-xl p-6 hover:border-black/30 transition"
          >
            <div className="text-xs text-ink/50 mb-2">{c.subject.name}</div>
            <h3 className="text-xl font-semibold mb-2">{c.title}</h3>
            <div className="text-sm font-medium">฿{c.price.toLocaleString()}</div>
          </Link>
        ))}
        {courses.length === 0 && (
          <p className="text-ink/40 text-sm">
            ยังไม่มีคอร์สที่เผยแพร่ — เพิ่มคอร์สแรกได้จาก /admin/courses
          </p>
        )}
      </div>
    </main>
  );
}
