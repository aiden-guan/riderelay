import { Bike, Zap } from "lucide-react";
import { providerTone } from "@/lib/providers";
import { cn } from "@/lib/utils";

export function ProviderMark({
  slug,
  iconKey,
  className,
}: {
  slug: string;
  iconKey?: string;
  className?: string;
}) {
  const tone = providerTone(slug);
  const Icon = iconKey === "bike" || slug === "veo" ? Bike : Zap;
  return (
    <span
      className={cn(
        "inline-flex size-10 items-center justify-center rounded-lg",
        tone === "lime" && "bg-brand text-brand-ink",
        tone === "veo" && "bg-veo text-bg",
        tone === "ink" && "bg-fg text-bg",
        className,
      )}
    >
      <Icon className="size-5" strokeWidth={1.75} />
    </span>
  );
}

export function ProviderName({ slug, name }: { slug: string; name: string }) {
  const tone = providerTone(slug);
  return (
    <span
      className={cn(
        "text-xs font-semibold uppercase tracking-[0.14em]",
        tone === "lime" && "text-brand-ink",
        tone === "veo" && "text-veo",
        tone === "ink" && "text-muted",
      )}
    >
      {name}
    </span>
  );
}
