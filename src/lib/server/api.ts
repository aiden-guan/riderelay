import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { isAnalyticsEvent } from "@/lib/analytics";
import { optionalAuthMiddleware } from "@/lib/optional-auth";
import { providerSlugSchema } from "@/lib/providers";

const visitorSchema = z.object({
  visitorId: z.string().min(8).max(80),
});

const idSchema = z.string().min(8).max(80);

const slugVisitor = visitorSchema.extend({
  slug: providerSlugSchema,
});

async function authIdentity(userId: string): Promise<{
  email: string | null;
  name: string | null;
  image: string | null;
}> {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const rows = await sql<{ name: string; email: string; image: string | null }>`
    select name, email, image from "user" where id = ${userId}
  `;
  const row = rows[0];
  return {
    name: row?.name ?? null,
    email: row?.email ?? null,
    image: row?.image ?? null,
  };
}

export const listProviders = createServerFn({ method: "GET" }).handler(async () => {
  const { loadProviders } = await import("./helpers.server");
  return loadProviders(false);
});

export const listAllProviders = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { loadProviders, getProfileRole } = await import("./helpers.server");
    const { assertAdmin } = await import("@/lib/referrals/authz");
    assertAdmin((await getProfileRole(context.userId)) ?? "member");
    return loadProviders(true);
  });

export const assignReferralFn = createServerFn({ method: "POST" })
  .middleware([optionalAuthMiddleware])
  .validator((input: unknown) => slugVisitor.parse(input))
  .handler(async ({ data, context }) => {
    const { assignReferral } = await import("./helpers.server");
    return assignReferral({
      slug: data.slug,
      visitorId: data.visitorId,
      userId: context.userId,
    });
  });

export const markCopiedFn = createServerFn({ method: "POST" })
  .middleware([optionalAuthMiddleware])
  .validator((input: unknown) =>
    visitorSchema.extend({ assignmentId: idSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { markCopied } = await import("./helpers.server");
    return markCopied({
      assignmentId: data.assignmentId,
      visitorId: data.visitorId,
      userId: context.userId,
    });
  });

export const reportOutcomeFn = createServerFn({ method: "POST" })
  .middleware([optionalAuthMiddleware])
  .validator((input: unknown) =>
    visitorSchema
      .extend({
        assignmentId: idSchema,
        outcome: z.enum(["worked", "didnt_work"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { reportOutcome } = await import("./helpers.server");
    return reportOutcome({
      assignmentId: data.assignmentId,
      visitorId: data.visitorId,
      userId: context.userId,
      outcome: data.outcome,
    });
  });

export const submitReferralFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z
      .object({
        slug: providerSlugSchema,
        code: z.string().max(80).optional().default(""),
        referralUrl: z.string().max(500).optional().default(""),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { submitReferral } = await import("./helpers.server");
    const identity = await authIdentity(context.userId);
    return submitReferral({
      userId: context.userId,
      email: identity.email,
      name: identity.name,
      image: identity.image,
      slug: data.slug,
      code: data.code,
      referralUrl: data.referralUrl,
    });
  });

export const updateReferralFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z
      .object({
        id: idSchema,
        action: z.enum(["pause", "resume", "archive", "confirm"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { updateOwnReferral } = await import("./helpers.server");
    return updateOwnReferral({
      userId: context.userId,
      id: data.id,
      action: data.action,
    });
  });

export const getDashboardFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { loadDashboard } = await import("./helpers.server");
    const identity = await authIdentity(context.userId);
    return loadDashboard(context.userId, identity);
  });

export const updateProfileFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z
      .object({
        username: z.string().min(3).max(20),
        displayName: z.string().max(40),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { updateProfile, ensureProfile } = await import("./helpers.server");
    const identity = await authIdentity(context.userId);
    await ensureProfile(context.userId, identity);
    await updateProfile({
      userId: context.userId,
      username: data.username,
      displayName: data.displayName,
    });
    return { ok: true as const };
  });

export const markNotificationReadFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ id: idSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const { markNotificationRead } = await import("./helpers.server");
    await markNotificationRead(context.userId, data.id);
    return { ok: true as const };
  });

export const trackEventFn = createServerFn({ method: "POST" })
  .middleware([optionalAuthMiddleware])
  .validator((input: unknown) =>
    z
      .object({
        name: z.string().min(1).max(80),
        visitorId: z.string().max(80).optional(),
        properties: z.record(z.string(), z.unknown()).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    if (!isAnalyticsEvent(data.name)) return { ok: true as const };
    const { writeAnalytics, consumeRateLimit } = await import("./helpers.server");
    const key = data.visitorId || context.userId || "anon";
    const limited = await consumeRateLimit(`analytics:${key}`, "analytics", 40, 60_000);
    if (!limited.ok) return { ok: true as const };
    await writeAnalytics({
      name: data.name,
      visitorId: data.visitorId ?? null,
      userId: context.userId,
      properties: data.properties,
    });
    return { ok: true as const };
  });

export const adminCodesFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { adminListCodes } = await import("./helpers.server");
    return adminListCodes(context.userId);
  });

export const adminReportsFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { adminListReports } = await import("./helpers.server");
    return adminListReports(context.userId);
  });

