"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const REPORT_INTERVAL_MS = 8000;

/**
 * Wraps a YouTube video in the IFrame Player API so we can read real
 * playback time (`getCurrentTime()` / `getDuration()`) instead of trusting
 * "the student opened this page" as a proxy for having watched it.
 *
 * Reports progress every REPORT_INTERVAL_MS while playing, and once more on
 * pause/unmount so a short viewing session still gets recorded.
 */
export default function LessonPlayer({
  lessonId,
  videoId,
  containerId,
}: {
  lessonId: string;
  videoId: string;
  containerId: string;
}) {
  const playerRef = useRef<any>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastReportedRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    function report(finalCall = false) {
      const player = playerRef.current;
      if (!player || typeof player.getCurrentTime !== "function") return;
      const current = Math.floor(player.getCurrentTime() || 0);
      const total = Math.floor(player.getDuration() || 0);
      // Skip redundant pings (e.g. video paused with no new time watched).
      if (!finalCall && current <= lastReportedRef.current) return;
      lastReportedRef.current = current;
      fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // keepalive lets this last ping survive a page unload/navigation.
        keepalive: finalCall,
        body: JSON.stringify({ lessonId, watchedSeconds: current, totalSeconds: total || null }),
      }).catch(() => {
        // Best-effort — a dropped progress ping just means the next one
        // (or the next lesson visit) catches up; it should never disrupt
        // playback.
      });
    }

    function startInterval() {
      if (intervalRef.current) return;
      intervalRef.current = setInterval(() => report(false), REPORT_INTERVAL_MS);
    }
    function stopInterval() {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    function createPlayer() {
      if (cancelled) return;
      playerRef.current = new window.YT.Player(containerId, {
        videoId,
        playerVars: { rel: 0 },
        events: {
          onStateChange: (e: any) => {
            const YT = window.YT;
            if (e.data === YT.PlayerState.PLAYING) startInterval();
            else {
              stopInterval();
              if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.ENDED) report(true);
            }
          },
        },
      });
    }

    if (window.YT && window.YT.Player) {
      createPlayer();
    } else {
      const existingScript = document.getElementById("youtube-iframe-api");
      if (!existingScript) {
        const tag = document.createElement("script");
        tag.id = "youtube-iframe-api";
        tag.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(tag);
      }
      const prevReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prevReady?.();
        createPlayer();
      };
    }

    return () => {
      cancelled = true;
      stopInterval();
      report(true);
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, videoId, containerId]);

  return <div id={containerId} className="w-full h-full" />;
}
