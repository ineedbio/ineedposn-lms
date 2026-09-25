"use client";

import { useRef, useState } from "react";
import { Btn, api, inputCls, toast } from "./ui";

/** URL input with an "อัปโหลดรูป" button that uploads to /api/admin/upload and fills in the URL. */
export default function ImageField({ value, onChange, folder, placeholder = "https://..." }: { value: string; onChange: (v: string) => void; folder: string; placeholder?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  async function upload(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast("เลือกไฟล์รูปภาพ", true);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", folder);
      const r = await api<{ url: string }>("/api/admin/upload", "POST", fd);
      onChange(r.url);
      toast("อัปโหลดรูปแล้ว");
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }
  return (
    <div className="flex items-center gap-2">
      {value && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="h-10 w-10 flex-none rounded-lg border border-border object-cover" />
      )}
      <input className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0])} />
      <Btn variant="quiet" small busy={busy} onClick={() => input.current?.click()}>อัปโหลดรูป</Btn>
    </div>
  );
}
