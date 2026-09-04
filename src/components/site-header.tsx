import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { SignedIn, SignedOut } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Wordmark } from "@/components/logo";
import { AccountChip } from "@/components/account-chip";
import { cn } from "@/lib/utils";

const links = [
  { to: "/", label: "Board" },
  { to: "/share", label: "List my code" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { user, isPending } = useCurrentUserState();

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-bg/90 pt-[env(safe-area-inset-top)] backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="rounded-md" aria-label="RideRelay home">
          <Wordmark />
        </Link>
        <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-sm font-medium text-muted hover:text-fg"
            >
              {l.label}
            </Link>
          ))}
          {isPending ? (
            <div className="size-8 animate-pulse rounded-full bg-surface-2" />
          ) : user ? (
            <AccountChip />
          ) : (
            <Link
              to="/login"
              search={{ next: "/" }}
              className="text-sm font-medium text-fg underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          )}
        </nav>
        <button
          type="button"
          className="inline-flex size-11 items-center justify-center rounded-lg md:hidden"
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      <div
        className={cn(
          "border-t border-border md:hidden",
          open ? "block" : "hidden",
        )}
      >
        <nav className="mx-auto flex max-w-5xl flex-col gap-1 px-4 py-3" aria-label="Mobile">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="flex h-11 items-center text-sm font-medium"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          <SignedOut>
            <Link
              to="/login"
              search={{ next: "/" }}
              className="flex h-11 items-center text-sm font-medium"
              onClick={() => setOpen(false)}
            >
              Sign in
            </Link>
          </SignedOut>
          <SignedIn>
            <Link
              to="/dashboard"
              className="flex h-11 items-center text-sm font-medium"
              onClick={() => setOpen(false)}
            >
              Dashboard
            </Link>
            <div className="py-2">
              <AccountChip />
            </div>
          </SignedIn>
        </nav>
      </div>
    </header>
  );
}
