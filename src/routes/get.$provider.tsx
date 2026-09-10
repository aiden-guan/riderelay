import { createFileRoute, Link } from "@tanstack/react-router";
import { loadActivityFn, loadBoardFn, listProviders } from "@/lib/server/api";
import { LiveBoard } from "@/components/live-board";
import { PageShell } from "@/components/page-shell";

export const Route = createFileRoute("/get/$provider")({
  loader: async ({ params }) => {
    const [board, activity, providers] = await Promise.all([
      loadBoardFn({ data: { slug: params.provider } }),
      loadActivityFn(),
      listProviders(),
    ]);
    return { board, activity, slug: params.provider, providers };
  },
  component: GetProviderPage,
});

function GetProviderPage() {
  const { board, activity, slug, providers } = Route.useLoaderData();
  return (
    <>
      <PageShell>
        <p className="text-sm text-muted">
          <Link to="/" className="hover:text-fg">
            Full board
          </Link>
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Copy a code</h1>
        <p className="mt-2 text-muted">
          Rank is real shares of RideRelay. The ones at the top brought more people here.
        </p>
      </PageShell>
      <LiveBoard initial={board} activity={activity} providers={providers} slug={slug} />
    </>
  );
}