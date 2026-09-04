import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("size-6", className)}
      aria-hidden="true"
    >
      <rect width="24" height="24" rx="6" fill="currentColor" />
      <path
        d="M7 15.5l5-7 5 7"
        fill="none"
        stroke="var(--color-bg)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="8.2" r="1.15" fill="var(--color-brand)" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-fg", className)}>
      <LogoMark />
      <span className="text-[15px] font-semibold tracking-tight">RideRelay</span>
    </span>
  );
}
