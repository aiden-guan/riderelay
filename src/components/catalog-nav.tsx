import {
  Bike,
  GraduationCap,
  Plane,
  ShoppingBag,
  Smartphone,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ProviderRecord } from "@/lib/providers";
import { CATEGORIES, type CategoryId } from "@/lib/catalog";
import { ProviderMark } from "@/components/provider-mark";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS: Record<CategoryId, LucideIcon> = {
  rides: Bike,
  food: UtensilsCrossed,
  money: Wallet,
  shopping: ShoppingBag,
  travel: Plane,
  campus: GraduationCap,
  phone: Smartphone,
};

export function CategoryTabs({
  value,
  onChange,
  includeAll = false,
  searching = false,
}: {
  value: string;
  onChange: (id: string) => void;
  includeAll?: boolean;
  searching?: boolean;
}) {
  const tabs = includeAll
    ? [{ id: "all", label: "All" }, ...CATEGORIES]
    : [...CATEGORIES];

  return (
    <div>
      <p className="text-xs font-medium tracking-wide text-subtle uppercase">Category</p>
      <div
        className="scroll-strip mt-2 flex gap-1 border-b border-border"
        role="tablist"
        aria-label="Categories"
      >
        {tabs.map((tab) => {
          const Icon = tab.id === "all" ? null : CATEGORY_ICONS[tab.id as CategoryId];
          const active = !searching && value === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(tab.id)}
              className={cn(
                "relative flex min-h-11 shrink-0 items-center gap-1.5 px-3 text-sm",
                active ? "font-semibold text-fg" : "font-medium text-muted hover:text-fg",
              )}
            >
              {Icon ? <Icon className="size-4" strokeWidth={1.75} /> : null}
              {tab.label}
              <span
                className={cn(
                  "absolute inset-x-2 -bottom-px h-0.5 rounded-full",
                  active ? "bg-fg" : "bg-transparent",
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CompanyStrip({
  providers,
  selected,
  counts,
  onSelect,
}: {
  providers: ProviderRecord[];
  selected: string;
  counts: Map<string, number>;
  onSelect: (slug: string) => void;
}) {
  return (
    <div className="mt-5">
      <p className="text-xs font-medium tracking-wide text-subtle uppercase">Company</p>
      <div className="scroll-strip mt-2 flex gap-3 p-1" role="list" aria-label="Companies">
        {providers.map((provider) => {
          const active = selected === provider.slug;
          const count = counts.get(provider.slug) ?? 0;
          return (
            <button
              key={provider.id}
              type="button"
              role="listitem"
              aria-pressed={active}
              onClick={() => onSelect(provider.slug)}
              className={cn(
                "flex w-28 shrink-0 flex-col items-start gap-2 rounded-md p-3 text-left",
                "transition-[box-shadow,transform] duration-150 ease-out",
                "active:scale-[0.98]",
                active ? "bg-surface shadow-selected" : "bg-surface shadow-card hover:shadow-card-hover",
              )}
            >
              <ProviderMark
                slug={provider.slug}
                name={provider.displayName}
                accent={provider.accent}
                accentFg={provider.accentFg}
                className="size-9"
              />
              <span className="w-full truncate text-sm font-semibold tracking-tight">
                {provider.displayName}
              </span>
              <span className="font-mono text-xs text-subtle tabular-nums">
                {count === 1 ? "1 code" : `${count} codes`}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
