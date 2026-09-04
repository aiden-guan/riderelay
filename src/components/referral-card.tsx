import { ExternalLink } from "lucide-react";
import type { AssignedReferral } from "@/lib/referrals/api-types";
import { CopyButton } from "@/components/copy-button";
import { ProviderName } from "@/components/provider-mark";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function ReferralCard({
  referral,
  onCopied,
}: {
  referral: AssignedReferral;
  onCopied?: () => void;
}) {
  const openHref = `/go/${referral.assignmentId}`;
  return (
    <article className="rounded-xl bg-surface p-5 shadow-card sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <ProviderName slug={referral.provider.slug} name={referral.provider.displayName} />
        {referral.sharerUsername ? (
          <Badge>from @{referral.sharerUsername}</Badge>
        ) : (
          <Badge>community</Badge>
        )}
      </div>
      <p className="mt-6 text-sm text-muted">Your referral</p>
      <p className="reveal-code mt-1 font-mono text-3xl font-medium tracking-wide text-fg sm:text-4xl">
        {referral.code}
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <CopyButton value={referral.code} onCopied={onCopied} className="w-full sm:flex-1" />
        <Button asChild variant="primary" className="w-full sm:flex-1">
          <a href={openHref} target="_blank" rel="noopener noreferrer">
            Open {referral.provider.displayName}
            <ExternalLink className="size-4" />
          </a>
        </Button>
      </div>
      <p className="mt-5 text-sm leading-relaxed text-muted">
        {referral.provider.shortHint ??
          `Redeem in the ${referral.provider.displayName} app. Credits and eligibility come from the provider, not RideRelay.`}
      </p>
      {referral.provider.newUsersOnly ? (
        <p className="mt-2 text-xs text-subtle">Usually for new riders.</p>
      ) : null}
    </article>
  );
}
