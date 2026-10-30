import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "solid" | "line";
type Size = "md" | "sm";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50";
const variants: Record<Variant, string> = {
  solid: "bg-accent text-on-accent hover:opacity-90",
  line: "border border-line text-text hover:border-text",
};
const sizes: Record<Size, string> = {
  md: "h-12 px-5 text-[15px]",
  sm: "h-11 px-4 text-sm",
};

export function buttonClass(variant: Variant = "solid", size: Size = "md", extra = "") {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`;
}

type Common = { variant?: Variant; size?: Size; className?: string; children: ReactNode };

export function Button({ href, variant, size, className, children, ...rest }: Common & { href?: string } & Omit<ComponentProps<"button">, "className" | "children">) {
  const cls = buttonClass(variant, size, className);
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}
