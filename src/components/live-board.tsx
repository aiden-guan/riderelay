import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { loadActivityFn, loadBoardFn, myListingFn, pinReferralFn } from "@/lib/server/api";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useVisitorId } from "@/lib/client/visitor";
import { readViaToken } from "@/lib/client/via";
import { track } from "@/lib/client/track";
import { formatShares } from "@/lib/referrals/share";
import { listingCopy } from "@/lib/referrals/board";
import { formatRelative } from "@/lib/utils";
import type { BoardListing, BoardSnapshot, OwnReferral, ShareActivity } from "@/lib/referrals/api-types";
import type { ProviderRecord } from "@/lib/providers";
import { CATEGORIES, matchesProviderQuery } from "@/lib/catalog";
import { copyToClipboard } from "@/lib/client/clipboard";
import { toast } from "sonner";
import { CopyButton } from "@/components/copy-button";
import { ProviderMark } from "@/components/provider-mark";
import { CategoryTabs, CompanyStrip } from "@/components/catalog-nav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function LiveBoard({
  initial,
  activity: initialActivity,
  providers,
  slug,
}: {
  initial: BoardSnapshot;
  activity: ShareActivity[];
  providers: ProviderRecord[];
  slug?: string;
}) {
  const [board, setBoard] = useState(initial);
  const [activity, setActivity] = useState(initialActivity);
  const [query, setQuery] = useState("");
  const start = providers.find((p) => p.slug === slug) ?? providers[0];
  const [category, setCategory] = useState<string>(start?.category ?? "rides");
  const [filter, setFilter] = useState<string>(start?.slug ?? "lime");
  const { user } = useCurrentUserState();
  const visitorId = useVisitorId();
  const [mine, setMine] = useState<OwnReferral | null>(null);

  const catalog = useMemo(() => {
    const q = query.trim();
    return providers.filter((provider) => {
      if (!matchesProviderQuery(provider, q)) return false;
      if (q) return true;
      return provider.category === category;
    });
  }, [providers, query, category]);

  useEffect(() => {
    if (catalog.some((p) => p.slug === filter)) return;
    const next = catalog[0]?.slug;
    if (next) setFilter(next);
  }, [catalog, filter]);

  const active = providers.find((p) => p.slug === filter);
  const listings = useMemo(
    () => board.listings.filter((row) => row.providerSlug === filter),
    [board.listings, filter],
  );
  const first = listings[0];
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of board.listings) {
      map.set(row.providerSlug, (map.get(row.providerSlug) ?? 0) + 1);
    }
    return map;
  }, [board.listings]);

  async function refresh() {
    const [next, feed] = await Promise.all([loadBoardFn({ data: {} }), loadActivityFn()]);
    setBoard(next);
    setActivity(feed);
  }

  useEffect(() => {
    track("board_viewed", { provider: filter });
  }, [filter]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void refresh().catch(() => undefined);
    }, 8000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!user) {
      setMine(null);
      return;
    }
    void myListingFn({ data: { slug: filter } })
      .then(setMine)
      .catch(() => setMine(null));
  }, [user, filter, board.listingCount]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-4 pb-8 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <CategoryTabs
            value={category}
            searching={Boolean(query.trim())}
            onChange={(id) => {
              setQuery("");
              setCategory(id);
              const firstIn = providers.find((p) => p.category === id);
              if (firstIn) setFilter(firstIn.slug);
            }}
          />
        </div>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a company"
          aria-label="Search services"
          className="sm:max-w-64"
        />
      </div>
      {catalog.length === 0 ? (
        <p className="mt-6 text-sm text-muted">No companies match that search.</p>
      ) : (
        <CompanyStrip
          providers={catalog}
          selected={filter}
          counts={counts}
          onSelect={(slug) => {
            const provider = providers.find((p) => p.slug === slug);
            setFilter(slug);
            if (provider) setCategory(provider.category);
          }}
        />
      )}

      <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-wide text-subtle uppercase">
            {active ? `${CATEGORIES.find((c) => c.id === active.category)?.label ?? "Board"} · ${active.displayName}` : "Board"}
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">
            {active?.displayName ?? "Board"}
          </h2>
        </div>
        <p className="font-mono text-xs text-subtle">
          {listings.length === 0
            ? "Empty — list a code to stand first."
            : `${listings.length} on the board · #1 has ${formatShares(first?.shareCount ?? 0)}`}
        </p>
      </div>

      {first ? (
        <div className="mt-4 flex flex-col gap-3 rounded-xl bg-surface p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted uppercase">
              {first.providerName} #1
            </p>
            <button
              type="button"
              className="mt-1 font-mono text-2xl font-medium tracking-wide hover:underline"
              onClick={() => {
                const copy = listingCopy(first);
                void copyToClipboard(copy.value).then((ok) => {
                  if (ok) toast.success(copy.toast);
                  if (visitorId) {
                    void pinReferralFn({
                      data: {
                        listingId: first.id,
                        visitorId,
                        viaToken: readViaToken() ?? undefined,
                      },
                    }).catch(() => undefined);
                  }
                });
              }}
            >
              {first.code}
            </button>
            <p className="mt-1 text-sm text-muted">{formatShares(first.shareCount)}</p>
            {first.featured ? (
              <p className="mt-1 text-xs text-subtle">Using this invite tips the creator.</p>
            ) : null}
          </div>
          <CopyButton
            value={listingCopy(first).value}
            label={listingCopy(first).label}
            successMessage={listingCopy(first).toast}
            onCopied={() => {
              if (!visitorId) return;
              void pinReferralFn({
                data: {
                  listingId: first.id,
                  visitorId,
                  viaToken: readViaToken() ?? undefined,
                },
              }).catch(() => undefined);
            }}
          />
        </div>
      ) : null}

      <ol className="mt-6 divide-y divide-border">
        {listings.length === 0 ? (
          <li className="py-12 text-sm text-muted">
            Nobody’s on this board yet.{" "}
            <Link to="/share/$provider" params={{ provider: filter }} className="underline">
              List a code — it’s free
            </Link>
            .
          </li>
        ) : (
          listings.map((row) => (
            <BoardRow
              key={row.id}
              row={row}
              mineId={mine?.id}
              visitorId={visitorId}
              provider={active}
            />
          ))
        )}
      </ol>

      <ActivityFeed items={activity} />
    </div>
  );
}

