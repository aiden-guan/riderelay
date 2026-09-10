import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/page-shell";

export const Route = createFileRoute("/terms")({
  component: Terms,
});

function Terms() {
  return (
    <PageShell>
      <h1 className="text-3xl font-semibold tracking-tight">Terms</h1>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted">
        <p>
          RideRelay is a community bulletin for sharing publicly available referral codes. We are not
          affiliated with Uber, Lime, DoorDash, or any other company whose codes appear here.
        </p>
        <p>
          Referral credits, eligibility, and expiration are set by each provider. RideRelay does not
          promise that a code will work, or that you will earn anything by sharing one.
        </p>
        <p>
          Don’t submit codes you don’t own. Listing a code is free. Rank is the number of people who
          actually use your RideRelay invite — not clicks you make yourself. Don’t scrape, spam, or
          farm shares. We may remove codes, pause services, or close accounts that abuse the pool.
        </p>
        <p>The service is provided as-is. If it breaks, we’ll try to fix it.</p>
      </div>
    </PageShell>
  );
}
