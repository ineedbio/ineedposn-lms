import Link, { type LinkProps } from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "sm";

const base =
  "inline-flex items-center justify-center gap-2 rounded-pill font-semibold transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-white shadow-soft hover:bg-accent-hover hover:shadow-soft-lg hover:-translate-y-0.5",
  secondary: "bg-panel text-ink hover:bg-border-light",
  ghost: "text-secondary hover:text-ink",
};

const sizes: Record<Size, string> = {
  md: "h-[50px] px-7 text-base",
  sm: "px-5 py-2.5 text-sm",
};

function cls(variant: Variant, size: Size, className?: string) {
  return `${base} ${sizes[size]} ${variants[variant]} ${className ?? ""}`;
}

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
};

/** Same visual style as Button, rendered as a Next Link for navigation CTAs. */
export function LinkButton({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: CommonProps & LinkProps & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  return (
    <Link className={cls(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}

/** Shared pill button: rounded-pill, soft resting shadow, a lift + deeper shadow on hover — used for every primary/secondary action across the site instead of duplicating the same className string per page. */
export default function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={cls(variant, size, className)} {...rest}>
      {children}
    </button>
  );
}
