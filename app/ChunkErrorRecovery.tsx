"use client";

import { useEffect } from "react";

/**
 * After every new deploy, any browser tab that was already open is still
 * holding references to the PREVIOUS build's JavaScript file names. The
 * moment that tab tries to navigate (click a link, submit a form that
 * triggers a client-side transition), it requests a JS chunk that no
 * longer exists → the navigation silently fails, which looks exactly like
 * "the page just reloaded and my form data disappeared" or "404."
 *
 * This is a well-known class of bug in any app that ships frequent
 * deploys. The fix belongs here, not in a support instruction telling
 * users to clear their cache — most students would never do that and
 * would just conclude the site is broken.
 *
 * This listens globally for that exact failure signature and forces a
 * full page reload automatically, which fetches the current build fresh.
 * A student who hits this sees, at worst, a one-time reload — never a
 * dead page.
 */
export default function ChunkErrorRecovery() {
  useEffect(() => {
    function isChunkError(message: string) {
      return (
        message.includes("ChunkLoadError") ||
        message.includes("Loading chunk") ||
        message.includes("Failed to fetch dynamically imported module") ||
        message.includes("Importing a module script failed")
      );
    }

    function handleError(event: ErrorEvent) {
      if (isChunkError(event.message ?? "")) {
        window.location.reload();
      }
    }

    function handleRejection(event: PromiseRejectionEvent) {
      const message =
        (event.reason && (event.reason.message ?? String(event.reason))) ?? "";
      if (isChunkError(message)) {
        window.location.reload();
      }
    }

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}
