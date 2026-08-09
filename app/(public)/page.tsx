import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const courses = await prisma.course.findMany({
    where: { isPublished: true },
    include: { subject: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      {/* ===== Hero ===== */}
      <section className="text-center px-6 pt-20 pb-16 max-w-3xl mx-auto">
        <div className="text-[13px] font-semibold text-secondary mb-4">
          INeedBio · ติวชีววิทยาออนไลน์
        </div>
        <h1 className="text-[48px] md:text-[64px] font-extrabold tracking-[-0.03em] leading-[1.05] mb-5">
          เข้าใจชีววิทยา
          <br />
          ในแบบที่ไม่ลืม
        </h1>
        <p className="text-[17px] md:text-[19px] text-secondary mb-9 max-w-xl mx-auto">
          คอร์สติวชีววิทยาสำหรับสอวน. และสอบเข้ามหาวิทยาลัย สอนโดยเข้าใจหลักการ
          ไม่ใช่แค่ท่องจำ
        </p>
        <div className="flex items-center justify-center gap-3 mb-14">
          <Link
            href="#courses"
            className="bg-ink text-white rounded-pill px-7 py-3.5 text-[14.5px] font-medium hover:bg-dark-hover hover:shadow-lg transition-all duration-150 active:scale-95"
          >
            ดูคอร์สทั้งหมด
          </Link>
          <Link
            href="/register"
            className="bg-panel text-ink rounded-pill px-7 py-3.5 text-[14.5px] font-medium hover:bg-border-light transition-all duration-150 active:scale-95"
          >
            ทดลองเรียนฟรี
          </Link>
        </div>
        <div className="h-[280px] md:h-[400px] rounded-card bg-panel border border-dashed border-border flex items-center justify-center text-muted text-sm">
          ภาพประกอบหน้าแรก
        </div>
      </section>

      {/* ===== Course grid ===== */}
      <section id="courses" className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-[28px] font-extrabold tracking-[-0.02em] mb-8">
          คอร์สเรียนทั้งหมด
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {courses.map((c, i) => (
            <Link
              key={c.id}
              href={`/courses/${c.slug}`}
              className={`group rounded-card border border-border-light overflow-hidden hover:border-border hover:shadow-lg hover:-translate-y-1 transition-all duration-200 ${
                i === 0 ? "md:col-span-2" : ""
              }`}
            >
              <div className="h-40 bg-panel border-b border-border-light flex items-center justify-center text-muted text-xs">
                รูปคอร์ส
              </div>
              <div className="p-6">
                <div className="text-[12px] font-semibold text-secondary mb-2">
                  {c.subject.name}
                </div>
                <h3 className="text-[19px] font-bold mb-2 group-hover:text-secondary transition">
                  {c.title}
                </h3>
                <p className="text-[14px] text-secondary mb-4 line-clamp-2">
                  {c.description}
                </p>
                <div className="text-[15px] font-semibold">
                  ฿{c.price.toLocaleString()}
                </div>
              </div>
            </Link>
          ))}
          {courses.length === 0 && (
            <p className="text-muted text-sm col-span-3">
              ยังไม่มีคอร์สที่เผยแพร่ — เพิ่มคอร์สแรกได้จากหน้า Admin
            </p>
          )}
        </div>
      </section>

      {/* ===== Feature rows ===== */}
      <section className="bg-panel">
        <div className="max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-12 items-center">
          <div className="h-72 rounded-card bg-white border border-dashed border-border flex items-center justify-center text-muted text-sm">
            วิดีโอเลกเชอร์
          </div>
          <div>
            <div className="text-[13px] font-semibold text-secondary mb-3">วิดีโอเลกเชอร์</div>
            <h3 className="text-[28px] font-extrabold tracking-[-0.02em] mb-4">
              เรียนซ้ำได้ ไม่มีวันหมดอายุความเข้าใจ
            </h3>
            <p className="text-[15px] text-secondary leading-relaxed">
              ดูวิดีโอผ่านลิงก์ YouTube แบบ unlisted ได้ไม่จำกัดครั้งตลอดอายุคอร์ส
              พร้อมระบบติดตามความคืบหน้าอัตโนมัติ
            </p>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-12 items-center">
          <div className="md:order-2 h-72 rounded-card bg-white border border-dashed border-border flex items-center justify-center text-muted text-sm">
            ควิซท้ายบท
          </div>
          <div className="md:order-1">
            <div className="text-[13px] font-semibold text-secondary mb-3">ควิซท้ายบท</div>
            <h3 className="text-[28px] font-extrabold tracking-[-0.02em] mb-4">
              รู้ทันทีว่าจุดไหนยังไม่แน่น
            </h3>
            <p className="text-[15px] text-secondary leading-relaxed">
              ทำควิซหลังเรียนจบทุกบท ระบบตรวจให้อัตโนมัติพร้อมเฉลยละเอียด
            </p>
          </div>
        </div>
      </section>

      {/* ===== Stats ===== */}
      <section className="max-w-6xl mx-auto px-6 py-20 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        <div>
          <div className="text-[36px] font-extrabold tracking-[-0.02em]">92%</div>
          <div className="text-[13px] text-secondary mt-1">อัตราสอบติด</div>
        </div>
        <div>
          <div className="text-[36px] font-extrabold tracking-[-0.02em]">1,240+</div>
          <div className="text-[13px] text-secondary mt-1">นักเรียนเรียนแล้ว</div>
        </div>
        <div>
          <div className="text-[36px] font-extrabold tracking-[-0.02em]">4.9</div>
          <div className="text-[13px] text-secondary mt-1">คะแนนรีวิว</div>
        </div>
        <div>
          <div className="text-[36px] font-extrabold tracking-[-0.02em]">120+</div>
          <div className="text-[13px] text-secondary mt-1">บทเรียน</div>
        </div>
      </section>

      {/* ===== Testimonials ===== */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-[28px] font-extrabold tracking-[-0.02em] mb-8 text-center">
          รีวิวจากนักเรียนจริง
        </h2>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            ["สอนเข้าใจง่ายมาก ตัวอย่างข้อสอบช่วยได้เยอะ", "น้องแนน, ม.5"],
            ["ระบบควิซท้ายบทช่วยให้รู้ว่าจุดไหนยังไม่แน่น", "น้องปอนด์, ม.6"],
            ["ดูวิดีโอซ้ำได้ตลอด สะดวกมากตอนใกล้สอบ", "น้องมิว, ม.5"],
          ].map(([quote, who]) => (
            <div key={who} className="rounded-card border border-border-light p-6 hover:shadow-md transition-shadow duration-200">
              <p className="text-[14.5px] text-secondary leading-relaxed mb-4">
                &ldquo;{quote}&rdquo;
              </p>
              <div className="text-[13px] font-medium">{who}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="bg-ink text-white">
        <div className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h5 className="text-[13px] font-semibold mb-4">คอร์สเรียน</h5>
            <ul className="space-y-2.5 text-[13px] text-white/60">
              <li><Link href="/#courses" className="hover:text-white transition">คอร์ส สอวน.</Link></li>
              <li><Link href="/#courses" className="hover:text-white transition">คอร์ส TCAS</Link></li>
              <li><Link href="/#courses" className="hover:text-white transition">คอร์ส กสพท</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="text-[13px] font-semibold mb-4">บัญชี</h5>
            <ul className="space-y-2.5 text-[13px] text-white/60">
              <li><Link href="/login" className="hover:text-white transition">เข้าสู่ระบบ</Link></li>
              <li><Link href="/register" className="hover:text-white transition">สมัครสมาชิก</Link></li>
              <li><Link href="/dashboard" className="hover:text-white transition">ห้องเรียนของฉัน</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="text-[13px] font-semibold mb-4">ช่วยเหลือ</h5>
            <ul className="space-y-2.5 text-[13px] text-white/60">
              <li><Link href="/register" className="hover:text-white transition">วิธีสมัครเรียน</Link></li>
              <li><Link href="/dashboard" className="hover:text-white transition">แจ้งชำระเงิน</Link></li>
              <li className="text-white/30">ติดต่อเรา</li>
            </ul>
          </div>
          <div>
            <h5 className="text-[13px] font-semibold mb-4">เกี่ยวกับ</h5>
            <ul className="space-y-2.5 text-[13px] text-white/30">
              <li>เกี่ยวกับ INeedBio</li>
              <li>ข้อตกลงการใช้งาน</li>
              <li>นโยบายความเป็นส่วนตัว</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 px-6 py-5 text-[11.5px] text-white/40 text-center">
          © 2026 INeedBio. All rights reserved.
        </div>
      </footer>
    </>
  );
}
