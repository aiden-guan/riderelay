import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { track } from "@/lib/client/track";
import { safeNextPath } from "@/lib/safe-next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageShell } from "@/components/page-shell";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    next: safeNextPath(search.next, "/"),
  }),
  component: Login,
});

function Login() {
  const { next } = Route.useSearch();
  const { user, isPending } = useCurrentUserState();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!isPending && user) {
    if (typeof window !== "undefined") {
      window.location.replace(next);
    }
    return (
      <PageShell>
        <p className="text-muted">Taking you there…</p>
      </PageShell>
    );
  }

  async function onEmail(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    track("signup_started", { method: "email" });
    try {
      if (mode === "up") {
        const { error: err } = await authClient.signUp.email({
          email,
          password,
          name: name.trim() || email.split("@")[0] || "Rider",
        });
        if (err) throw new Error(err.message ?? "Could not create account.");
      } else {
        const { error: err } = await authClient.signIn.email({ email, password });
        if (err) throw new Error(err.message ?? "Could not sign in.");
      }
      track("signup_completed", { method: "email" });
      window.location.assign(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell>
      <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-2 text-muted">Needed to list a code and invite riders. Copying a referral stays open.</p>

      {!authEnabled ? (
        <p className="mt-8 text-sm text-muted">Sign-in is disabled.</p>
      ) : (
        <div className="mt-8 space-y-3">
          {GROK_PROVIDERS.map((p) => (
            <Button
              key={p.providerId}
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => {
                track("signup_started", { method: p.providerId });
                void signIn(p.providerId, { callbackURL: next, errorCallbackURL: "/login" });
              }}
            >
              Continue with {p.label}
            </Button>
          ))}
        </div>
      )}

      {authEnabled ? (
        <form className="mt-10 space-y-4" onSubmit={(e) => void onEmail(e)}>
          <p className="text-sm font-medium text-muted">Email</p>
          {mode === "up" ? (
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "up" ? "new-password" : "current-password"}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error ? (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Please wait…" : mode === "up" ? "Create account" : "Sign in with email"}
          </Button>
          <button
            type="button"
            className="text-sm text-muted underline-offset-4 hover:text-fg hover:underline"
            onClick={() => setMode(mode === "up" ? "in" : "up")}
          >
            {mode === "up" ? "Have an account? Sign in" : "New here? Create an account"}
          </button>
        </form>
      ) : null}

      <p className="mt-10 text-xs text-subtle">
        By continuing you agree to the{" "}
        <Link to="/terms" className="underline underline-offset-2">
          terms
        </Link>{" "}
        and{" "}
        <Link to="/privacy" className="underline underline-offset-2">
          privacy
        </Link>{" "}
        notes.
      </p>
    </PageShell>
  );
}
