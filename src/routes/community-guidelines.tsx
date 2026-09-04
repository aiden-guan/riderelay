import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/page-shell";

export const Route = createFileRoute("/community-guidelines")({
  component: Guidelines,
});

function Guidelines() {
  return (
    <PageShell>
      <h1 className="text-3xl font-semibold tracking-tight">Community guidelines</h1>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted">
        <p>Share a code you actually own. One active code per service.</p>
        <p>
          Report honestly. “Didn’t work” is for dead codes, not for a credit you weren’t eligible
          for.
        </p>
        <p>
          Don’t self-refer, don’t farm invites from your own devices, and don’t paste someone
          else’s code as your own.
        </p>
        <p>
          Follow each provider’s own rules. RideRelay is a mailbox, not a workaround.
        </p>
      </div>
    </PageShell>
  );
}
