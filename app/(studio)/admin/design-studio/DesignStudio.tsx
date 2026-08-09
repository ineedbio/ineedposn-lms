"use client";

import { useState } from "react";
import Link from "next/link";

type Block = {
  id: string;
  type: string;
  order: number;
  isPublished: boolean;
  contentJson: { heading: string; sub: string; bg: string; fg: string; imageUrl?: string };
};

const LIBRARY = [
  { type: "hero", name: "Hero", desc: "หัวข้อใหญ่ + คำอธิบาย", bg: "#1d1d1f", fg: "#fff" },
  { type: "course", name: "การ์ดคอร์ส", desc: "รูป + ชื่อคอร์ส + ราคา", bg: "#f5f5f7", fg: "#1d1d1f" },
  { type: "feature", name: "แถวฟีเจอร์", desc: "หัวข้อ + คำอธิบาย", bg: "#ffffff", fg: "#1d1d1f" },
  { type: "banner", name: "แบนเนอร์", desc: "ข้อความประกาศแถบเดียว", bg: "#1d1d1f", fg: "#fff" },
];

const SWATCHES = ["#ffffff", "#f5f5f7", "#1d1d1f", "#6e6e73"];

export default function DesignStudio({ initialBlocks }: { initialBlocks: Block[] }) {
  const [blocks, setBlocks] = useState(initialBlocks);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const selected = blocks.find((b) => b.id === selectedId) ?? null;

  async function addBlock(lib: (typeof LIBRARY)[number]) {
    const res = await fetch("/api/admin/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        page: "home",
        type: lib.type,
        heading: lib.type === "hero" ? "หัวข้อใหม่" : lib.type === "course" ? "ชื่อคอร์สใหม่" : "หัวข้อใหม่",
        sub: lib.type === "course" ? "0 บาท" : "คำอธิบายสั้น ๆ",
        bg: lib.bg,
        fg: lib.fg,
      }),
    });
    if (res.ok) {
      const block = await res.json();
      setBlocks((b) => [...b, block]);
      setSelectedId(block.id);
    }
  }

  async function patchSelected(patch: Record<string, unknown>) {
    if (!selected) return;
    setBlocks((bs) =>
      bs.map((b) => (b.id === selected.id ? { ...b, contentJson: { ...b.contentJson, ...patch } } : b))
    );
    setSaving(true);
    await fetch(`/api/admin/blocks/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setSaving(false);
  }

  async function uploadImage(file: File | null) {
    if (!file || !selected) return;
    const formData = new FormData();
    formData.append("file", file);
    setSaving(true);
    const res = await fetch(`/api/admin/blocks/${selected.id}/image`, { method: "POST", body: formData });
    setSaving(false);
    if (res.ok) {
      const updated = await res.json();
      setBlocks((bs) => bs.map((b) => (b.id === selected.id ? updated : b)));
    }
  }

  async function deleteSelected() {
    if (!selected) return;
    await fetch(`/api/admin/blocks/${selected.id}`, { method: "DELETE" });
    setBlocks((bs) => bs.filter((b) => b.id !== selected.id));
    setSelectedId(null);
  }

  async function togglePublish() {
    if (!selected) return;
    const next = !selected.isPublished;
    setBlocks((bs) => bs.map((b) => (b.id === selected.id ? { ...b, isPublished: next } : b)));
    await fetch(`/api/admin/blocks/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: next }),
    });
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white">
      <header className="h-[60px] flex-shrink-0 flex items-center justify-between px-6 bg-ink text-white">
        <div className="flex items-center gap-5">
          <Link href="/admin/payments" className="text-sm font-semibold text-muted hover:text-white transition">
            ← กลับ Admin
          </Link>
          <div className="w-px h-5 bg-dark-hover" />
          <div className="text-[15px] font-bold">Design Studio · หน้าแรก</div>
        </div>
        <div className="text-xs font-medium text-muted">{saving ? "กำลังบันทึก..." : "บันทึกอัตโนมัติแล้ว"}</div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-[250px] flex-shrink-0 border-r border-border-light p-4 overflow-y-auto flex flex-col gap-6">
          <div className="text-[13px] font-bold text-secondary px-2">คลังบล็อก</div>
          {LIBRARY.map((lib) => (
            <button
              key={lib.type}
              onClick={() => addBlock(lib)}
              className="flex flex-col gap-1.5 p-4 rounded-2xl bg-panel text-left hover:bg-border-light transition-all duration-150 active:scale-[0.97]"
            >
              <div className="text-sm font-bold">{lib.name}</div>
              <div className="text-xs text-secondary">{lib.desc}</div>
              <div className="text-xs font-bold text-ink mt-1">+ เพิ่มลงแคนวาส</div>
            </button>
          ))}
        </aside>

        <main className="flex-1 bg-[#f0f0f2] overflow-y-auto p-10 flex justify-center">
          <div className="w-full max-w-[820px] bg-white rounded-2xl overflow-hidden shadow-[0_0_0_1px_#e5e5e7] flex flex-col h-fit">
            {blocks.length === 0 && (
              <div className="py-20 px-8 text-center text-muted text-[15px]">
                แคนวาสว่าง — เลือกบล็อกจากด้านซ้ายเพื่อเริ่ม
              </div>
            )}
            {blocks.map((b) => (
              <div
                key={b.id}
                onClick={() => setSelectedId(b.id)}
                className="relative px-8 py-9 cursor-pointer transition-shadow"
                style={{
                  background: b.contentJson.bg,
                  color: b.contentJson.fg,
                  outline: b.id === selectedId ? "2px solid #1d1d1f" : "none",
                  outlineOffset: "-2px",
                  opacity: b.isPublished ? 1 : 0.4,
                }}
              >
                {!b.isPublished && (
                  <div className="absolute top-3 right-3 text-[10px] font-bold bg-white/90 text-ink px-2 py-1 rounded-pill">
                    ไม่เผยแพร่
                  </div>
                )}
                {b.type === "hero" && (
                  <>
                    <div className="text-xs font-semibold opacity-60 mb-2">HERO</div>
                    <div className="text-[30px] font-extrabold tracking-[-0.02em]">{b.contentJson.heading}</div>
                    <div className="text-[15px] opacity-70 mt-2">{b.contentJson.sub}</div>
                  </>
                )}
                {b.type === "course" && (
                  <>
                    <div className="text-xs font-semibold opacity-60 mb-2">การ์ดคอร์ส</div>
                    <div className="flex gap-5 items-center">
                      <div className="w-[110px] h-20 flex-shrink-0 rounded-[10px] bg-black/5 flex items-center justify-center text-xs opacity-60 overflow-hidden">
                        {b.contentJson.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={b.contentJson.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          "รูป"
                        )}
                      </div>
                      <div>
                        <div className="text-xl font-extrabold">{b.contentJson.heading}</div>
                        <div className="text-sm opacity-70 mt-1">{b.contentJson.sub}</div>
                      </div>
                    </div>
                  </>
                )}
                {b.type === "feature" && (
                  <>
                    <div className="text-xs font-semibold opacity-60 mb-2">แถวฟีเจอร์</div>
                    <div className="text-[22px] font-extrabold">{b.contentJson.heading}</div>
                    <div className="text-sm opacity-70 mt-1.5">{b.contentJson.sub}</div>
                  </>
                )}
                {b.type === "banner" && (
                  <>
                    <div className="text-xs font-semibold opacity-60 mb-2">แบนเนอร์</div>
                    <div className="text-lg font-bold text-center">{b.contentJson.heading}</div>
                  </>
                )}
              </div>
            ))}
          </div>
        </main>

        <aside className="w-[300px] flex-shrink-0 border-l border-border-light p-5 overflow-y-auto">
          {selected ? (
            <div className="flex flex-col gap-5">
              <div className="flex justify-between items-center">
                <div className="text-sm font-bold">แก้ไขบล็อก</div>
                <button
                  onClick={deleteSelected}
                  className="text-[13px] font-semibold text-muted hover:text-ink transition"
                >
                  ลบ
                </button>
              </div>

              <label className="flex items-center gap-2 text-sm font-medium text-secondary cursor-pointer select-none">
                <input type="checkbox" checked={selected.isPublished} onChange={togglePublish} />
                เผยแพร่บนหน้าแรก
              </label>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-secondary">หัวข้อ</label>
                <input
                  value={selected.contentJson.heading}
                  onChange={(e) => patchSelected({ heading: e.target.value })}
                  className="h-[42px] rounded-[10px] border-[1.5px] border-border px-3 text-sm focus:outline-none focus:border-ink transition"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-secondary">คำอธิบาย</label>
                <textarea
                  value={selected.contentJson.sub}
                  onChange={(e) => patchSelected({ sub: e.target.value })}
                  rows={3}
                  className="rounded-[10px] border-[1.5px] border-border px-3 py-2.5 text-sm focus:outline-none focus:border-ink transition resize-y"
                />
              </div>

              {selected.type === "course" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-secondary">รูปภาพ</label>
                  <label className="cursor-pointer bg-panel border-[1.5px] border-border px-3.5 py-2.5 rounded-lg text-xs font-semibold text-ink hover:border-ink transition text-center">
                    อัปโหลดรูป
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => uploadImage(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-secondary">สีพื้นหลัง</label>
                <div className="flex gap-2">
                  {SWATCHES.map((c) => (
                    <button
                      key={c}
                      onClick={() =>
                        patchSelected({ bg: c, fg: c === "#1d1d1f" ? "#ffffff" : "#1d1d1f" })
                      }
                      className="w-[34px] h-[34px] rounded-full transition-transform duration-150 active:scale-90"
                      style={{
                        background: c,
                        border: `2px solid ${selected.contentJson.bg === c ? "#1d1d1f" : "#d2d2d7"}`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted leading-relaxed">
              เลือกบล็อกในแคนวาสตรงกลางเพื่อแก้ไขข้อความ สี และรูปภาพ
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
