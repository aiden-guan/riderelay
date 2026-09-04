import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium transition-[transform,background-color,box-shadow,opacity] duration-150 ease-out active:not-disabled:scale-[0.96] disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none",
  {
    variants: {
      variant: {
        primary:
          "bg-fg text-bg hover:bg-fg/90 shadow-[0_1px_0_rgba(255,255,255,0.12)_inset]",
        secondary:
          "bg-surface text-fg shadow-card hover:shadow-card-hover",
        ghost: "bg-transparent text-fg hover:bg-fg/5",
        brand: "bg-brand text-brand-ink hover:bg-brand/90",
        danger: "bg-danger text-bg hover:bg-danger/90",
      },
      size: {
        sm: "h-9 min-h-9 px-3 text-sm rounded-md",
        md: "h-11 min-h-11 px-4 text-sm rounded-lg",
        lg: "h-12 min-h-12 px-5 text-base rounded-xl",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}
