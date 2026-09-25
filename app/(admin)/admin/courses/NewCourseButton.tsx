"use client";

import { useState } from "react";
import { Btn } from "@/components/admin/ui";
import CourseModal from "./CourseModal";

export default function NewCourseButton({ subjects }: { subjects: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Btn small onClick={() => setOpen(true)}>+ คอร์สใหม่</Btn>
      {open && <CourseModal subjects={subjects} onClose={() => setOpen(false)} />}
    </>
  );
}
