import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-lg bg-surface px-3 py-2.5 text-base text-fg shadow-card",
        "placeholder:text-subtle",
        "focus-visible:outline-none focus-visible:shadow-card-hover",
        className,
      )}
      {...props}
    />
  );
}
