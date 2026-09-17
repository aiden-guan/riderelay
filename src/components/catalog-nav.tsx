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
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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

  const trackRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());
  const painted = useRef(false);
  const didScroll = useRef(false);
  const [ink, setInk] = useState({ x: 0, w: 0, visible: false, ready: false });

  const measure = useCallback(() => {
    const tab = searching ? undefined : tabRefs.current.get(value);
    if (!tab) {
      setInk((prev) => ({ ...prev, visible: false }));
      return;
    }
    const next = {
      x: tab.offsetLeft + 8,
      w: Math.max(12, tab.offsetWidth - 16),
      visible: true,
    };
    setInk((prev) => ({ ...prev, ...next }));
    if (!painted.current) {
      painted.current = true;
      requestAnimationFrame(() => {
        setInk((prev) => ({ ...prev, ready: true }));
      });
    }
  }, [searching, value]);

  useLayoutEffect(() => {
    measure();
  }, [measure, tabs.length]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(track);
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    void document.fonts?.ready.then(() => {
      if (trackRef.current) measure();
    });
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [measure]);

  useLayoutEffect(() => {
    if (searching) return;
    const tab = tabRefs.current.get(value);
    if (!tab) return;
    tab.scrollIntoView({
      inline: "nearest",
      block: "nearest",
      behavior: didScroll.current ? "smooth" : "auto",
    });
    didScroll.current = true;
  }, [value, searching]);

  return (
    <div className="min-w-0">
      <p className="text-xs font-medium tracking-wide text-subtle uppercase">Category</p>
      <div
        className="scroll-strip mt-2 border-b border-border"
        role="tablist"
        aria-label="Categories"
      >
        <div ref={trackRef} className="relative flex w-max min-h-11">
          {tabs.map((tab) => {
            const Icon = tab.id === "all" ? null : CATEGORY_ICONS[tab.id as CategoryId];
            const active = !searching && value === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                ref={(node) => {
                  if (node) tabRefs.current.set(tab.id, node);
                  else tabRefs.current.delete(tab.id);
                }}
                onClick={() => onChange(tab.id)}
                className={cn(
                  "relative z-10 flex min-h-11 shrink-0 items-center gap-1.5 px-3 text-sm",
                  "touch-manipulation transition-[color] duration-quick ease-out",
                  active ? "font-semibold text-fg" : "font-medium text-muted hover:text-fg",
                )}
              >
                {Icon ? <Icon className="size-4" strokeWidth={1.75} /> : null}
                {tab.label}
              </button>
            );
          })}
          <span
            aria-hidden
            className={cn("tab-ink", ink.ready && "is-ready")}
            style={{
              transform: `translateX(${ink.x}px)`,
              width: ink.w,
              opacity: ink.visible ? 1 : 0,
            }}
          />
        </div>
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
    <div className="mt-5 min-w-0">
      <p className="text-xs font-medium tracking-wide text-subtle uppercase">Company</p>
      <div className="scroll-strip mt-2 gap-3 p-1" role="list" aria-label="Companies">
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
                "relative z-10 flex w-28 shrink-0 flex-col items-start gap-2 rounded-md p-3 text-left",
                "touch-manipulation transition-[box-shadow,transform] duration-quick ease-out",
                "hover:-translate-y-px active:scale-[0.96]",
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
