import { createFileRoute } from "@tanstack/react-router";
import { listProviders } from "@/lib/server/api";
import { PageShell } from "@/components/page-shell";
import { ProviderCard } from "@/components/provider-card";

export const Route = createFileRoute("/share/")({
  loader: () => listProviders(),
  component: ShareIndex,
});

function ShareIndex() {
  const providers = Route.useLoaderData();
  return (
    <PageShell>
      <h1 className="text-3xl font-semibold tracking-tight">List my code</h1>
      <p className="mt-2 text-muted">Listing is free. Climb the board by inviting real riders.</p>
      <div className="mt-8 grid gap-3">
        {providers.map((provider) => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            to="/share/$provider"
            action="Add your code"
          />
        ))}
      </div>
    </PageShell>
  );
}
