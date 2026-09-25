import Link, { type LinkProps } from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type Size = "md" | "sm" | "xs";

const base =
  "inline-flex items-center justify-center gap-1.5 rounded-pill border font-medium whitespace-nowrap no-underline transition-opacity duration-150 hover:opacity-[.86] disabled:opacity-35 disabled:cursor-not-allowed";

const variants: Record<Variant, string> = {
  primary: "border-accent bg-accent text-on-accent",
  outline: "border-accent bg-transparent text-accent",
  secondary: "border-border bg-transparent text-secondary",
  ghost: "border-transparent bg-transparent text-secondary hover:text-ink",
  danger: "border-no bg-transparent text-no",
};

const sizes: Record<Size, string> = {
  md: "px-5 py-2 text-[15px]",
  sm: "px-4 py-1.5 text-sm",
  xs: "px-3 py-0.5 text-[12.5px]",
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

/** Shared pill button (accent fill, outline, quiet, ghost, danger) used across the site. */
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
