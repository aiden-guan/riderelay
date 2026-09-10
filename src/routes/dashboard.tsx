import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getDashboardFn, listProviders, markNotificationReadFn, updateReferralFn, allocateBoostFn } from "@/lib/server/api";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { errorMessage } from "@/lib/app-error";
import { track } from "@/lib/client/track";
import { formatPoints } from "@/lib/referrals/share";
import { formatRelative } from "@/lib/utils";
import type { DashboardData, OwnReferral } from "@/lib/referrals/api-types";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { ProviderMark } from "@/components/provider-mark";
import { ShareInvite } from "@/components/share-invite";
import type { ProviderRecord } from "@/lib/providers";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { user, isPending } = useCurrentUserState();
  const [data, setData] = useState<DashboardData | null>(null);
  const [providers, setProviders] = useState<ProviderRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const [dash, list] = await Promise.all([getDashboardFn(), listProviders()]);
      setData(dash);
      setProviders(list);
    } catch (err) {
      setError(errorMessage(err, "Could not load your dashboard."));
    }
  }

  useEffect(() => {
    if (!user) return;
    void load();
    track("dashboard_viewed");
  }, [user]);

  if (isPending) {
    return (
      <PageShell wide>
        <Skeleton className="h-10 w-40" />
        <Skeleton className="mt-6 h-40 w-full" />
      </PageShell>
    );
  }
  if (!user) return <Navigate to="/login" search={{ next: "/dashboard" }} />;

  if (error) {
    return (
      <PageShell>
        <EmptyState
          title="Dashboard didn’t load"
          body={error}
          action={
            <Button type="button" onClick={() => void load()}>
              Retry
            </Button>
          }
        />
      </PageShell>
    );
  }

  if (!data) {
    return (
      <PageShell wide>
        <Skeleton className="h-10 w-40" />
        <Skeleton className="mt-6 h-40 w-full" />
      </PageShell>
    );
  }

  return (
    <PageShell wide>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Your listings</h1>
          <p className="mt-2 text-sm text-muted">
            @{data.profile.username} · {data.stats.contributorLevel}
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="secondary" size="sm">
            <Link to="/profile">Profile</Link>
          </Button>
          {data.profile.role === "admin" ? (
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin">Admin</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <dl className="mt-8 grid grid-cols-3 gap-3">
        <Metric label="Friends" value={data.profile.shareCount} />
        <Metric label="Unspent" value={data.profile.pointsUnspent} />
        <Metric label="On listings" value={data.profile.pointsAllocated} />
      </dl>

      <ShareInvite className="mt-6" key={`${data.profile.shareCount}-${data.profile.pointsUnspent}`} />

      {data.notifications.filter((n) => !n.readAt).length > 0 ? (
        <section className="mt-10 space-y-3">
          <h2 className="text-sm font-medium text-muted">Needs attention</h2>
          {data.notifications
            .filter((n) => !n.readAt)
            .map((n) => (
              <div key={n.id} className="rounded-xl bg-surface p-4 shadow-card">
                <p className="font-medium">{n.title}</p>
                <p className="mt-1 text-sm text-muted">{n.body}</p>
                <div className="mt-3 flex gap-2">
                  {n.referralCodeId ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() =>
                        void updateReferralFn({
                          data: { id: n.referralCodeId as string, action: "confirm" },
                        }).then(() =>
                          markNotificationReadFn({ data: { id: n.id } }).then(load),
                        )
                      }
                    >
                      Still works
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => void markNotificationReadFn({ data: { id: n.id } }).then(load)}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            ))}
        </section>
      ) : null}

      <section className="mt-10">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-muted">Codes</h2>
          <Button asChild size="sm" variant="secondary">
            <Link to="/share">List another</Link>
          </Button>
        </div>
        <div className="mt-3 grid gap-3">
          {data.referrals.length === 0 ? (
            <EmptyState
              title="No codes yet"
              body="List a referral, invite people, then spend points to boost that board."
              action={
                <Button asChild>
                  <Link to="/share">Add a code</Link>
                </Button>
              }
            />
          ) : (
            data.referrals.map((ref) => (
              <ReferralRow
                key={ref.id}
                referral={ref}
                unspent={data.profile.pointsUnspent}
                provider={providers.find((p) => p.slug === ref.providerSlug)}
                onChange={() => void load()}
              />
            ))
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-medium text-muted">Activity</h2>
        {data.activity.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Nothing yet. It’ll show up as people use your codes.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {data.activity.map((item) => (
              <li key={item.id} className="flex items-baseline justify-between gap-4 py-3 text-sm">
                <span>{item.summary}</span>
                <span className="shrink-0 text-subtle tabular-nums">
                  {formatRelative(item.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageShell>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-surface px-4 py-3 shadow-card">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 text-xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function ReferralRow({
  referral,
  provider,
  unspent,
  onChange,
}: {
  referral: OwnReferral;
  provider?: ProviderRecord;
  unspent: number;
  onChange: () => void;
}) {
  const [busy, setBusy] = useState(false);
  async function act(action: "pause" | "resume" | "archive" | "confirm") {
    setBusy(true);
    try {
      await updateReferralFn({ data: { id: referral.id, action } });
      onChange();
    } finally {
      setBusy(false);
    }
  }
  async function move(delta: number) {
    setBusy(true);
    try {
      await allocateBoostFn({ data: { listingId: referral.id, delta } });
      onChange();
    } catch (err) {
      toast.error(errorMessage(err, "Could not move those points."));
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="flex flex-col gap-4 rounded-xl bg-surface p-4 shadow-card sm:flex-row sm:items-center">
      <ProviderMark
        slug={referral.providerSlug}
        name={referral.providerName}
        accent={provider?.accent}
        accentFg={provider?.accentFg}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold">{referral.providerName}</h3>
          <Badge>{referral.status}</Badge>
        </div>
        <p className="mt-1 font-mono text-lg tracking-wide break-all">
          {referral.usesLink ? referral.referralUrl : referral.code}
        </p>
        <p className="mt-1 text-sm font-medium tabular-nums">
          {referral.rank ? `#${referral.rank}` : "unranked"} · {formatPoints(referral.boostPoints)} on this listing
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy || referral.boostPoints < 1}
            onClick={() => void move(-1)}
          >
            −1
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy || unspent < 1}
            onClick={() => void move(1)}
          >
            +1
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy || unspent < 10}
            onClick={() => void move(10)}
          >
            +10
          </Button>
          <span className="text-xs text-subtle">{formatPoints(unspent)} left to spend</span>
        </div>
        <p className="mt-2 text-xs text-subtle">
          {referral.assignmentCount} copies · {referral.successfulReports} worked · Last{" "}
          {formatRelative(referral.lastAssignedAt)}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {referral.status === "quarantined" ? (
          <Button type="button" size="sm" disabled={busy} onClick={() => void act("confirm")}>
            Still works
          </Button>
        ) : null}
        {referral.status === "paused" ? (
          <Button type="button" size="sm" disabled={busy} onClick={() => void act("resume")}>
            Resume
          </Button>
        ) : referral.status === "active" ? (
          <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => void act("pause")}>
            Pause
          </Button>
        ) : null}
        <Button asChild size="sm" variant="ghost">
          <Link to="/share/$provider" params={{ provider: referral.providerSlug }}>
            Replace
          </Link>
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => void act("archive")}>
          Remove
        </Button>
      </div>
    </article>
  );
}
