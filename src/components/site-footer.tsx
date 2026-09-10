import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border pb-[max(5rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="max-w-xl text-xs leading-relaxed text-subtle">
          RideRelay is an independent community tool and is not affiliated with
          the services listed here. Referral availability, amounts, and eligibility
          are determined by each provider.
        </p>
        <nav className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted" aria-label="Legal">
          <Link to="/terms" className="hover:text-fg">
            Terms
          </Link>
          <Link to="/privacy" className="hover:text-fg">
            Privacy
          </Link>
          <Link to="/community-guidelines" className="hover:text-fg">
            Guidelines
          </Link>
        </nav>
      </div>
    </footer>
  );
}