export const adminSetCodeStatusFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z
      .object({
        id: idSchema,
        status: z.enum(["active", "quarantined", "invalid", "paused"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { adminSetCodeStatus } = await import("./helpers.server");
    await adminSetCodeStatus({ userId: context.userId, id: data.id, status: data.status });
    return { ok: true as const };
  });

export const adminSetProviderFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z
      .object({
        providerId: z.string().min(1).max(40),
        enabled: z.boolean(),
        programActive: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { adminSetProviderEnabled } = await import("./helpers.server");
    await adminSetProviderEnabled({
      userId: context.userId,
      providerId: data.providerId,
      enabled: data.enabled,
      programActive: data.programActive,
    });
    return { ok: true as const };
  });

export const adminAddProviderFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z
      .object({
        slug: z.string().min(2).max(32),
        displayName: z.string().min(2).max(40),
        accent: z.string().max(16).optional(),
        allowedHosts: z.string().min(3).max(400),
        instructions: z.string().max(400),
        signupUrl: z.string().max(300),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { adminAddProvider } = await import("./helpers.server");
    await adminAddProvider({
      userId: context.userId,
      slug: data.slug,
      displayName: data.displayName,
      accent: data.accent ?? "#161614",
      allowedHosts: data.allowedHosts.split(/[\s,]+/),
      instructions: data.instructions,
      signupUrl: data.signupUrl,
    });
    return { ok: true as const };
  });

export const getMeAdminFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { getProfileRole, ensureProfile } = await import("./helpers.server");
    const identity = await authIdentity(context.userId);
    await ensureProfile(context.userId, identity);
    const role = await getProfileRole(context.userId);
    return { role, userId: context.userId };
  });

export const loadBoardFn = createServerFn({ method: "GET" })
  .validator((input: unknown) =>
    z.object({ slug: providerSlugSchema.optional() }).parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const { loadBoard } = await import("./helpers.server");
    return loadBoard(data.slug);
  });

export const loadActivityFn = createServerFn({ method: "GET" }).handler(async () => {
  const { loadActivity } = await import("./helpers.server");
  return loadActivity();
});

export const pinReferralFn = createServerFn({ method: "POST" })
  .middleware([optionalAuthMiddleware])
  .validator((input: unknown) =>
    visitorSchema
      .extend({
        listingId: idSchema,
        viaToken: z.string().min(8).max(32).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { pinReferral } = await import("./helpers.server");
    return pinReferral({
      listingId: data.listingId,
      visitorId: data.visitorId,
      userId: context.userId,
      viaToken: data.viaToken,
    });
  });

export const resolveInviteFn = createServerFn({ method: "POST" })
  .middleware([optionalAuthMiddleware])
  .validator((input: unknown) =>
    visitorSchema.extend({ token: z.string().min(8).max(32) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { resolveInvite } = await import("./helpers.server");
    return resolveInvite({
      token: data.token,
      visitorId: data.visitorId,
      userId: context.userId,
    });
  });

export const claimInviteFn = createServerFn({ method: "POST" })
  .middleware([optionalAuthMiddleware])
  .validator((input: unknown) =>
    visitorSchema
      .extend({
        viaToken: z.string().min(8).max(32).optional(),
        action: z.enum(["touch", "use", "signup"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { claimInvite } = await import("./helpers.server");
    return claimInvite({
      visitorId: data.visitorId,
      viaToken: data.viaToken,
      userId: context.userId,
      action: data.action,
    });
  });

export const myListingFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ slug: providerSlugSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const { loadDashboard } = await import("./helpers.server");
    const identity = await authIdentity(context.userId);
    const dash = await loadDashboard(context.userId, identity);
    return dash.referrals.find((r) => r.providerSlug === data.slug && r.status === "active") ?? null;
  });

