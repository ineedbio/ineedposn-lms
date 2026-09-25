"use client";

import { useEffect, useState, type ReactNode } from "react";

/* Shared building blocks for the admin pages (same look as the Apps Script admin). */

export const inputCls =
  "w-full rounded-[11px] border border-border bg-paper px-3 py-2.5 text-[15px] focus:border-accent focus:outline-none";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="grid content-start gap-1.5 text-sm font-medium">
      {label}
      {children}
      {hint && <span className="text-[13px] font-normal text-muted">{hint}</span>}
    </label>
  );
}

export function Section({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mt-2 border-t border-border pt-4">
      <h3 className="text-[15px] font-bold text-accent">{title}</h3>
      {hint && <p className="mt-0.5 text-[13px] text-muted">{hint}</p>}
    </div>
  );
}

export function Modal({
  title,
  sub,
  wide,
  onClose,
  children,
}: {
  title: ReactNode;
  sub?: ReactNode;
  wide?: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" className={`my-6 grid w-full gap-4 rounded-3xl bg-paper p-6 shadow-pop ${wide ? "max-w-[680px]" : "max-w-[460px]"}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">{title}</h2>
            {sub && <p className="mt-0.5 text-sm text-secondary">{sub}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="ปิด" className="-mr-1 -mt-1 rounded-full p-1.5 text-2xl leading-none text-muted hover:text-ink">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

type ConfirmOpts = { title: string; body: string; ok: string; danger?: boolean };

/** Promise-based confirm dialog: `if (await confirm({...})) doIt()`. */
export function useConfirm() {
  const [state, setState] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);
  const confirm = (o: ConfirmOpts) => new Promise<boolean>((resolve) => setState({ ...o, resolve }));
  const close = (v: boolean) => {
    state?.resolve(v);
    setState(null);
  };
  const node = state ? (
    <Modal title={state.title} onClose={() => close(false)}>
      <p className="text-secondary">{state.body}</p>
      <div className="flex justify-end gap-2.5">
        <Btn variant="quiet" onClick={() => close(false)}>ยกเลิก</Btn>
        <Btn variant={state.danger ? "danger" : "primary"} onClick={() => close(true)}>{state.ok}</Btn>
      </div>
    </Modal>
  ) : null;
  return { confirm, confirmNode: node };
}

const BTN = {
  primary: "border-accent bg-accent text-on-accent",
  ghost: "border-accent bg-transparent text-accent",
  quiet: "border-border bg-transparent text-secondary",
  danger: "border-no bg-transparent text-no",
};

/** Small pill button used throughout the admin. */
export function Btn({
  variant = "primary",
  small,
  busy,
  className = "",
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof BTN; small?: boolean; busy?: boolean }) {
  return (
    <button
      type="button"
      disabled={busy || rest.disabled}
      className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-pill border font-medium transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40 ${
        small ? "px-3 py-0.5 text-[12.5px]" : "px-4 py-1.5 text-sm"
      } ${BTN[variant]} ${className}`}
      {...rest}
    >
      {busy && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />}
      {children}
    </button>
  );
}

let pushToast: ((msg: string, bad?: boolean) => void) | null = null;

/** Show a short message at the bottom of the screen (mount <Toaster/> once in the admin layout). */
export function toast(msg: string, bad = false) {
  pushToast?.(msg, bad);
}

export function Toaster() {
  const [items, setItems] = useState<{ id: number; msg: string; bad: boolean }[]>([]);
  useEffect(() => {
    pushToast = (msg, bad = false) => {
      const id = Date.now() + Math.random();
      setItems((xs) => [...xs, { id, msg, bad }]);
      setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 3200);
    };
    return () => {
      pushToast = null;
    };
  }, []);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[60] grid justify-items-center gap-2 px-4">
      {items.map((t) => (
        <div key={t.id} role="status" className={`rounded-pill px-5 py-2.5 text-sm shadow-pop ${t.bad ? "bg-no text-white" : "bg-ink text-white"}`}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

/** JSON fetch helper for admin API routes: throws the server's error message. */
export async function api<T = any>(url: string, method = "GET", body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body instanceof FormData || body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `เกิดข้อผิดพลาด (${res.status})`);
  return data as T;
}

/** "25 ก.ย. 69" or "25 ก.ย. 69 14:05" */
export function thDate(d: string | Date | null | undefined, withTime = false) {
  if (!d) return "–";
  const dt = new Date(d);
  return dt.toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    year: "2-digit",
    timeZone: "Asia/Bangkok",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function AdminHeader({ title, sub, children }: { title: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="grid gap-1">
        <h1 className="text-[26px] font-bold">{title}</h1>
        {sub && <p className="text-sm text-secondary">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2.5">{children}</div>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center text-secondary">{children}</div>;
}

export function Badge({ tone = "soft", children }: { tone?: "ok" | "wait" | "no" | "inv" | "soft"; children: ReactNode }) {
  const t = { ok: "bg-ok-soft text-ok", wait: "bg-wait-soft text-wait", no: "bg-no-soft text-no", inv: "bg-accent text-on-accent", soft: "bg-panel-2 text-secondary" }[tone];
  return <span className={`inline-block whitespace-nowrap rounded-pill px-2.5 py-0.5 text-xs font-medium ${t}`}>{children}</span>;
}
