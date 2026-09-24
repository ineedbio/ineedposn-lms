"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

const PAYMENT_STATUSES = ["ทั้งหมด", "ชำระแล้ว", "รอตรวจสอบ", "ยังไม่ชำระ"];

export default function StudentsClient({
  initialStudents,
  allCourses,
}: {
  initialStudents: any[];
  allCourses: { id: string; title: string }[];
}) {
  const [students, setStudents] = useState<any[]>(initialStudents);
  const [search, setSearch] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [selectedGrade, setSelectedGrade] = useState("ทุกชั้น");
  const [selectedStatus, setSelectedStatus] = useState("ทั้งหมด");
  const [copied, setCopied] = useState(false);

  function updateStudent(id: string, field: string, value: string) {
    setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  }

  // คำนวณจำนวนคนในแต่ละคอร์ส
  const courseCounts = useMemo(() => {
    const map: Record<string, number> = { NONE: 0 };
    allCourses.forEach((c) => (map[c.id] = 0));
    students.forEach((s) => {
      map[s.courseId] = (map[s.courseId] || 0) + 1;
    });
    return map;
  }, [students, allCourses]);

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const matchSearch =
        search === "" ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.nickname.toLowerCase().includes(search.toLowerCase()) ||
        s.school.toLowerCase().includes(search.toLowerCase()) ||
        s.phone.includes(search) ||
        s.email.toLowerCase().includes(search.toLowerCase());

      const matchCourse = !selectedCourse || s.courseId === selectedCourse;
      const matchGrade = selectedGrade === "ทุกชั้น" || s.grade === selectedGrade;
      const matchStatus = selectedStatus === "ทั้งหมด" || s.paymentStatus === selectedStatus;

      return matchSearch && matchCourse && matchGrade && matchStatus;
    });
  }, [students, search, selectedCourse, selectedGrade, selectedStatus]);

  function exportJson() {
    const data = {
      saved: new Date().toISOString(),
      ทะเบียนนักเรียน: filtered.map((s) => ({
        ชื่อ: s.name,
        ชื่อเล่น: s.nickname,
        ชั้น: s.grade,
        โรงเรียน: s.school,
        คอร์ส: s.course,
        ยอดโอน: s.amount,
        สถานะชำระเงิน: s.paymentStatus,
        เบอร์โทร: s.phone,
        อีเมล: s.email,
        บันทึก: s.notes,
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

  function handleImportJson(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const list = json["ทะเบียนนักเรียน"] || json["นักเรียน"] || json;
        if (Array.isArray(list)) {
          const imported = list.map((item: any, idx: number) => ({
            id: `import-${idx}`,
            name: item["ชื่อ"] || "ไม่ระบุชื่อ",
            nickname: item["ชื่อเล่น"] || "-",
            grade: item["ชั้น"] || "-",
            school: item["โรงเรียน"] || "-",
            phone: item["เบอร์โทร"] || "-",
            email: item["อีเมล"] || "-",
            course: item["คอร์ส"] || "ทั่วไป",
            courseId: "IMPORTED",
            amount: item["ยอดโอน"] || 0,
            date: "นำเข้า",
            paymentStatus: item["สถานะชำระเงิน"] || "ชำระแล้ว",
            notes: item["บันทึก"] || "",
          }));
          setStudents((prev) => [...imported, ...prev]);
          alert(`นำเข้าสำเร็จ ${imported.length} คน!`);
        }
      } catch (err) {
        alert("ไฟล์ JSON ไม่ถูกต้อง");
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-8 flex flex-col gap-6">
      {/* แถบสลับหน้า */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex gap-2">
          <Link
            href="/admin/students"
            className="px-4 py-2 rounded-xl bg-white text-emerald-700 font-bold shadow-sm border border-slate-200 text-sm"
          >
            📋 ทะเบียนนักเรียน & คอร์ส
          </Link>
          <Link
            href="/admin/camp-results"
            className="px-4 py-2 rounded-xl text-slate-600 hover:bg-white/80 font-medium text-sm transition"
          >
            🏆 ติดตามผลค่าย สอวน.
          </Link>
        </div>

        <div className="flex gap-3">
          <label className="cursor-pointer text-xs font-semibold px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm transition">
            📂 นำเข้าไฟล์ JSON
            <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
          </label>
          <button
            onClick={exportJson}
            className="text-xs font-semibold px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition"
          >
            📥 ดาวน์โหลด JSON
          </button>
        </div>
      </div>

      {/* หัวข้อ */}
      <div>
        <h1 className="text-2xl font-black text-slate-900">ทะเบียนนักเรียน & การสมัครคอร์ส</h1>
        <p className="text-xs text-slate-500 mt-1">
          รายชื่อนักเรียนและคอร์สเรียน พร้อมตรวจสอบสถานะการชำระเงิน
        </p>
      </div>

      {/* การ์ดคอร์สเรียน (กดเพื่อกรองตามคอร์ส) */}
      <div>
        <div className="text-xs text-slate-500 mb-2 font-bold uppercase tracking-wider">
          คอร์สเรียน — คลิกการ์ดเพื่อกรอง
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {allCourses.map((c) => {
            const count = courseCounts[c.id] || 0;
            const isSelected = selectedCourse === c.id;
            return (
              <div
                key={c.id}
                onClick={() => setSelectedCourse(isSelected ? null : c.id)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all bg-white shadow-sm ${
                  isSelected
                    ? "border-emerald-600 ring-2 ring-emerald-500/20"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="font-bold text-xs text-slate-800 line-clamp-1">{c.title}</div>
                <div className="text-xl font-black text-emerald-600 mt-2">{count} คน</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ค้นหาและตัวกรอง */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3">
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="🔍 ค้นหา ชื่อ ชื่อเล่น โรงเรียน เบอร์ อีเมล..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[260px] h-10 px-3.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-500"
          />

          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="h-10 px-3 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none"
          >
            <option value="ทุกชั้น">ทุกชั้น</option>
            <option value="ม.3">ม.3</option>
            <option value="ม.4">ม.4</option>
            <option value="ม.5">ม.5</option>
            <option value="ม.6">ม.6</option>
            <option value="อื่น ๆ">อื่น ๆ</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="h-10 px-3 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none"
          >
            {PAYMENT_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st === "ทั้งหมด" ? "สถานะชำระเงิน (ทั้งหมด)" : st}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
          <span className="text-slate-500">
            แสดง <strong className="text-slate-800">{filtered.length}</strong> / {students.length} คน
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const text = filtered.map((s) => `${s.name} (${s.nickname}) - ${s.phone}`).join("\n");
                navigator.clipboard.writeText(text);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
            >
              {copied ? "✓ คัดลอกแล้ว" : "คัดลอกรายชื่อที่กรอง"}
            </button>
            {(selectedCourse || search || selectedGrade !== "ทุกชั้น" || selectedStatus !== "ทั้งหมด") && (
              <button
                onClick={() => {
                  setSelectedCourse(null);
                  setSearch("");
                  setSelectedGrade("ทุกชั้น");
                  setSelectedStatus("ทั้งหมด");
                }}
                className="text-red-500 hover:underline"
              >
                ล้างตัวกรอง
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ตารางนักเรียน */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
              <th className="py-3.5 px-4">ชื่อ - นามสกุล</th>
              <th className="py-3.5 px-3">ชั้น</th>
              <th className="py-3.5 px-4">โรงเรียน</th>
              <th className="py-3.5 px-4">คอร์สที่สมัคร</th>
              <th className="py-3.5 px-4">ช่องทางติดต่อ</th>
              <th className="py-3.5 px-3">ยอดโอน</th>
              <th className="py-3.5 px-3">สมัครเมื่อ</th>
              <th className="py-3.5 px-4">สถานะเงิน</th>
              <th className="py-3.5 px-4">บันทึก</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50/80 transition">
                <td className="py-3.5 px-4 font-bold text-slate-900">
                  {s.name}
                  <span className="text-[11px] text-slate-400 font-normal ml-1">({s.nickname})</span>
                </td>
                <td className="py-3.5 px-3 text-slate-600">{s.grade}</td>
                <td className="py-3.5 px-4 text-slate-600">{s.school}</td>
                <td className="py-3.5 px-4 font-medium text-emerald-700">{s.course}</td>
                <td className="py-3.5 px-4">
                  <div className="font-mono">{s.phone}</div>
                  <div className="text-[10px] text-slate-400">{s.email}</div>
                </td>
                <td className="py-3.5 px-3 font-mono font-bold text-slate-900">฿{s.amount}</td>
                <td className="py-3.5 px-3 text-slate-500 font-mono">{s.date}</td>
                {/* Dropdown สถานะชำระเงิน */}
                <td className="py-3.5 px-4">
                  <select
                    value={s.paymentStatus}
                    onChange={(e) => updateStudent(s.id, "paymentStatus", e.target.value)}
                    className={`h-8 px-2 rounded-lg border text-xs font-semibold focus:outline-none ${
                      s.paymentStatus === "ชำระแล้ว"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : s.paymentStatus === "รอตรวจสอบ"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-red-50 text-red-700 border-red-200"
                    }`}
                  >
                    <option value="ชำระแล้ว">ชำระแล้ว</option>
                    <option value="รอตรวจสอบ">รอตรวจสอบ</option>
                    <option value="ยังไม่ชำระ">ยังไม่ชำระ</option>
                  </select>
                </td>
                {/* ช่องพิมพ์บันทึก */}
                <td className="py-3.5 px-4">
                  <input
                    type="text"
                    placeholder="พิมพ์โน้ต..."
                    value={s.notes}
                    onChange={(e) => updateStudent(s.id, "notes", e.target.value)}
                    className="h-8 px-2 rounded-lg border border-slate-200 text-xs w-[140px] focus:outline-none focus:border-emerald-500"
                  />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                  ไม่พบข้อมูลนักเรียน
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}