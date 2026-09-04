import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { getDashboardFn, updateProfileFn } from "@/lib/server/api";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { errorMessage } from "@/lib/app-error";
import { formatRelative } from "@/lib/utils";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user, isPending } = useCurrentUserState();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [joined, setJoined] = useState<string | null>(null);
  const [level, setLevel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    void getDashboardFn()
      .then((data) => {
        setUsername(data.profile.username);
        setDisplayName(data.profile.displayName ?? "");
        setJoined(data.profile.createdAt);
        setLevel(data.stats.contributorLevel);
        setLoaded(true);
      })
      .catch((err: unknown) => setError(errorMessage(err)));
  }, [user]);

  if (isPending) {
    return (
      <PageShell>
        <Skeleton className="h-10 w-40" />
      </PageShell>
    );
  }
  if (!user) return <Navigate to="/login" search={{ next: "/profile" }} />;

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await updateProfileFn({ data: { username, displayName } });
      toast.success("Saved");
    } catch (err) {
      setError(errorMessage(err, "Could not save."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell>
      <p className="text-sm text-muted">
        <Link to="/dashboard" className="hover:text-fg">
          Dashboard
        </Link>
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Profile</h1>
      <p className="mt-2 text-sm text-muted">
        {level ? `${level} · ` : null}
        {joined ? `Joined ${formatRelative(joined)}` : "A short handle, not a social network."}
      </p>
      {!loaded ? (
        <Skeleton className="mt-8 h-40 w-full" />
      ) : (
        <form className="mt-8 space-y-5" onSubmit={(e) => void save(e)}>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="displayName">Display name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="nickname"
            />
          </div>
          {error ? (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </Button>
        </form>
      )}
    </PageShell>
  );
}
