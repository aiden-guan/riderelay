import { createFileRoute } from "@tanstack/react-router";
import { listProviders } from "@/lib/server/api";
import { PageShell } from "@/components/page-shell";
import { ProviderPicker } from "@/components/provider-picker";

export const Route = createFileRoute("/share/")({
  loader: () => listProviders(),
  component: ShareIndex,
});

function ShareIndex() {
  const providers = Route.useLoaderData();
  return (
    <PageShell>
      <h1 className="text-3xl font-semibold tracking-tight">List my code</h1>
      <p className="mt-2 text-muted">Listing is free. One code per company. Spend invite points to climb.</p>
      <div className="mt-8">
        <ProviderPicker providers={providers} to="/share/$provider" action="Add your code" />
      </div>
    </PageShell>
  );
}