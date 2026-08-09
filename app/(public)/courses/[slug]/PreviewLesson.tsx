"use client";

import { useState } from "react";

function toEmbedUrl(url: string) {
  const match = url.match(/(?:youtu\.be\/|[?&]v=|\/embed\/)([\w-]{11})/);
  const id = match?.[1];
  return id ? `https://www.youtube.com/embed/${id}?autoplay=1` : null;
}

export default function PreviewLesson({ youtubeUrl }: { youtubeUrl: string }) {
  const [open, setOpen] = useState(false);
  const embed = toEmbedUrl(youtubeUrl);
  if (!embed) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-semibold text-ink bg-panel px-3.5 py-1.5 rounded-pill hover:bg-border-light transition-all duration-150 active:scale-[0.96]"
      >
        ทดลองเรียน
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-6"
          onClick={() => setOpen(false)}
        >
          <div className="w-full max-w-3xl aspect-video" onClick={(e) => e.stopPropagation()}>
            <iframe
              src={embed}
              className="w-full h-full rounded-xl"
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </>
  );
}
