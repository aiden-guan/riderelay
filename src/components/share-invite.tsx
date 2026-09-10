import { useEffect, useRef, useState } from "react";
import { getDashboardFn } from "@/lib/server/api";
import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/lib/client/clipboard";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatPoints, formatShares, POINTS_PER_REFERRAL } from "@/lib/referrals/share";

const COPY = "Need a referral credit? Copy a community code on RideRelay.";

export function ShareInvite({ className }: { className?: string }) {
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [shares, setShares] = useState(0);
  const [unspent, setUnspent] = useState(0);
  const [copied, setCopied] = useState(false);
  const field = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void getDashboardFn()
      .then((dash) => {
        setToken(dash.profile.inviteToken);
        setShares(dash.profile.shareCount);
        setUnspent(dash.profile.pointsUnspent);
      })
      .catch(() => undefined);
  }, []);

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const url = token ? `${origin}/i/${token}` : "";

  async function copyLink() {
    if (!url) return;
    setBusy(true);
    const ok = await copyToClipboard(`${COPY} ${url}`);
    setBusy(false);
    if (ok) {
      setCopied(true);
      toast.success("Invite link copied");
      window.setTimeout(() => setCopied(false), 1800);
      return;
    }
    field.current?.focus();
    field.current?.select();
    toast.message("Select the link, then copy");
  }

  return (
    <div className={cn("rounded-xl bg-surface p-5 shadow-card", className)}>
      <h2 className="font-semibold tracking-tight">Invite friends</h2>
      <p className="mt-2 text-sm text-muted">
        Each person who actually arrives gives you {POINTS_PER_REFERRAL} points to put on a
        listing. Your own clicks don’t count.
      </p>
      <p className="mt-2 font-mono text-xs text-subtle">
        {formatShares(shares)} · {formatPoints(unspent)} unspent
      </p>
      {url ? (
        <input
          ref={field}
          readOnly
          value={url}
          aria-label="Invite link"
          className="mt-3 h-11 w-full rounded-lg bg-surface-2 px-3 font-mono text-xs"
          onFocus={(e) => e.currentTarget.select()}
        />
      ) : null}
      <Button type="button" variant="secondary" className="mt-4" onClick={() => void copyLink()} disabled={busy || !url}>
        {copied ? "Copied" : busy ? "Copying…" : "Copy invite link"}
      </Button>
    </div>
  );
}
