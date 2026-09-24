"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";

const CENTERS = [
  { name: "ม.เทคโนโลยีสุรนารี", region: "อีสาน" },
  { name: "ศูนย์โรงเรียน", region: "ศูนย์โรงเรียน" },
  { name: "ยังไม่ระบุ", region: "ยังไม่ระบุ" },
  { name: "ม.ขอนแก่น", region: "อีสาน" },
  { name: "ม.สงขลานครินทร์", region: "ใต้" },
  { name: "ม.นเรศวร", region: "เหนือ" },
  { name: "ม.อุบลราชธานี", region: "อีสาน" },
  { name: "ม.ศิลปากร", region: "กลาง/กทม." },
  { name: "ม.เชียงใหม่", region: "เหนือ" },
  { name: "ม.ทักษิณ", region: "ใต้" },
  { name: "ม.บูรพา", region: "ตะวันออก" },
  { name: "ม.เกษตรศาสตร์", region: "กลาง/กทม." },
  { name: "ม.วลัยลักษณ์", region: "ใต้" },
  { name: "ม.เทคโนโลยีพระจอมเกล้าพระนครเหนือ", region: "กลาง/กทม." },
  { name: "จุฬาลงกรณ์มหาวิทยาลัย", region: "กลาง/กทม." },
  { name: "ม.มหิดล", region: "กลาง/กทม." },
  { name: "ม.ธรรมศาสตร์", region: "กลาง/กทม." },
];

const CAMP_RESULTS = ["ทั้งหมด", "ยังไม่ทราบผล", "ผ่านค่าย 1", "ตัวสำรอง", "ไม่ผ่าน"];

