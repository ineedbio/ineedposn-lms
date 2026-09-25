"use client";

import { useState } from "react";
import { Modal } from "./admin/ui";

/** Stand-in for the enroll button while enrollment is closed: opens a popup explaining why. */
export default function EnrollClosedButton({ label, message, className }: { label: string; message: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className ?? "inline-flex w-full items-center justify-center rounded-pill border border-accent bg-accent px-5 py-2 text-[15px] font-medium text-on-accent transition-opacity hover:opacity-[.86]"}
      >
        {label}
      </button>
      {open && (
        <Modal title="ยังไม่เปิดรับสมัคร" onClose={() => setOpen(false)}>
          <p className="text-secondary">{message}</p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-full rounded-pill border border-accent bg-accent px-5 py-2 font-medium text-on-accent hover:opacity-[.86]"
          >
            ตกลง
          </button>
        </Modal>
      )}
    </>
  );
}
