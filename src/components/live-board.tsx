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
import { copyToClipboard } from "@/lib/client/clipboard";
import { toast } from "sonner";
import { CopyButton } from "@/components/copy-button";
import { ProviderMark } from "@/components/provider-mark";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function LiveBoard({
  initial,
  activity: initialActivity,
  slug,
}: {
  initial: BoardSnapshot;
  activity: ShareActivity[];
  slug?: string;
}) {
  const [board, setBoard] = useState(initial);
  const [activity, setActivity] = useState(initialActivity);
  const [filter, setFilter] = useState<string>(slug ?? "lime");
  const { user } = useCurrentUserState();
  const visitorId = useVisitorId();
  const [mine, setMine] = useState<OwnReferral | null>(null);

  const listings = useMemo(
    () => board.listings.filter((row) => row.providerSlug === filter),
    [board.listings, filter],
  );
  const first = listings[0];
  const providers = useMemo(() => {
    const seen = new Map<string, string>();
    for (const row of board.listings) seen.set(row.providerSlug, row.providerName);
    if (!seen.has("lime")) seen.set("lime", "Lime");
    if (!seen.has("veo")) seen.set("veo", "Veo");
    return [...seen.entries()];
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
    <div className="mx-auto w-full max-w-5xl px-4 pb-8 sm:px-6">
      <div className="flex flex-wrap gap-2 pt-2">
        {providers.map(([key, name]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={cn(
              "h-11 rounded-lg px-4 text-sm font-medium",
              filter === key ? "bg-fg text-bg" : "bg-surface text-fg shadow-card",
            )}
          >
            {name}
          </button>
        ))}
      </div>

      <p className="mt-6 font-mono text-xs text-subtle">
        {listings.length === 0
          ? "Empty board — list a code to stand first."
          : `${listings.length} on the board · #1 has ${formatShares(first?.shareCount ?? 0)}`}
      </p>

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
            <BoardRow key={row.id} row={row} mineId={mine?.id} visitorId={visitorId} />
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
}: {
  row: BoardListing;
  mineId?: string;
  visitorId: string | null;
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
          <ProviderMark slug={row.providerSlug} iconKey={row.iconKey} className="size-8" />
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
              Someone arrived through {item.username ? `@${item.username}` : "a rider"}
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
