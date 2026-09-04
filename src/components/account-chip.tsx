import { Link } from "@tanstack/react-router";
import { useState, useSyncExternalStore } from "react";
import { authEnabled, signOut } from "@/lib/auth/client";
import { hasGateSessionMarker } from "@/lib/auth/gate-session-marker";
import { useCurrentUser } from "@/lib/auth/use-current-user";

const subscribeToNothing = () => () => {};
const noGateOnServer = () => false;

export function AccountChip() {
  const user = useCurrentUser();
  const [signingOut, setSigningOut] = useState(false);
  const gateSession = useSyncExternalStore(
    subscribeToNothing,
    hasGateSessionMarker,
    noGateOnServer,
  );
  if (!user) return null;
  const label = user.displayName ?? user.primaryEmail ?? "Account";
  const initial = label.charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-2">
      <Link
        to="/dashboard"
        className="flex items-center gap-2 rounded-full py-1 pr-2 pl-1 hover:bg-fg/5"
      >
        {user.profileImageUrl ? (
          <img
            src={user.profileImageUrl}
            alt=""
            className="size-8 rounded-full object-cover outline outline-1 -outline-offset-1 outline-fg/10"
          />
        ) : (
          <span className="grid size-8 place-items-center rounded-full bg-surface-2 text-xs font-semibold">
            {initial}
          </span>
        )}
        <span className="max-w-28 truncate text-sm font-medium">{label}</span>
      </Link>
      {authEnabled && !gateSession && (
        <button
          type="button"
          disabled={signingOut}
          className="text-sm text-muted underline-offset-4 hover:text-fg hover:underline disabled:cursor-wait"
          onClick={() => {
            setSigningOut(true);
            void signOut("/").catch(() => setSigningOut(false));
          }}
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      )}
    </div>
  );
}
