import { useEffect, useRef } from "react";
import { claimInviteFn } from "@/lib/server/api";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useVisitorId } from "@/lib/client/visitor";
import { readViaToken } from "@/lib/client/via";

export function InviteBeacon() {
  const visitorId = useVisitorId();
  const { user } = useCurrentUserState();
  const sent = useRef(false);

  useEffect(() => {
    if (!visitorId) return;
    const via = readViaToken();
    const action = user && via ? "signup" : "touch";
    if (action === "touch" && sent.current && !user) return;
    sent.current = true;
    void claimInviteFn({
      data: { visitorId, viaToken: via ?? undefined, action },
    }).catch(() => undefined);
  }, [visitorId, user?.id]);

  return null;
}
