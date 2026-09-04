import { confidenceFromReports, shouldQuarantine } from "./allocator.ts";

export type TrustUpdate = {
  nextStatus: "active" | "quarantined";
  confidenceScore: number;
  rotationWeight: number;
  notifyOwner: boolean;
};

export function nextTrustState(input: {
  status: string;
  successfulReports: number;
  failedReports: number;
  anonymousFailedReports: number;
}): TrustUpdate {
  const confidenceScore = confidenceFromReports(
    input.successfulReports,
    input.failedReports,
  );
  const quarantine = shouldQuarantine(input);
  const failRate =
    input.failedReports + input.successfulReports === 0
      ? 0
      : input.failedReports / (input.failedReports + input.successfulReports);
  const rotationWeight = Math.max(0.2, 1.15 - failRate * 0.9);
  const wasActive = input.status === "active";
  return {
    nextStatus: quarantine ? "quarantined" : input.status === "quarantined" ? "quarantined" : "active",
    confidenceScore,
    rotationWeight,
    notifyOwner: quarantine && wasActive,
  };
}