function BoardRow({
  row,
  mineId,
  visitorId,
  provider,
}: {
  row: BoardListing;
  mineId?: string;
  visitorId: string | null;
  provider?: ProviderRecord;
}) {
  async function pin() {
    if (!visitorId) return null;
    return pinReferralFn({
      data: {
        listingId: row.id,
        visitorId,
        viaToken: readViaToken() ?? undefined,
      },
    });
  }

  async function copyCode() {
    const copy = listingCopy(row);
    const ok = await copyToClipboard(copy.value);
    void pin().catch(() => undefined);
    if (ok) toast.success(copy.toast);
  }

  return (
    <li className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 py-5 sm:grid-cols-[4rem_1fr_auto] sm:items-center">
      <p
        className={cn(
          "font-mono text-3xl font-medium tabular-nums",
          row.rank === 1 ? "text-fg" : "text-subtle",
        )}
      >
        {row.rank}
      </p>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <ProviderMark
            slug={row.providerSlug}
            name={row.providerName}
            accent={provider?.accent}
            accentFg={provider?.accentFg}
            className="size-8 text-xs"
          />
          <button
            type="button"
            className="font-mono text-xl font-medium tracking-wide hover:underline"
            onClick={() => void copyCode()}
          >
            {row.code}
          </button>
          {mineId === row.id ? <Badge>yours</Badge> : null}
          {row.featured ? <Badge>Creator</Badge> : null}
        </div>
        <p className="mt-2 text-sm text-muted">
          {formatShares(row.shareCount)}
          {row.username && !row.featured ? ` · @${row.username}` : ""}
          {row.worked ? ` · ${row.worked} worked` : ""}
        </p>
        <p className="mt-1 text-xs text-subtle">
          {row.featured
            ? "A way to tip the creator."
            : (row.shortHint ?? `Redeem in the ${row.providerName} app.`)}
        </p>
      </div>
      <div className="col-span-2 flex flex-col gap-2 sm:col-span-1 sm:items-end">
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <CopyButton
            value={listingCopy(row).value}
            label={listingCopy(row).label}
            successMessage={listingCopy(row).toast}
            className="w-full sm:w-auto"
            onCopied={() => void pin().catch(() => undefined)}
          />
          <Button
            type="button"
            variant="secondary"
            className="w-full sm:w-auto"
            onClick={() => {
              void pin()
                .then((assigned) => {
                  if (assigned) window.open(`/go/${assigned.assignmentId}`, "_blank", "noopener,noreferrer");
                })
                .catch(() => undefined);
            }}
          >
            Open {row.providerName}
          </Button>
        </div>
        {mineId === row.id ? <p className="text-xs text-subtle">You’re #{row.rank}</p> : null}
      </div>
    </li>
  );
}

function ActivityFeed({ items }: { items: ShareActivity[] }) {
  if (items.length === 0) return null;
  return (
    <section className="mt-16">
      <h2 className="text-sm font-medium text-muted">Latest shares</h2>
      <ul className="mt-3 divide-y divide-border">
        {items.map((item) => (
          <li key={item.id} className="flex items-baseline justify-between gap-4 py-3 text-sm">
            <span>
              Someone arrived through {item.username ? `@${item.username}` : "a member"}
            </span>
            <span className="shrink-0 font-mono text-xs text-subtle tabular-nums">
              {formatRelative(item.createdAt)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
