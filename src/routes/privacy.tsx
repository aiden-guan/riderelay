import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/page-shell";

export const Route = createFileRoute("/privacy")({
  component: Privacy,
});

function Privacy() {
  return (
    <PageShell>
      <h1 className="text-3xl font-semibold tracking-tight">Privacy</h1>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted">
        <p>
          We store the account you sign in with, the referral codes you submit, and the events needed
          to rotate fairly — assignments, copies, opens, and outcome reports.
        </p>
        <p>
          Guest visitors get an anonymous id in this browser so we don’t keep handing out the same
          code. Product analytics stay on our servers. We don’t sell this data.
        </p>
        <p>
          Signed-in usernames may appear next to a code as “from @you”. You can change your handle
          on the profile page.
        </p>
      </div>
    </PageShell>
  );
}
