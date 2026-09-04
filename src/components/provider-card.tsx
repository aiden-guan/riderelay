import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import type { ProviderRecord } from "@/lib/providers";
import { ProviderMark } from "@/components/provider-mark";
import { cn } from "@/lib/utils";

export function ProviderCard({
  provider,
  to,
  action,
}: {
  provider: ProviderRecord;
  to: "/get/$provider" | "/share/$provider";
  action: string;
}) {
  const paused = !provider.programActive;
  return (
    <Link
      to={to}
      params={{ provider: provider.slug }}
      className={cn(
        "group flex items-center gap-4 rounded-xl bg-surface p-4 shadow-card",
        "transition-[transform,box-shadow] duration-150 ease-out",
        "hover:shadow-card-hover active:scale-[0.98]",
        paused && "opacity-70",
      )}
    >
      <ProviderMark slug={provider.slug} iconKey={provider.iconKey} />
      <div className="min-w-0 flex-1">
        <p className="font-semibold tracking-tight">{provider.displayName}</p>
        <p className="truncate text-sm text-muted">
          {paused
            ? (provider.unavailableMessage ?? "Paused right now")
            : (provider.shortHint ?? action)}
        </p>
      </div>
      <ArrowUpRight className="size-4 text-subtle transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </Link>
  );
}
