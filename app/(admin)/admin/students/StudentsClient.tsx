"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";

const PAYMENT_STATUSES = ["ทั้งหมด", "ชำระแล้ว", "รอตรวจสอบ", "ยังไม่ชำระ"];

const POSN_CENTERS = [
  "ยังไม่ระบุ",
  "ศูนย์โรงเรียน",
  "ม.เทคโนโลยีสุรนารี",
  "ม.ขอนแก่น",
  "ม.สงขลานครินทร์",
  "ม.นเรศวร",
  "ม.อุบลราชธานี",
  "ม.ศิลปากร",
  "ม.เชียงใหม่",
  "ม.ทักษิณ",
  "ม.บูรพา",
  "ม.เกษตรศาสตร์",
  "ม.วลัยลักษณ์",
  "ม.เทคโนโลยีพระจอมเกล้าพระนครเหนือ",
  "จุฬาลงกรณ์มหาวิทยาลัย",
  "ม.มหิดล",
  "ม.ธรรมศาสตร์",
];

const POSN_SUBJECTS = ["ชีวะ", "เคมี", "ฟิสิกส์", "คอม", "คณิต", "ดาราศาสตร์"];

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
  const [hasChanges, setHasChanges] = useState(false);

  // Minimal Toast Popup State
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" } | null>(null);

  // Minimal Delete Modal State
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  // Add Student Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isPosn, setIsPosn] = useState(false);
  const [newStudent, setNewStudent] = useState({
    name: "",
    nickname: "",
    grade: "ม.4",
    school: "",
    phone: "",
    email: "",
    course: allCourses[0]?.title ?? "สอวน. ชีววิทยา",
    amount: "490",
    paymentStatus: "ชำระแล้ว",
    notes: "",
    posnSubject: "ชีวะ",
    posnCenter: "ศูนย์โรงเรียน",
  });

  function showToast(message: string, type: "success" | "info" = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  }

  // ซิงก์ข้อมูลสดจาก Neon DB พร้อมนำโน้ตที่เคยบันทึกไว้มาประกบ
  useEffect(() => {
    const savedNotes = JSON.parse(localStorage.getItem("ineedbio_students_notes") || "{}");
    setStudents(
      initialStudents.map((s) => ({
        ...s,
        notes: savedNotes[s.id] || s.notes || "",
      }))
    );
  }, [initialStudents]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasChanges]);

  function updateStudent(id: string, field: string, value: string) {
    setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
    setHasChanges(true);
  }

  // 1. บันทึกการเปลี่ยนแปลงทั้งหมดลง Neon DB จริง
  async function handleSaveAll() {
    try {
      const updates = students.map((s) => ({
        id: s.id,
        paymentStatus: s.paymentStatus,
      }));

      const res = await fetch("/api/admin/students", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });

      if (!res.ok) throw new Error("บันทึกลงฐานข้อมูลไม่สำเร็จ");

      // บันทึกโน้ตเก็บไว้ตาม ID นักเรียน
      const notesMap: Record<string, string> = {};
      students.forEach((s) => {
        if (s.notes) notesMap[s.id] = s.notes;
      });
      localStorage.setItem("ineedbio_students_notes", JSON.stringify(notesMap));

      setHasChanges(false);
      showToast("บันทึกการเปลี่ยนแปลงลงฐานข้อมูลเรียบร้อย");
    } catch (err: any) {
      showToast(err.message || "บันทึกข้อมูลไม่สำเร็จ", "info");
    }
  }

  function handleCancelAll() {
    const savedNotes = JSON.parse(localStorage.getItem("ineedbio_students_notes") || "{}");
    setStudents(
      initialStudents.map((s) => ({
        ...s,
        notes: savedNotes[s.id] || s.notes || "",
      }))
    );
    setHasChanges(false);
    showToast("ยกเลิกและคืนค่าเดิมเรียบร้อยแล้ว", "info");
  }

  // 2. ลบนักเรียนออกจาก Neon DB จริง
  async function confirmDelete() {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    const targetName = deleteTarget.name;
    setDeleteTarget(null);

    setStudents((prev) => prev.filter((s) => s.id !== targetId));

    try {
      const res = await fetch(`/api/admin/students?id=${targetId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("ลบไม่สำเร็จ");
      showToast(`ลบ "${targetName}" ออกจากฐานข้อมูลเรียบร้อย`);
    } catch (err) {
      showToast("เกิดข้อผิดพลาดในการลบจากฐานข้อมูล", "info");
      setStudents(initialStudents);
    }
  }

  // 3. เพิ่มนักเรียนลง Neon DB จริง
  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newStudent.name) return;

    const payload = {
      name: newStudent.name,
      nickname: newStudent.nickname,
      grade: newStudent.grade,
      school: newStudent.school,
      phone: newStudent.phone,
      email: newStudent.email,
      courseId: allCourses.find((c) => c.title === newStudent.course)?.id ?? "NONE",
      paymentStatus: newStudent.paymentStatus,
      notes: newStudent.notes,
    };

    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      const created = {
        id: result.student.id,
        name: `${result.student.firstName} ${result.student.lastName}`,
        nickname: result.student.nickname || "-",
        grade: result.student.gradeLevel || "-",
        school: result.student.school || "-",
        phone: result.student.phone || "-",
        email: result.student.email,
        avatarUrl: null,
        course: newStudent.course,
        courseId: payload.courseId,
        amount: Number(newStudent.amount) || 0,
        date: new Date().toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" }),
        paymentStatus: newStudent.paymentStatus,
        notes: newStudent.notes,
      };

      setStudents((prev) => [created, ...prev]);

      if (isPosn || newStudent.course.includes("สอวน")) {
        try {
          const savedPosn = localStorage.getItem("ineedbio_posn_results");
          const posnList = savedPosn ? JSON.parse(savedPosn) : [];
          posnList.unshift({
            name: created.name,
            nickname: created.nickname,
            grade: created.grade,
            subject: newStudent.posnSubject,
            center: newStudent.posnCenter,
            camp1Result: "ยังไม่ทราบผล",
            notes: created.notes,
          });
          localStorage.setItem("ineedbio_posn_results", JSON.stringify(posnList));
        } catch (err) {}
      }

      setIsAddOpen(false);
      showToast(`เพิ่ม "${created.name}" ลงฐานข้อมูลเรียบร้อย`);
      setIsPosn(false);
      setNewStudent({
        name: "",
        nickname: "",
        grade: "ม.4",
        school: "",
        phone: "",
        email: "",
        course: allCourses[0]?.title ?? "สอวน. ชีววิทยา",
        amount: "490",
        paymentStatus: "ชำระแล้ว",
        notes: "",
        posnSubject: "ชีวะ",
        posnCenter: "ศูนย์โรงเรียน",
      });
    } catch (err: any) {
      alert("เพิ่มข้อมูลไม่สำเร็จ: " + err.message);
    }
  }

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
    showToast("ดาวน์โหลดไฟล์ JSON เรียบร้อย");
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-8 flex flex-col gap-6 relative">
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-5 py-3 rounded-full bg-slate-900/90 backdrop-blur-md text-white text-xs font-semibold shadow-2xl transition-all duration-200">
          <span className={toast.type === "success" ? "text-emerald-400" : "text-sky-400"}>
            {toast.type === "success" ? "✓" : "ℹ"}
          </span>
          <span>{toast.message}</span>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] p-6 max-w-[340px] w-full shadow-2xl flex flex-col items-center text-center gap-3 border border-slate-100">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center text-xl font-bold">
              🗑️
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">ยืนยันการลบรายชื่อ</h3>
              <p className="text-xs text-slate-500 mt-1">
                ต้องการลบ <strong className="text-slate-800">"{deleteTarget.name}"</strong> ออกจากระบบใช่หรือไม่?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 w-full mt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmDelete}
                className="h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm"
              >
                ลบข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}

      {/* แถบสลับหน้า */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex gap-2 items-center">
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

        <div className="flex items-center gap-3">
          {hasChanges && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancelAll}
                className="text-xs font-semibold px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSaveAll}
                className="text-xs font-bold px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md animate-pulse transition"
              >
                💾 บันทึกการเปลี่ยนแปลง
              </button>
            </div>
          )}
          <button
            onClick={() => setIsAddOpen(true)}
            className="text-xs font-bold px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white shadow-sm transition"
          >
            + เพิ่มนักเรียน
          </button>
          <button
            onClick={exportJson}
            className="text-xs font-semibold px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm transition"
          >
            📥 ดาวน์โหลด JSON
          </button>
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-black text-slate-900">ทะเบียนนักเรียน & การสมัครคอร์ส</h1>
        <p className="text-xs text-slate-500 mt-1">
          จัดการรายชื่อ อนุมัติสถานะชำระเงิน และตรวจสอบข้อมูลนักเรียน
        </p>
      </div>

      {/* การ์ดคอร์สเรียน */}
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
              <th className="py-3.5 px-4">รูป & ชื่อนักเรียน</th>
              <th className="py-3.5 px-3">ชั้น</th>
              <th className="py-3.5 px-4">โรงเรียน</th>
              <th className="py-3.5 px-4">คอร์สที่สมัคร</th>
              <th className="py-3.5 px-4">ช่องทางติดต่อ</th>
              <th className="py-3.5 px-3">ยอดโอน</th>
              <th className="py-3.5 px-3">สมัครเมื่อ</th>
              <th className="py-3.5 px-4">สถานะเงิน</th>
              <th className="py-3.5 px-4">บันทึก</th>
              <th className="py-3.5 px-3 text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50/80 transition">
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center overflow-hidden flex-shrink-0 text-xs font-bold text-slate-700">
                      {s.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={s.avatarUrl}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      ) : (
                        (s.name[0] ?? "?").toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{s.name}</div>
                      <div className="text-[11px] text-slate-400">({s.nickname})</div>
                    </div>
                  </div>
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
                <td className="py-3.5 px-4">
                  <input
                    type="text"
                    placeholder="พิมพ์โน้ต..."
                    value={s.notes}
                    onChange={(e) => updateStudent(s.id, "notes", e.target.value)}
                    className="h-8 px-2 rounded-lg border border-slate-200 text-xs w-[120px] focus:outline-none focus:border-emerald-500"
                  />
                </td>
                <td className="py-3.5 px-3 text-center">
                  <button
                    onClick={() => setDeleteTarget({ id: s.id, name: s.name })}
                    title="ลบนักเรียนนี้"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-400 text-xs">
                  ไม่พบข้อมูลนักเรียน
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal เพิ่มนักเรียน */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] p-6 max-w-[500px] w-full shadow-2xl flex flex-col gap-4 border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">+ เพิ่มนักเรียนใหม่</h2>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="flex flex-col gap-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">ชื่อ - นามสกุล *</label>
                  <input
                    type="text"
                    required
                    placeholder="สมชาย ใจดี"
                    value={newStudent.name}
                    onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                    className="w-full h-9 px-3 mt-1 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">ชื่อเล่น</label>
                  <input
                    type="text"
                    placeholder="ชาย"
                    value={newStudent.nickname}
                    onChange={(e) => setNewStudent({ ...newStudent, nickname: e.target.value })}
                    className="w-full h-9 px-3 mt-1 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">ระดับชั้น</label>
                  <input
                    type="text"
                    placeholder="เช่น ม.4"
                    value={newStudent.grade}
                    onChange={(e) => setNewStudent({ ...newStudent, grade: e.target.value })}
                    className="w-full h-9 px-3 mt-1 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">โรงเรียน</label>
                  <input
                    type="text"
                    placeholder="ชื่อโรงเรียน"
                    value={newStudent.school}
                    onChange={(e) => setNewStudent({ ...newStudent, school: e.target.value })}
                    className="w-full h-9 px-3 mt-1 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">เบอร์โทร</label>
                  <input
                    type="tel"
                    placeholder="08X-XXX-XXXX"
                    value={newStudent.phone}
                    onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })}
                    className="w-full h-9 px-3 mt-1 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">อีเมล</label>
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={newStudent.email}
                    onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                    className="w-full h-9 px-3 mt-1 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700">คอร์สที่สมัคร</label>
                <select
                  value={newStudent.course}
                  onChange={(e) => setNewStudent({ ...newStudent, course: e.target.value })}
                  className="w-full h-9 px-3 mt-1 rounded-xl border border-slate-200 focus:outline-none bg-white"
                >
                  {allCourses.map((c) => (
                    <option key={c.id} value={c.title}>
                      {c.title}
                    </option>
                  ))}
                  <option value="ทั่วไป">ทั่วไป</option>
                </select>
              </div>

              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 flex flex-col gap-2.5">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-emerald-900">
                  <input
                    type="checkbox"
                    checked={isPosn}
                    onChange={(e) => setIsPosn(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  เป็นนักเรียนค่าย / โครงการ สอวน. (ส่งข้อมูลไปหน้า สอวน.)
                </label>

                {isPosn && (
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">วิชา สอวน.</label>
                      <select
                        value={newStudent.posnSubject}
                        onChange={(e) => setNewStudent({ ...newStudent, posnSubject: e.target.value })}
                        className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-white"
                      >
                        {POSN_SUBJECTS.map((sub) => (
                          <option key={sub} value={sub}>
                            {sub}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">ศูนย์ สอวน.</label>
                      <select
                        value={newStudent.posnCenter}
                        onChange={(e) => setNewStudent({ ...newStudent, posnCenter: e.target.value })}
                        className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-white"
                      >
                        {POSN_CENTERS.map((cen) => (
                          <option key={cen} value={cen}>
                            {cen}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">ยอดเงิน (฿)</label>
                  <input
                    type="number"
                    value={newStudent.amount}
                    onChange={(e) => setNewStudent({ ...newStudent, amount: e.target.value })}
                    className="w-full h-9 px-3 mt-1 rounded-xl border border-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">สถานะชำระเงิน</label>
                  <select
                    value={newStudent.paymentStatus}
                    onChange={(e) => setNewStudent({ ...newStudent, paymentStatus: e.target.value })}
                    className="w-full h-9 px-3 mt-1 rounded-xl border border-slate-200 focus:outline-none bg-white"
                  >
                    <option value="ชำระแล้ว">ชำระแล้ว</option>
                    <option value="รอตรวจสอบ">รอตรวจสอบ</option>
                    <option value="ยังไม่ชำระ">ยังไม่ชำระ</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}