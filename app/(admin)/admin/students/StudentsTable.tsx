"use client";

import { useMemo, useState } from "react";

type Row = {
  id: string;
  name: string;
  email: string;
  school: string;
  grade: string;
  courses: string[];
  progress: string;
};

export default function StudentsTable({
  students,
  subjectNames,
}: {
  students: Row[];
  subjectNames: string[];
}) {
  const [query, setQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter(
      (s) =>
        (q === "" || s.name.toLowerCase().includes(q)) &&
        (courseFilter === "all" || s.courses.includes(courseFilter))
    );
  }, [students, query, courseFilter]);

  return (
    <div>
      <div className="flex gap-3 mb-7">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ค้นหาชื่อนักเรียน..."
          className="flex-1 max-w-[340px] h-11 rounded-xl border-[1.5px] border-border px-4 text-sm focus:outline-none focus:border-ink transition"
        />
        <select
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
          className="h-11 rounded-xl border-[1.5px] border-border px-3.5 text-sm bg-white focus:outline-none focus:border-ink transition"
        >
          <option value="all">คอร์สทั้งหมด</option>
          {subjectNames.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-[2fr_1.3fr_1fr_2fr_1fr] gap-3 px-5 pb-3.5 text-[13px] font-bold text-secondary border-b border-border-light">
        <div>ชื่อนักเรียน</div>
        <div>โรงเรียน</div>
        <div>ระดับชั้น</div>
        <div>คอร์สที่ลงทะเบียน</div>
        <div>ความคืบหน้า</div>
      </div>

      {filtered.map((s) => (
        <div
          key={s.id}
          className="grid grid-cols-[2fr_1.3fr_1fr_2fr_1fr] gap-3 items-center px-5 py-[18px] border-b border-[#f0f0f2]"
        >
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="text-[15px] font-bold truncate">{s.name}</div>
            <div className="text-[13px] text-muted truncate">{s.email}</div>
          </div>
          <div className="text-sm">{s.school}</div>
          <div className="text-sm">{s.grade}</div>
          <div className="flex flex-wrap gap-1.5">
            {s.courses.map((c) => (
              <div key={c} className="text-xs font-semibold bg-panel text-ink px-3 py-1.5 rounded-pill">
                {c}
              </div>
            ))}
          </div>
          <div className="text-sm font-bold">{s.progress}</div>
        </div>
      ))}
      {filtered.length === 0 && (
        <div className="p-12 text-center text-secondary text-[15px]">ไม่พบนักเรียนที่ตรงกับเงื่อนไข</div>
      )}
    </div>
  );
}
