import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  adminAddProviderFn,
  adminCodesFn,
  adminReportsFn,
  adminSetCodeStatusFn,
  adminSetProviderFn,
  getMeAdminFn,
  listAllProviders,
} from "@/lib/server/api";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { errorMessage } from "@/lib/app-error";
import { formatRelative } from "@/lib/utils";
import type { AdminCodeRow, AdminReportRow } from "@/lib/referrals/api-types";
import type { ProviderRecord } from "@/lib/providers";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

function AdminPage() {
  const { user, isPending } = useCurrentUserState();
  const [role, setRole] = useState<string | null>(null);
  const [codes, setCodes] = useState<AdminCodeRow[]>([]);
  const [reports, setReports] = useState<AdminReportRow[]>([]);
  const [providers, setProviders] = useState<ProviderRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const me = await getMeAdminFn();
      setRole(me.role);
      if (me.role !== "admin") return;
      const [c, r, p] = await Promise.all([
        adminCodesFn(),
        adminReportsFn(),
        listAllProviders(),
      ]);
      setCodes(c);
      setReports(r);
      setProviders(p);
    } catch (err) {
      setError(errorMessage(err, "Admin data unavailable."));
    }
  }

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user]);

  if (isPending) {
    return (
      <PageShell wide>
        <Skeleton className="h-10 w-32" />
      </PageShell>
    );
  }
  if (!user) return <Navigate to="/login" search={{ next: "/admin" }} />;
  if (error) {
    return (
      <PageShell>
        <h1 className="text-3xl font-semibold">Admin</h1>
        <p className="mt-3 text-sm text-danger">{error}</p>
      </PageShell>
    );
  }
  if (role && role !== "admin") {
    return (
      <PageShell>
        <h1 className="text-3xl font-semibold">Admin</h1>
        <p className="mt-3 text-muted">You don’t have access.</p>
      </PageShell>
    );
  }
  if (!role) {
    return (
      <PageShell wide>
        <Skeleton className="h-40 w-full" />
      </PageShell>
    );
  }

  return (
    <PageShell wide>
      <h1 className="text-3xl font-semibold tracking-tight">Admin</h1>
      <p className="mt-2 text-sm text-muted">Internal tools. Keep this quiet.</p>

      <section className="mt-10">
        <h2 className="text-sm font-medium text-muted">Providers</h2>
        <ul className="mt-3 space-y-2">
          {providers.map((p) => (
            <li
              key={p.id}
              className="flex flex-col gap-3 rounded-xl bg-surface p-4 shadow-card sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">
                  {p.displayName} <span className="text-subtle">/{p.slug}</span>
                </p>
                <p className="text-xs text-muted">
                  {p.enabled ? "enabled" : "disabled"} · {p.programActive ? "program on" : "program off"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    void adminSetProviderFn({
                      data: {
                        providerId: p.id,
                        enabled: !p.enabled,
                        programActive: p.programActive,
                      },
                    }).then(load)
                  }
                >
                  {p.enabled ? "Disable" : "Enable"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    void adminSetProviderFn({
                      data: {
                        providerId: p.id,
                        enabled: p.enabled,
                        programActive: !p.programActive,
                      },
                    }).then(load)
                  }
                >
                  {p.programActive ? "Pause program" : "Activate program"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
        <AddProvider onAdded={() => void load()} />
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-medium text-muted">Codes</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs text-subtle">
              <tr>
                <th className="py-2 font-medium">Provider</th>
                <th className="py-2 font-medium">Code</th>
                <th className="py-2 font-medium">Owner</th>
                <th className="py-2 font-medium">Status</th>
                <th className="py-2 font-medium">Shown</th>
                <th className="py-2 font-medium">S/F</th>
                <th className="py-2 font-medium"> </th>
              </tr>
            </thead>
            <tbody>
              {codes.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="py-3">{row.providerName}</td>
                  <td className="py-3 font-mono">{row.code}</td>
                  <td className="py-3">{row.username ? `@${row.username}` : "—"}</td>
                  <td className="py-3">
                    <Badge>{row.status}</Badge>
                  </td>
                  <td className="py-3 tabular-nums">{row.assignmentCount}</td>
                  <td className="py-3 tabular-nums">
                    {row.successfulReports}/{row.failedReports}
                  </td>
                  <td className="py-3">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        void adminSetCodeStatusFn({
                          data: {
                            id: row.id,
                            status: row.status === "quarantined" ? "active" : "quarantined",
                          },
                        }).then(load)
                      }
                    >
                      {row.status === "quarantined" ? "Reactivate" : "Quarantine"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-medium text-muted">Reports</h2>
        <ul className="mt-3 divide-y divide-border">
          {reports.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-baseline justify-between gap-2 py-3 text-sm"
            >
              <span>
                {row.outcome === "worked" ? "Worked" : "Didn’t work"} · {row.providerName} · {row.code}
                {row.username ? ` · @${row.username}` : ""}
              </span>
              <span className="text-subtle tabular-nums">{formatRelative(row.createdAt)}</span>
            </li>
          ))}
          {reports.length === 0 ? (
            <li className="py-3 text-sm text-muted">No reports yet.</li>
          ) : null}
        </ul>
      </section>
    </PageShell>
  );
}

function AddProvider({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [hosts, setHosts] = useState("");
  const [instructions, setInstructions] = useState("");
  const [signupUrl, setSignupUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await adminAddProviderFn({
        data: { slug, displayName, allowedHosts: hosts, instructions, signupUrl },
      });
      setOpen(false);
      setSlug("");
      setDisplayName("");
      setHosts("");
      onAdded();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button type="button" variant="ghost" size="sm" className="mt-4" onClick={() => setOpen(true)}>
        Add a provider
      </Button>
    );
  }

  return (
    <form
      className="mt-4 space-y-3 rounded-xl bg-surface p-4 shadow-card"
      onSubmit={(e) => void submit(e)}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="bird" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="dn">Name</Label>
          <Input
            id="dn"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Bird"
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="hosts">Allowed hosts</Label>
        <Input
          id="hosts"
          value={hosts}
          onChange={(e) => setHosts(e.target.value)}
          placeholder="www.bird.co, bird.app.link"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="ins">Instructions</Label>
        <Input id="ins" value={instructions} onChange={(e) => setInstructions(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="su">Signup URL</Label>
        <Input id="su" value={signupUrl} onChange={(e) => setSignupUrl(e.target.value)} />
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={busy}>
          Save provider
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
