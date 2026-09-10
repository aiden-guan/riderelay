import { useMemo, useState } from "react";
import type { ProviderRecord } from "@/lib/providers";
import { CATEGORIES, matchesProviderQuery } from "@/lib/catalog";
import { ProviderCard } from "@/components/provider-card";
import { CategoryTabs } from "@/components/catalog-nav";
import { Input } from "@/components/ui/input";

export function ProviderPicker({
  providers,
  to,
  action,
}: {
  providers: ProviderRecord[];
  to: "/get/$provider" | "/share/$provider";
  action: string;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const filtered = useMemo(() => {
    return providers.filter((provider) => {
      if (!matchesProviderQuery(provider, query)) return false;
      if (query.trim()) return true;
      if (category === "all") return true;
      return provider.category === category;
    });
  }, [providers, query, category]);

  const grouped = useMemo(() => {
    const byCategory = new Map<string, ProviderRecord[]>();
    for (const provider of filtered) {
      const key = provider.category || "more";
      const list = byCategory.get(key) ?? [];
      list.push(provider);
      byCategory.set(key, list);
    }
    return CATEGORIES.filter((c) => byCategory.has(c.id)).map((c) => ({
      ...c,
      providers: byCategory.get(c.id) ?? [],
    }));
  }, [filtered]);

  return (
    <div>
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search Uber, DoorDash, Cash App…"
        aria-label="Search services"
      />
      <div className="mt-6">
        <CategoryTabs
          value={category}
          includeAll
          searching={Boolean(query.trim())}
          onChange={setCategory}
        />
      </div>
      <div className="mt-8 space-y-8">
        {grouped.length === 0 ? (
          <p className="text-sm text-muted">No services match that search.</p>
        ) : (
          grouped.map((group) => (
            <section key={group.id}>
              {query.trim() || category === "all" ? (
                <h2 className="mb-3 text-sm font-medium text-muted">{group.label}</h2>
              ) : null}
              <div className="grid gap-3">
                {group.providers.map((provider) => (
                  <ProviderCard
                    key={provider.id}
                    provider={provider}
                    to={to}
                    action={action}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
