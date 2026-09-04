import { isAnalyticsEvent, type AnalyticsEventName } from "@/lib/analytics";
import { trackEventFn } from "@/lib/server/api";
import { readVisitorId } from "./visitor";

export function track(
  name: AnalyticsEventName,
  properties?: Record<string, unknown>,
): void {
  if (!isAnalyticsEvent(name)) return;
  void trackEventFn({
    data: {
      name,
      visitorId: readVisitorId() ?? undefined,
      properties,
    },
  }).catch(() => undefined);
}
