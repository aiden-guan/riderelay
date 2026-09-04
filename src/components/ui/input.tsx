import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-lg bg-surface px-3 text-base text-fg shadow-card",
        "placeholder:text-subtle",
        "focus-visible:outline-none focus-visible:shadow-card-hover",
        "disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