export default function CampResultsClient() {
  const [data, setData] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCenter, setSelectedCenter] = useState<string | null>(null);
  const [selectedResult, setSelectedResult] = useState("ทั้งหมด");

  useEffect(() => {
    const saved = localStorage.getItem("ineedbio_posn_results");
    if (saved) {
      try {
        setData(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  function updateItem(index: number, field: string, value: string) {
    const next = [...data];
    next[index][field] = value;
    setData(next);
    localStorage.setItem("ineedbio_posn_results", JSON.stringify(next));
  }

  function handleImportJson(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const list = json["ติดตามผล"] || json["นักเรียน"] || json;
        if (Array.isArray(list)) {
          const formatted = list.map((item: any) => ({
            name: item["ชื่อ"] || item.name || "-",
            nickname: item["ชื่อเล่น"] || item.nickname || "-",
            grade: item["ชั้น"] || item.grade || "-",
            subject: item["วิชา"] || "ชีวะ",
            center: item["ศูนย์"] || item.center || "ยังไม่ระบุ",
            camp1Result: item["ผลค่าย1"] || item.camp1Result || "ยังไม่ทราบผล",
            notes: item["บันทึก"] || item.notes || "",
          }));
          setData(formatted);
          localStorage.setItem("ineedbio_posn_results", JSON.stringify(formatted));
          alert(`นำเข้าสำเร็จ ${formatted.length} รายการ!`);
        }
      } catch (err) {
        alert("ไฟล์ JSON ไม่ถูกต้อง");
      }
    };
    reader.readAsText(file);
  }

  function exportJson() {
    const payload = {
      saved: new Date().toISOString(),
      ติดตามผล: data.map((d) => ({
        ชื่อ: d.name,
        ชื่อเล่น: d.nickname,
        ชั้น: d.grade,
        วิชา: d.subject,
        ศูนย์: d.center,
        ผลค่าย1: d.camp1Result,
        บันทึก: d.notes,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ineedbio-ผลค่าย1-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const centerCounts = useMemo(() => {
    const map: Record<string, number> = {};
    CENTERS.forEach((c) => (map[c.name] = 0));
    data.forEach((d) => {
      map[d.center] = (map[d.center] || 0) + 1;
    });
    return map;
  }, [data]);

  const filtered = useMemo(() => {
    return data.filter((d) => {
      const matchSearch =
        search === "" ||
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.nickname.toLowerCase().includes(search.toLowerCase()) ||
        d.center.toLowerCase().includes(search.toLowerCase());

      const matchCenter = !selectedCenter || d.center === selectedCenter;
      const matchResult = selectedResult === "ทั้งหมด" || d.camp1Result === selectedResult;
      return matchSearch && matchCenter && matchResult;
    });
  }, [data, search, selectedCenter, selectedResult]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-8 flex flex-col gap-6">
      {/* แถบสลับหน้า (เอาปุ่มกลับหน้าหลักออกแล้ว) */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex gap-2 items-center">
          <Link
            href="/admin/students"
            className="px-4 py-2 rounded-xl text-slate-600 hover:bg-white/80 font-medium text-sm transition"
          >
            📋 ทะเบียนนักเรียน & คอร์ส
          </Link>
          <Link
            href="/admin/camp-results"
            className="px-4 py-2 rounded-xl bg-white text-emerald-700 font-bold shadow-sm border border-slate-200 text-sm"
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

      <div>
        <h1 className="text-2xl font-black text-slate-900">ทะเบียนติดตามผล สอวน. (ค่าย 1)</h1>
        <p className="text-xs text-slate-500 mt-1">
          แยกตาม 17 ศูนย์ สอวน. และบันทึกผลการคัดเลือก
        </p>
      </div>

      {/* การ์ด 17 ศูนย์ สอวน. */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
        {CENTERS.map((c) => {
          const count = centerCounts[c.name] || 0;
          const isSelected = selectedCenter === c.name;
          return (
            <div
              key={c.name}
              onClick={() => setSelectedCenter(isSelected ? null : c.name)}
              className={`p-3 rounded-2xl border cursor-pointer transition-all bg-white shadow-sm ${
                isSelected
                  ? "border-emerald-600 ring-2 ring-emerald-500/20"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="text-[11px] font-bold text-slate-800 line-clamp-1">{c.name}</div>
              <div className="text-sm font-black text-emerald-600 mt-1">{count} คน</div>
            </div>
          );
        })}
      </div>

      {/* ค้นหาและตาราง */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3">
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="🔍 ค้นหา ชื่อ, ศูนย์ สอวน..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 h-10 px-3.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-500"
          />
          <select
            value={selectedResult}
            onChange={(e) => setSelectedResult(e.target.value)}
            className="h-10 px-3 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none"
          >
            {CAMP_RESULTS.map((r) => (
              <option key={r} value={r}>
                {r === "ทั้งหมด" ? "ผลค่าย 1 (ทั้งหมด)" : r}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                <th className="py-3 px-4">ชื่อ - นามสกุล</th>
                <th className="py-3 px-3">ชื่อเล่น</th>
                <th className="py-3 px-3">ชั้น</th>
                <th className="py-3 px-3">วิชา</th>
                <th className="py-3 px-4">ศูนย์ สอวน.</th>
                <th className="py-3 px-4">ผลค่าย 1</th>
                <th className="py-3 px-4">บันทึก</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-bold text-slate-900">{item.name}</td>
                  <td className="py-3 px-3 text-slate-600">{item.nickname}</td>
                  <td className="py-3 px-3 text-slate-600">{item.grade}</td>
                  <td className="py-3 px-3 font-semibold text-emerald-700">{item.subject}</td>
                  <td className="py-3 px-4 font-medium text-slate-800">{item.center}</td>
                  <td className="py-3 px-4">
                    <select
                      value={item.camp1Result}
                      onChange={(e) => updateItem(idx, "camp1Result", e.target.value)}
                      className={`h-7 px-2 rounded-lg border text-xs font-semibold ${
                        item.camp1Result === "ผ่านค่าย 1"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                          : item.camp1Result === "ตัวสำรอง"
                          ? "bg-amber-50 text-amber-700 border-amber-300"
                          : "bg-slate-50 text-slate-600 border-slate-200"
                      }`}
                    >
                      <option value="ยังไม่ทราบผล">ยังไม่ทราบผล</option>
                      <option value="ผ่านค่าย 1">ผ่านค่าย 1</option>
                      <option value="ตัวสำรอง">ตัวสำรอง</option>
                      <option value="ไม่ผ่าน">ไม่ผ่าน</option>
                    </select>
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="text"
                      placeholder="โน้ต..."
                      value={item.notes}
                      onChange={(e) => updateItem(idx, "notes", e.target.value)}
                      className="h-7 px-2 rounded-lg border border-slate-200 text-xs w-[140px] focus:outline-none"
                    />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    ยังไม่มีข้อมูล (กดปุ่ม "นำเข้าไฟล์ JSON" ด้านบนเพื่อโหลดข้อมูล สอวน.)
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}