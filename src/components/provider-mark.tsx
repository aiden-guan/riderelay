import { cn } from "@/lib/utils";

export function providerLockup(name: string): string {
  const cleaned = name.replace(/\.com$/i, "").trim();
  const parts = cleaned.split(/[\s/-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }
  return cleaned.slice(0, 2);
}

export function ProviderMark({
  slug,
  name,
  accent,
  accentFg,
  className,
}: {
  slug: string;
  name?: string;
  iconKey?: string;
  accent?: string;
  accentFg?: string;
  className?: string;
}) {
  const lockup = providerLockup(name || slug);
  return (
    <span
      className={cn(
        "inline-flex size-10 items-center justify-center rounded-md font-semibold leading-none tracking-tight",
        !accent && slug === "lime" && "bg-brand text-brand-ink",
        !accent && slug === "veo" && "bg-veo text-bg",
        !accent && slug !== "lime" && slug !== "veo" && "bg-fg text-bg",
        className,
      )}
      style={accent ? { backgroundColor: accent, color: accentFg || "#F4F1EA" } : undefined}
      aria-hidden
    >
      {lockup}
    </span>
  );
}

export function ProviderName({ slug, name }: { slug: string; name: string }) {
  return (
    <span
      className={cn(
        "text-xs font-semibold uppercase tracking-[0.14em]",
        slug === "lime" && "text-brand-ink",
        slug === "veo" && "text-veo",
        slug !== "lime" && slug !== "veo" && "text-muted",
      )}
    >
      {name}
    </span>
  );
}
