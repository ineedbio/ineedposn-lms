"use client";

import { useState } from "react";
import CourseTile, { type TileCourse } from "./CourseTile";
import { subjectKey } from "@/lib/site";

/** Home-page course grid with subject filter chips. */
export default function CourseGrid({ courses }: { courses: TileCourse[] }) {
  const [subject, setSubject] = useState<string | null>(null);
  const subjects = Array.from(new Map(courses.map((c) => [c.subject.slug, c.subject])).values());
  const list = subject ? courses.filter((c) => c.subject.slug === subject) : courses;

  return (
    <>
      {subjects.length > 1 && (
        <div className="flex flex-wrap gap-2 pb-5 pt-1.5" role="group" aria-label="กรองตามวิชา">
          {subjects.map((s) => {
            const on = subject === s.slug;
            return (
              <button
                key={s.slug}
                type="button"
                aria-pressed={on}
                onClick={() => setSubject(on ? null : s.slug)}
                className={`s-${subjectKey(s)} rounded-pill border px-4 py-1.5 text-sm transition-colors ${
                  on ? "border-accent bg-accent font-medium text-on-accent" : "border-border bg-paper text-secondary hover:text-ink"
                }`}
              >
                <i className={`mr-[7px] inline-block h-2 w-2 rounded-full align-[1px] ${on ? "bg-on-accent" : "bg-accent"}`} />
                {s.name}
              </button>
            );
          })}
        </div>
      )}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-[18px] max-[360px]:grid-cols-1">
        {list.map((c) => (
          <CourseTile key={c.slug} course={c} />
        ))}
      </div>
    </>
  );
}
