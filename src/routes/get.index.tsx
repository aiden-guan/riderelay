import { createFileRoute } from "@tanstack/react-router";
import { listProviders } from "@/lib/server/api";
import { PageShell } from "@/components/page-shell";
import { ProviderCard } from "@/components/provider-card";

export const Route = createFileRoute("/get/")({
  loader: () => listProviders(),
  component: GetPage,
});

function GetPage() {
  const providers = Route.useLoaderData();
  return (
    <PageShell>
      <h1 className="text-3xl font-semibold tracking-tight">Copy a referral</h1>
      <p className="mt-2 text-muted">Pick a board. Rank is how many people that rider actually brought here.</p>
      <div className="mt-8 grid gap-3">
        {providers.map((provider) => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            to="/get/$provider"
            action="Get a code"
          />
        ))}
      </div>
    </PageShell>
  );
}
