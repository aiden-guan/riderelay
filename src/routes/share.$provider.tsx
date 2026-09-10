import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { listProviders, submitReferralFn } from "@/lib/server/api";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { errorMessage } from "@/lib/app-error";
import { track } from "@/lib/client/track";
import { formatPoints } from "@/lib/referrals/share";
import { extractReferralUrl } from "@/lib/referrals/validate";
import type { OwnReferral } from "@/lib/referrals/api-types";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShareInvite } from "@/components/share-invite";

export const Route = createFileRoute("/share/$provider")({
  loader: () => listProviders(),
  component: ShareProviderPage,
});

function ShareProviderPage() {
  const { provider: slug } = Route.useParams();
  const providers = Route.useLoaderData();
  const provider = providers.find((p) => p.slug === slug);
  const { user, isPending } = useCurrentUserState();
  const [code, setCode] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<OwnReferral | null>(null);

  useEffect(() => {
    if (provider) track("provider_selected", { provider: provider.slug, surface: "share" });
  }, [provider]);

  if (isPending) {
    return (
      <PageShell>
        <div className="h-10 w-48 animate-pulse rounded-lg bg-surface-2" />
      </PageShell>
    );
  }
  if (!user) {
    return <Navigate to="/login" search={{ next: `/share/${slug}` }} />;
  }
  if (!provider) {
    return (
      <PageShell>
        <h1 className="text-3xl font-semibold">Unknown service</h1>
        <Link to="/share" className="mt-4 inline-block text-sm text-muted hover:text-fg">
          See available services
        </Link>
      </PageShell>
    );
  }
  if (!provider.programActive) {
    return (
      <PageShell>
        <h1 className="text-3xl font-semibold">{provider.displayName} is paused</h1>
        <p className="mt-2 text-muted">
          {provider.unavailableMessage ?? "This program isn’t taking new codes right now."}
        </p>
      </PageShell>
    );
  }

  if (saved) {
    return (
      <PageShell>
        <p className="text-sm font-medium text-muted">You’re on the board.</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{provider.displayName}</h1>
        <div className="mt-8 rounded-xl bg-surface p-5 shadow-card">
          <p className="font-mono text-2xl tracking-wide break-all">
            {saved.usesLink ? saved.referralUrl : saved.code}
          </p>
          <dl className="mt-6 grid grid-cols-3 gap-3 text-sm">
            <Stat label="Rank" value={saved.rank ? `#${saved.rank}` : "—"} />
            <Stat label="Boost" value={formatPoints(saved.boostPoints)} />
            <Stat label="Copies" value={String(saved.assignmentCount)} />
          </dl>
          <p className="mt-4 text-sm text-muted">
            Invite people to RideRelay for 10 points each, then put points on this listing to climb.
          </p>
        </div>
        <ShareInvite className="mt-6" />
        <Button asChild variant="ghost" className="mt-4">
          <Link to="/">See the board</Link>
        </Button>
      </PageShell>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const next = await submitReferralFn({
        data: { slug, code, referralUrl: url },
      });
      setSaved(next);
    } catch (err) {
      setError(errorMessage(err, "Could not add that code."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell>
      <p className="text-sm text-muted">
        <Link to="/share" className="hover:text-fg">
          All services
        </Link>
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">
        List your {provider.displayName} {provider.entryMode === "link" ? "invite" : "code"}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">{provider.referralInstructions}</p>
      <form className="mt-8 space-y-5" onSubmit={(e) => void onSubmit(e)}>
        {provider.entryMode === "code" ? (
          <div className="space-y-2">
            <Label htmlFor="code">Referral code</Label>
            <Input
              id="code"
              name="code"
              autoComplete="off"
              spellCheck={false}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={provider.codeFormatHint ?? "Your code from the app"}
              required
            />
          </div>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="url">{provider.entryMode === "link" ? "Referral link" : "Referral link (optional)"}</Label>
          <Input
            id="url"
            name="url"
            type={provider.entryMode === "link" ? "text" : "url"}
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            value={url}
            onChange={(e) => {
              const next = e.target.value;
              setUrl(extractReferralUrl(next, provider.allowedHosts) ?? next);
            }}
            onPaste={(e) => {
              const text = e.clipboardData.getData("text");
              const extracted = extractReferralUrl(text, provider.allowedHosts);
              if (!extracted) return;
              e.preventDefault();
              setUrl(extracted);
            }}
            placeholder={
              provider.entryMode === "link"
                ? provider.allowedHosts[0]
                  ? `https://${provider.allowedHosts[0]}/…`
                  : "https://"
                : provider.allowedHosts[0]
                  ? `https://${provider.allowedHosts[0]}/…`
                  : "https://"
            }
            required={provider.entryMode === "link"}
          />
          <p className="text-xs text-subtle">
            {provider.entryMode === "link"
              ? `Paste the invite from ${provider.displayName}. Extra wording is stripped automatically.`
              : `Official ${provider.displayName} link if you have one — otherwise the code is enough.`}
          </p>
        </div>
        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={busy} className="w-full sm:w-auto">
          {busy ? "Listing…" : provider.entryMode === "link" ? "List my invite" : "List my code"}
        </Button>
      </form>
    </PageShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-subtle">{label}</dt>
      <dd className="mt-1 font-medium tabular-nums">{value}</dd>
    </div>
  );
}
