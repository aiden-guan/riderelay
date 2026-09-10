import { createFileRoute, Link } from "@tanstack/react-router";
import { loadActivityFn, loadBoardFn, listProviders } from "@/lib/server/api";
import { formatListings, formatPoints } from "@/lib/referrals/share";
import { LiveBoard } from "@/components/live-board";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/client/track";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  loader: async () => {
    const [board, activity, providers] = await Promise.all([
      loadBoardFn({ data: {} }),
      loadActivityFn(),
      listProviders(),
    ]);
    return { board, activity, providers };
  },
  component: Home,
});

function Home() {
  const { board, activity, providers } = Route.useLoaderData();
  const top = board.listings[0];

  useEffect(() => {
    track("landing_viewed");
  }, []);

  return (
    <main className="flex-1">
      <section className="mx-auto max-w-5xl px-4 pt-6 pb-2 sm:px-6 sm:pt-10">
        <p className="text-sm font-medium text-muted">Live referral board</p>
        <h1 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
          Rank is the boost.
        </h1>
        <p className="mt-3 max-w-lg text-base leading-relaxed text-muted">
          List any invite for free. Bring people to RideRelay for 10 points each,
          then put those points on a listing to climb that board.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link to="/share">List my code</Link>
          </Button>
          <p className="self-center text-sm text-subtle">
            {board.listingCount === 0
              ? "Be first on the board."
              : `${formatListings(board.listingCount)}${top ? ` · #1 has ${formatPoints(top.boostPoints)}` : ""}`}
          </p>
        </div>
      </section>
      <LiveBoard initial={board} activity={activity} providers={providers} slug={providers[0]?.slug} />
    </main>
  );
}