import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { resolveInviteFn } from "@/lib/server/api";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useVisitorId } from "@/lib/client/visitor";
import { clearViaToken, writeViaToken } from "@/lib/client/via";
import { PageShell } from "@/components/page-shell";

export const Route = createFileRoute("/i/$token")({
  component: InviteLanding,
});

function InviteLanding() {
  const { token } = Route.useParams();
  const visitorId = useVisitorId();
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const [note, setNote] = useState("Opening invite…");

  useEffect(() => {
    if (!visitorId || isPending) return;
    void resolveInviteFn({ data: { token, visitorId } })
      .then((result) => {
        if (result.kind === "self") {
          clearViaToken();
          setNote("That’s your own invite. Self-shares don’t count.");
        } else if (result.kind === "ok") {
          writeViaToken(token);
          setNote(`Invite from @${result.username}. Copy a code to confirm it.`);
        } else {
          clearViaToken();
          setNote("That invite isn’t valid.");
        }
        window.setTimeout(() => {
          void navigate({ to: "/" });
        }, 900);
      })
      .catch(() => {
        void navigate({ to: "/" });
      });
  }, [visitorId, isPending, token, user?.id, navigate]);

  return (
    <PageShell>
      <p className="text-muted">{note}</p>
    </PageShell>
  );
}
