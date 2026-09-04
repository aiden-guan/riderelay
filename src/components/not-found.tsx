import { Link } from "@tanstack/react-router";

export function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-medium text-muted">404</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">This page took a wrong turn</h1>
      <p className="mt-3 text-muted">The link might be old, or the ride never existed.</p>
      <Link
        to="/"
        className="mt-8 inline-flex h-11 items-center rounded-lg bg-fg px-4 text-sm font-medium text-bg"
      >
        Back home
      </Link>
    </main>
  );
}
