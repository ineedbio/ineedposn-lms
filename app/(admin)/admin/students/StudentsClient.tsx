"use client";

import { useState } from "react";

export default function StudentsClient({
  initialStudents,
  allCourses,
}: {
  initialStudents: any[];
  allCourses: { id: string; title: string }[];
}) {
  const [search, setSearch] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("ALL");

  // กรองข้อมูลตามคำค้นหาและคอร์ส
  const filtered = initialStudents.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.nickname.toLowerCase().includes(search.toLowerCase()) ||
      s.school.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.phone.includes(search);

    const matchCourse =
      selectedCourse === "ALL" || s.courses.some((c: any) => c.id === selectedCourse);

    return matchSearch && matchCourse;
  });

  // ฟังก์ชันดาวน์โหลดไฟล์ JSON
  function exportJson() {
    const data = {
      saved: new Date().toISOString(),
      ติดตามนักเรียน: filtered.map((s) => ({
        ชื่อ: s.name,
        ชื่อเล่น: s.nickname,
        ชั้น: s.gradeLevel,
        โรงเรียน: s.school,
        เบอร์โทร: s.phone,
        อีเมล: s.email,
        คอร์สที่เรียน: s.courses.map((c: any) => ({
          วิชา: c.title,
          ความคืบหน้า: `${c.percent}%`,
          จบบทเรียน: `${c.completedLessons}/${c.totalLessons} บท`,
        })),
      })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ineedbio-students-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header และปุ่ม Export */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-[-0.02em] text-ink">
            ติดตามนักเรียน & ความคืบหน้า
          </h1>
          <p className="text-secondary text-sm mt-1">
            พบนักเรียนทั้งหมด {filtered.length} คน
          </p>
        </div>
        <button
          onClick={exportJson}
          className="h-11 px-5 rounded-pill bg-ink text-white text-sm font-semibold hover:bg-dark-hover transition active:scale-95 shadow-sm flex items-center gap-2"
        >
          📥 ดาวน์โหลด JSON
        </button>
      </div>

      {/* ค้นหาและตัวกรอง */}
      <div className="flex gap-4 items-center">
        <input
          type="text"
          placeholder="ค้นหาชื่อ, ชื่อเล่น, โรงเรียน, เบอร์โทร..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 h-12 rounded-xl border-[1.5px] border-border px-4 text-[15px] focus:outline-none focus:border-ink transition bg-white"
        />
        <select
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
          className="h-12 rounded-xl border-[1.5px] border-border px-4 text-[15px] focus:outline-none focus:border-ink transition bg-white min-w-[220px]"
        >
          <option value="ALL">คอร์สทั้งหมด</option>
          {allCourses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </div>

      {/* ตารางข้อมูล */}
      <div className="bg-white rounded-[20px] border border-border overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-panel border-b border-border text-[13px] font-bold text-secondary uppercase tracking-wider">
              <th className="py-4 px-6">นักเรียน</th>
              <th className="py-4 px-6">โรงเรียน / ชั้น</th>
              <th className="py-4 px-6">ติดต่อ</th>
              <th className="py-4 px-6">คอร์ส & ความคืบหน้า (%)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-[14px]">
            {filtered.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50/50 transition">
                {/* คอลัมน์ 1: ข้อมูลชื่อ */}
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-ink text-white flex items-center justify-center font-bold text-sm overflow-hidden flex-shrink-0">
                      {s.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        s.name[0]
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-ink">{s.name}</div>
                      <div className="text-xs text-secondary">ชื่อเล่น: {s.nickname}</div>
                    </div>
                  </div>
                </td>

                {/* คอลัมน์ 2: โรงเรียนและระดับชั้น */}
                <td className="py-4 px-6">
                  <div className="text-ink font-medium">{s.school}</div>
                  <div className="text-xs text-secondary mt-0.5">{s.gradeLevel}</div>
                </td>

                {/* คอลัมน์ 3: เบอร์โทรและอีเมล */}
                <td className="py-4 px-6">
                  <div className="text-ink font-mono text-xs">{s.phone}</div>
                  <div className="text-xs text-secondary mt-0.5">{s.email}</div>
                </td>

                {/* คอลัมน์ 4: คอร์สและ % หลอดความคืบหน้า */}
                <td className="py-4 px-6">
                  {s.courses.length > 0 ? (
                    <div className="flex flex-col gap-3 min-w-[260px]">
                      {s.courses.map((c: any) => (
                        <div key={c.id} className="flex flex-col gap-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-semibold text-ink line-clamp-1">{c.title}</span>
                            <span className="font-bold text-ink flex-shrink-0 ml-2">
                              {c.percent}%
                              <span className="text-[10px] text-secondary font-normal ml-1">
                                ({c.completedLessons}/{c.totalLessons})
                              </span>
                            </span>
                          </div>
                          {/* หลอด Progress Bar */}
                          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                              style={{ width: `${c.percent}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-muted">ยังไม่ลงทะเบียนคอร์ส</span>
                  )}
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="py-12 text-center text-secondary text-sm">
                  ไม่พบข้อมูลนักเรียนที่ค้นหา
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}