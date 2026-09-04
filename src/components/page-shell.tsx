import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageShell({
  children,
  className,
  wide = false,
}: {
  children: ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <main
      className={cn(
        "mx-auto w-full flex-1 px-4 py-10 sm:px-6 sm:py-14",
        wide ? "max-w-5xl" : "max-w-xl",
        className,
      )}
    >
      {children}
    </main>
  );
}
