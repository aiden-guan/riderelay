import { AppError } from "@/lib/app-error";
import { parseHostList, parseJsonRecord, type ProviderRecord } from "@/lib/providers";
import { pickCandidate, filterEligible } from "@/lib/referrals/allocator";
import type { AllocationCandidate } from "@/lib/referrals/types";
import { rankListings } from "@/lib/referrals/board";
import { POINTS_PER_REFERRAL, SHARE, countsAsListingCopy, newInviteToken, pointsEarned, shareBlockReason, unspentPoints } from "@/lib/referrals/share";
import { assertAdmin, assertOwns } from "@/lib/referrals/authz";
import type {
  ActivityItem,
  AdminCodeRow,
  AdminReportRow,
  AssignedReferral,
  AssignResult,
  BoardListing,
  BoardSnapshot,
  DashboardData,
  NotificationItem,
  OwnReferral,
  ShareActivity,
} from "@/lib/referrals/api-types";
import { nextTrustState } from "@/lib/referrals/trust";
import { RATE_LIMITS, TRUST, type ReferralStatus } from "@/lib/referrals/types";
import {
  extractReferralToken,
  extractReferralUrl,
  looksLikeUrl,
  normalizeCodeKey,
  normalizeUrlKey,
  usernameSchemaError,
  validateReferralCode,
  validateReferralUrl,
} from "@/lib/referrals/validate";
import { newId, slugifyUsername } from "@/lib/utils";
import { getSql, type Sql } from "@/lib/db";

function iso(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? value : new Date(parsed).toISOString();
  }
  return String(value);
}

function num(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  return 0;
}

function bool(value: unknown): boolean {
  return value === true || value === "t" || value === "true";
}

type ProviderRow = Record<string, unknown>;

export function mapProvider(row: ProviderRow): ProviderRecord {
  const meta = parseJsonRecord(row.metadata);
  const shortHint = typeof meta.shortHint === "string" ? meta.shortHint : null;
  return {
    id: String(row.id),
    slug: String(row.slug),
    displayName: String(row.display_name),
    accent: String(row.accent),
    accentFg: String(row.accent_fg),
    iconKey: String(row.icon_key ?? "scooter"),
    enabled: bool(row.enabled),
    referralInstructions: String(row.referral_instructions ?? ""),
    termsUrl: row.terms_url ? String(row.terms_url) : null,
    referralProgramUrl: row.referral_program_url ? String(row.referral_program_url) : null,
    signupUrl: row.signup_url ? String(row.signup_url) : null,
    allowedHosts: parseHostList(row.allowed_hosts),
    codePattern: row.code_pattern ? String(row.code_pattern) : null,
    markets: parseHostList(row.markets),
    programActive: bool(row.program_active),
    newUsersOnly: bool(row.new_users_only),
    geographicNotes: row.geographic_notes ? String(row.geographic_notes) : null,
    expirationNotes: row.expiration_notes ? String(row.expiration_notes) : null,
    codeFormatHint: row.code_format_hint ? String(row.code_format_hint) : null,
    maxKnownBenefit: row.max_known_benefit ? String(row.max_known_benefit) : null,
    officialTermsUrl: row.official_terms_url ? String(row.official_terms_url) : null,
    lastVerifiedOn: row.last_verified_on ? String(row.last_verified_on).slice(0, 10) : null,
    unavailableMessage: row.unavailable_message ? String(row.unavailable_message) : null,
    shortHint,
    entryMode: meta.entry === "link" ? "link" : "code",
    category: String(row.category ?? meta.category ?? "more"),
    sortOrder: num(row.sort_order ?? 100),
  };
}

const PROVIDER_SELECT = `
  select p.id, p.slug, p.display_name, p.accent, p.accent_fg, p.icon_key, p.enabled,
         p.referral_instructions, p.terms_url, p.referral_program_url, p.signup_url,
         p.allowed_hosts, p.code_pattern, p.markets, p.metadata, p.category, p.sort_order,
         r.program_active, r.new_users_only, r.geographic_notes, r.expiration_notes,
         r.code_format_hint, r.max_known_benefit, r.official_terms_url,
         r.last_verified_on::text as last_verified_on, r.unavailable_message
  from providers p
  left join provider_rules r on r.provider_id = p.id
`;

export async function loadProviders(includeDisabled = false): Promise<ProviderRecord[]> {
  const sql = await getSql();
  const rows = includeDisabled
    ? await sql.query<ProviderRow>(`${PROVIDER_SELECT} order by p.sort_order asc, p.display_name asc`)
    : await sql.query<ProviderRow>(
        `${PROVIDER_SELECT} where p.enabled = true order by p.sort_order asc, p.display_name asc`,
      );
  return rows.map(mapProvider);
}

export async function loadProviderBySlug(
  slug: string,
  includeDisabled = false,
): Promise<ProviderRecord | null> {
  const sql = await getSql();
  const rows = includeDisabled
    ? await sql.query<ProviderRow>(`${PROVIDER_SELECT} where p.slug = $1`, [slug])
    : await sql.query<ProviderRow>(
        `${PROVIDER_SELECT} where p.slug = $1 and p.enabled = true`,
        [slug],
      );
  return rows[0] ? mapProvider(rows[0]) : null;
}

export async function consumeRateLimit(
  key: string,
  action: string,
  limit: number,
  windowMs: number,
): Promise<{ ok: true } | { ok: false; retryAfterSec: number }> {
  const sql = await getSql();
  const since = new Date(Date.now() - windowMs).toISOString();
  const rows = await sql<{ n: number }>`
    select count(*)::int as n from rate_limit_events
    where rate_key = ${key} and action = ${action} and created_at > ${since}
  `;
  if (num(rows[0]?.n) >= limit) {
    return { ok: false, retryAfterSec: Math.ceil(windowMs / 1000) };
  }
  await sql`
    insert into rate_limit_events (id, rate_key, action)
    values (${newId()}, ${key}, ${action})
  `;
  return { ok: true };
}

export async function writeEvent(input: {
  eventType: string;
  userId?: string | null;
  visitorId?: string | null;
  providerId?: string | null;
  referralCodeId?: string | null;
  assignmentId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const sql = await getSql();
  await sql`
    insert into referral_events (
      id, event_type, user_id, visitor_id, provider_id, referral_code_id, assignment_id, metadata
    ) values (
      ${newId()},
      ${input.eventType},
      ${input.userId ?? null},
      ${input.visitorId ?? null},
      ${input.providerId ?? null},
      ${input.referralCodeId ?? null},
      ${input.assignmentId ?? null},
      ${JSON.stringify(input.metadata ?? {})}::jsonb
    )
  `;
}

export async function writeAnalytics(input: {
  name: string;
  visitorId?: string | null;
  userId?: string | null;
  properties?: Record<string, unknown>;
}): Promise<void> {
  const sql = await getSql();
  await sql`
    insert into analytics_events (id, event_name, visitor_id, user_id, properties)
    values (
      ${newId()},
      ${input.name},
      ${input.visitorId ?? null},
      ${input.userId ?? null},
      ${JSON.stringify(input.properties ?? {})}::jsonb
    )
  `;
}

type ProfileRow = {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string;
  created_at: unknown;
  invite_token: string | null;
  home_visitor_id: string | null;
  share_count: number;
};

export async function ensureProfile(
  userId: string,
  identity: { email?: string | null; name?: string | null; image?: string | null },
): Promise<ProfileRow> {
  const sql = await getSql();
  const existing = await sql<ProfileRow>`
    select user_id, username, display_name, avatar_url, role, created_at::text as created_at,
           invite_token, home_visitor_id, share_count
    from profiles where user_id = ${userId}
  `;
  if (existing[0]) {
    if (!existing[0].invite_token) {
      const token = newInviteToken();
      await sql`update profiles set invite_token = ${token} where user_id = ${userId} and invite_token is null`;
      existing[0].invite_token = token;
    }
    return existing[0];
  }

  const admins = await sql<{ n: number }>`
    select count(*)::int as n from profiles where role = 'admin'
  `;
  const role = num(admins[0]?.n) === 0 ? "admin" : "member";
  const base = slugifyUsername(
    identity.name || identity.email?.split("@")[0] || `rider${userId.slice(0, 4)}`,
  );

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const username = attempt === 0 ? base : `${base.slice(0, 12)}${Math.floor(10 + Math.random() * 89)}`;
    try {
      const token = newInviteToken();
      const inserted = await sql<ProfileRow>`
        insert into profiles (user_id, username, display_name, avatar_url, role, invite_token)
        values (${userId}, ${username}, ${identity.name ?? null}, ${identity.image ?? null}, ${role}, ${token})
        returning user_id, username, display_name, avatar_url, role, created_at::text as created_at,
                  invite_token, home_visitor_id, share_count
      `;
      if (inserted[0]) return inserted[0];
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
    }
  }
  throw new AppError("profile", "Could not create your profile. Try again.");
}

function isUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; message?: string };
  const msg = (e.message ?? "").toLowerCase();
  return e.code === "23505" || msg.includes("unique") || msg.includes("duplicate");
}

export async function getProfileRole(userId: string): Promise<string | null> {
  const sql = await getSql();
  const rows = await sql<{ role: string }>`select role from profiles where user_id = ${userId}`;
  return rows[0]?.role ?? null;
}

function mapCandidate(row: Record<string, unknown>): AllocationCandidate {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    providerId: String(row.provider_id),
    assignmentCount: num(row.assignment_count),
    lastAssignedAt: iso(row.last_assigned_at),
    successfulReports: num(row.successful_reports),
    failedReports: num(row.failed_reports),
    anonymousFailedReports: num(row.anonymous_failed_reports),
    confidenceScore: Number(row.confidence_score ?? 0.5),
    rotationWeight: Number(row.rotation_weight ?? 1),
    createdAt: iso(row.created_at) ?? "",
    status: String(row.status) as ReferralStatus,
  };
}

async function loadAssigned(
  sql: Sql,
  assignmentId: string,
): Promise<AssignedReferral | null> {
  const rows = await sql<Record<string, unknown>>`
    select
      a.id as assignment_id,
      a.copied_at::text as copied_at,
      a.opened_at::text as opened_at,
      a.outcome,
      a.assigned_at::text as assigned_at,
      c.id as code_id,
      c.code,
      c.user_id as owner_id,
      p.id as provider_id,
      p.slug, p.display_name, p.icon_key, p.signup_url, p.referral_instructions, p.metadata,
      r.new_users_only, r.geographic_notes,
      pr.username
    from referral_assignments a
    join referral_codes c on c.id = a.referral_code_id
    join providers p on p.id = c.provider_id
    left join provider_rules r on r.provider_id = p.id
    left join profiles pr on pr.user_id = c.user_id
    where a.id = ${assignmentId}
  `;
  const row = rows[0];
  if (!row) return null;
  const meta = parseJsonRecord(row.metadata);
  return {
    assignmentId: String(row.assignment_id),
    codeId: String(row.code_id),
    code: String(row.code),
    provider: {
      id: String(row.provider_id),
      slug: String(row.slug),
      displayName: String(row.display_name),
      iconKey: String(row.icon_key ?? "scooter"),
      shortHint: typeof meta.shortHint === "string" ? meta.shortHint : null,
      newUsersOnly: bool(row.new_users_only),
      geographicNotes: row.geographic_notes ? String(row.geographic_notes) : null,
      referralInstructions: String(row.referral_instructions ?? ""),
      signupUrl: row.signup_url ? String(row.signup_url) : null,
    },
    sharerUsername: row.username ? String(row.username) : null,
    assignedAt: iso(row.assigned_at) ?? "",
    copiedAt: iso(row.copied_at),
    openedAt: iso(row.opened_at),
    outcome: row.outcome ? String(row.outcome) : null,
  };
}

export async function assignReferral(input: {
  slug: string;
  visitorId: string;
  userId: string | null;
}): Promise<AssignResult> {
  const provider = await loadProviderBySlug(input.slug);
  if (!provider) {
    throw new AppError("not_found", "That service is not on RideRelay.");
  }
  const summary = { slug: provider.slug, displayName: provider.displayName };
  if (!provider.enabled || !provider.programActive) {
    return {
      kind: "unavailable",
      message: provider.unavailableMessage ?? `${provider.displayName} referrals are paused right now.`,
      provider: summary,
    };
  }

  const sql = await getSql();
  const recentOpen = await sql<Record<string, unknown>>`
    select a.id
    from referral_assignments a
    join referral_codes c on c.id = a.referral_code_id
    where c.provider_id = ${provider.id}
      and a.outcome is null
      and a.assigned_at > now() - interval '6 hours'
      and (
        a.visitor_id = ${input.visitorId}
        or (${input.userId}::text is not null and a.receiving_user_id = ${input.userId})
      )
    order by a.assigned_at desc
    limit 1
  `;
  if (recentOpen[0]?.id) {
    const referral = await loadAssigned(sql, String(recentOpen[0].id));
    if (referral) return { kind: "assigned", referral, reused: true };
  }

  const last = await sql<{ assigned_at: string; outcome: string | null }>`
    select a.assigned_at::text as assigned_at, a.outcome
    from referral_assignments a
    join referral_codes c on c.id = a.referral_code_id
    where c.provider_id = ${provider.id}
      and a.visitor_id = ${input.visitorId}
    order by a.assigned_at desc
    limit 1
  `;
  const lastAt = last[0]?.assigned_at ? Date.parse(last[0].assigned_at) : NaN;
  const lastFailed = last[0]?.outcome === "didnt_work";
  if (!Number.isNaN(lastAt) && Date.now() - lastAt < RATE_LIMITS.assignCooldownMs && !lastFailed) {
    return {
      kind: "rate_limited",
      message: "Give that last code a minute before grabbing another.",
      retryAfterSec: Math.ceil((RATE_LIMITS.assignCooldownMs - (Date.now() - lastAt)) / 1000),
    };
  }

  const limited = await consumeRateLimit(
    `assign:${input.visitorId}:${provider.id}`,
    "assign",
    RATE_LIMITS.assignPerHour,
    60 * 60 * 1000,
  );
  if (!limited.ok) {
    return {
      kind: "rate_limited",
      message: "Slow down — the pool is rotating fairly.",
      retryAfterSec: limited.retryAfterSec,
    };
  }

  const since = new Date(Date.now() - TRUST.repeatWindowMs).toISOString();
  const recentRows = await sql<{ referral_code_id: string }>`
    select referral_code_id from referral_assignments
    where visitor_id = ${input.visitorId}
      and assigned_at > ${since}
  `;
  const recentCodeIds = recentRows.map((r) => r.referral_code_id);

  const pool = await sql<Record<string, unknown>>`
    select id, user_id, provider_id, assignment_count,
           last_assigned_at::text as last_assigned_at,
           successful_reports, failed_reports, anonymous_failed_reports,
           confidence_score, rotation_weight,
           created_at::text as created_at, status
    from referral_codes
    where provider_id = ${provider.id} and status = 'active'
  `;
  const eligible = filterEligible(pool.map(mapCandidate), {
    providerId: provider.id,
    receivingUserId: input.userId,
    recentCodeIds,
  });
  const picked = pickCandidate(eligible, Date.now());
  if (!picked) {
    return { kind: "empty", provider: summary };
  }

  const claimed = await sql<{ id: string }>`
    update referral_codes
    set last_assigned_at = now(),
        assignment_count = assignment_count + 1,
        updated_at = now()
    where id = ${picked.id} and status = 'active'
    returning id
  `;
  if (!claimed[0]) {
    return { kind: "empty", provider: summary };
  }

  const assignmentId = newId();
  await sql`
    insert into referral_assignments (
      id, referral_code_id, receiving_user_id, visitor_id
    ) values (
      ${assignmentId}, ${picked.id}, ${input.userId}, ${input.visitorId}
    )
  `;
  await writeEvent({
    eventType: "referral_assigned",
    userId: input.userId,
    visitorId: input.visitorId,
    providerId: provider.id,
    referralCodeId: picked.id,
    assignmentId,
  });
  await writeAnalytics({
    name: "referral_assigned",
    visitorId: input.visitorId,
    userId: input.userId,
    properties: { provider: provider.slug, reused: false },
  });

  const referral = await loadAssigned(sql, assignmentId);
  if (!referral) return { kind: "empty", provider: summary };
  return { kind: "assigned", referral, reused: false };
}

export async function markCopied(input: {
  assignmentId: string;
  visitorId: string;
  userId: string | null;
}): Promise<AssignedReferral> {
  const sql = await getSql();
  const updated = await sql<{ id: string }>`
    update referral_assignments
    set copied_at = coalesce(copied_at, now())
    where id = ${input.assignmentId}
      and (visitor_id = ${input.visitorId}
        or (${input.userId}::text is not null and receiving_user_id = ${input.userId}))
    returning id
  `;
  if (!updated[0]) throw new AppError("not_found", "That referral is no longer available.");
  const referral = await loadAssigned(sql, input.assignmentId);
  if (!referral) throw new AppError("not_found", "That referral is no longer available.");
  await writeEvent({
    eventType: "referral_copied",
    userId: input.userId,
    visitorId: input.visitorId,
    providerId: referral.provider.id,
    referralCodeId: referral.codeId,
    assignmentId: input.assignmentId,
  });
  await writeAnalytics({
    name: "referral_copied",
    visitorId: input.visitorId,
    userId: input.userId,
    properties: { provider: referral.provider.slug },
  });
  return referral;
}

export async function resolveOpenUrl(assignmentId: string): Promise<string> {
  const sql = await getSql();
  const rows = await sql<Record<string, unknown>>`
    select c.referral_url, c.id as code_id, c.provider_id, p.allowed_hosts, a.receiving_user_id, a.visitor_id
    from referral_assignments a
    join referral_codes c on c.id = a.referral_code_id
    join providers p on p.id = c.provider_id
    where a.id = ${assignmentId}
  `;
  const row = rows[0];
  if (!row) throw new AppError("not_found", "That referral is no longer available.", 404);
  const hosts = parseHostList(row.allowed_hosts);
  const checked = validateReferralUrl(String(row.referral_url), hosts);
  if (!checked.ok) throw new AppError("unsafe_url", "That referral link is not safe to open.", 400);
  await sql`
    update referral_assignments set opened_at = coalesce(opened_at, now())
    where id = ${assignmentId}
  `;
  await writeEvent({
    eventType: "referral_opened",
    referralCodeId: String(row.code_id),
    providerId: String(row.provider_id),
    assignmentId,
  });
  await writeAnalytics({
    name: "referral_opened",
    properties: { assignmentId },
  });
  return checked.value;
}

export async function reportOutcome(input: {
  assignmentId: string;
  visitorId: string;
  userId: string | null;
  outcome: "worked" | "didnt_work";
}): Promise<AssignedReferral> {
  const limited = await consumeRateLimit(
    `report:${input.visitorId}`,
    "report",
    RATE_LIMITS.reportPerHour,
    60 * 60 * 1000,
  );
  if (!limited.ok) {
    throw new AppError("rate_limited", "Too many reports. Try again later.", 429);
  }
  const sql = await getSql();
  const rows = await sql<Record<string, unknown>>`
    select a.id, a.outcome, a.referral_code_id, c.user_id as owner_id, c.status,
           c.successful_reports, c.failed_reports, c.anonymous_failed_reports, c.provider_id
    from referral_assignments a
    join referral_codes c on c.id = a.referral_code_id
    where a.id = ${input.assignmentId}
      and (a.visitor_id = ${input.visitorId}
        or (${input.userId}::text is not null and a.receiving_user_id = ${input.userId}))
  `;
  const row = rows[0];
  if (!row) throw new AppError("not_found", "That referral is no longer available.");
  if (input.userId && String(row.owner_id) === input.userId) {
    throw new AppError("forbidden", "You can't report your own code.");
  }
  if (row.outcome === "worked" || row.outcome === "didnt_work") {
    const existing = await loadAssigned(sql, input.assignmentId);
    if (!existing) throw new AppError("not_found", "That referral is no longer available.");
    return existing;
  }

  const signedIn = Boolean(input.userId);
  const weight =
    input.outcome === "worked"
      ? signedIn
        ? TRUST.signedInSuccessWeight
        : TRUST.anonymousSuccessWeight
      : signedIn
        ? TRUST.signedInFailWeight
        : TRUST.anonymousFailWeight;

  await sql`
    insert into referral_reports (
      id, assignment_id, referral_code_id, reporter_user_id, visitor_id, outcome, weight
    ) values (
      ${newId()}, ${input.assignmentId}, ${String(row.referral_code_id)},
      ${input.userId}, ${input.visitorId}, ${input.outcome}, ${weight}
    )
    on conflict (assignment_id) do nothing
  `;
  await sql`
    update referral_assignments
    set outcome = ${input.outcome}, outcome_reported_at = now()
    where id = ${input.assignmentId}
  `;

  const successDelta = input.outcome === "worked" ? 1 : 0;
  const failDelta = input.outcome === "didnt_work" ? 1 : 0;
  const anonFailDelta = input.outcome === "didnt_work" && !signedIn ? 1 : 0;
  const nextSuccess = num(row.successful_reports) + successDelta;
  const nextFail = num(row.failed_reports) + failDelta;
  const nextAnon = num(row.anonymous_failed_reports) + anonFailDelta;
  const trust = nextTrustState({
    status: String(row.status),
    successfulReports: nextSuccess,
    failedReports: nextFail,
    anonymousFailedReports: nextAnon,
  });
  const nextStatus =
    trust.nextStatus === "quarantined" && String(row.status) === "active"
      ? "quarantined"
      : String(row.status);

  await sql`
    update referral_codes
    set successful_reports = ${nextSuccess},
        failed_reports = ${nextFail},
        anonymous_failed_reports = ${nextAnon},
        confidence_score = ${trust.confidenceScore},
        rotation_weight = ${trust.rotationWeight},
        status = ${nextStatus},
        updated_at = now()
    where id = ${String(row.referral_code_id)}
  `;

  if (trust.notifyOwner) {
    await sql`
      insert into notifications (id, user_id, kind, title, body, referral_code_id)
      values (
        ${newId()},
        ${String(row.owner_id)},
        'quarantine',
        ${"People are reporting that your referral may no longer work."},
        ${"Confirm it still works, replace it, or pause it from your dashboard."},
        ${String(row.referral_code_id)}
      )
    `;
  }

  await writeEvent({
    eventType: "referral_outcome_reported",
    userId: input.userId,
    visitorId: input.visitorId,
    providerId: String(row.provider_id),
    referralCodeId: String(row.referral_code_id),
    assignmentId: input.assignmentId,
    metadata: { outcome: input.outcome },
  });
  await writeAnalytics({
    name: "referral_outcome_reported",
    visitorId: input.visitorId,
    userId: input.userId,
    properties: { outcome: input.outcome },
  });

  const referral = await loadAssigned(sql, input.assignmentId);
  if (!referral) throw new AppError("not_found", "That referral is no longer available.");
  return referral;
}

export async function submitReferral(input: {
  userId: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  slug: string;
  code: string;
  referralUrl: string;
}): Promise<OwnReferral> {
  const limited = await consumeRateLimit(
    `submit:${input.userId}`,
    "submit",
    RATE_LIMITS.submitPerDay,
    24 * 60 * 60 * 1000,
  );
  if (!limited.ok) {
    throw new AppError("rate_limited", "You've submitted enough for today.", 429);
  }
  await ensureProfile(input.userId, {
    email: input.email,
    name: input.name,
    image: input.image,
  });
  const provider = await loadProviderBySlug(input.slug);
  if (!provider) throw new AppError("not_found", "That service is not on RideRelay.");
  if (!provider.programActive) {
    throw new AppError(
      "unavailable",
      provider.unavailableMessage ?? `${provider.displayName} referrals are paused.`,
    );
  }

  let codeRaw = input.code.trim();
  let urlRaw =
    extractReferralUrl(input.referralUrl, provider.allowedHosts) ??
    extractReferralUrl(input.referralUrl) ??
    input.referralUrl.trim();
  if (looksLikeUrl(codeRaw) && !urlRaw) {
    urlRaw =
      extractReferralUrl(codeRaw, provider.allowedHosts) ??
      extractReferralUrl(codeRaw) ??
      codeRaw;
    codeRaw = "";
  }
  if (!codeRaw && urlRaw) {
    codeRaw = extractReferralToken(urlRaw) ?? "";
  }
  if (!urlRaw && provider.entryMode !== "link" && provider.signupUrl) {
    urlRaw = provider.signupUrl;
  }
  if (provider.entryMode === "link" && !urlRaw) {
    throw new AppError("url_missing", `Paste your ${provider.displayName} referral link.`);
  }
  if (!codeRaw) {
    throw new AppError(
      "code_missing",
      provider.entryMode === "link"
        ? "That link doesn’t include a referral token."
        : "Add the code from the app.",
    );
  }

  const codeResult = validateReferralCode(codeRaw, provider.codePattern ?? undefined);
  if (!codeResult.ok) throw new AppError(codeResult.code, codeResult.error);
  const urlResult = validateReferralUrl(urlRaw, provider.allowedHosts);
  if (!urlResult.ok) throw new AppError(urlResult.code, urlResult.error);

  const sql = await getSql();
  const codeKey = normalizeCodeKey(codeResult.value);
  const urlKey = normalizeUrlKey(urlResult.value);
  const dup = await sql<{ id: string }>`
    select id from referral_codes
    where provider_id = ${provider.id}
      and status <> 'archived'
      and user_id <> ${input.userId}
      and (code_normalized = ${codeKey} or url_normalized = ${urlKey})
    limit 1
  `;
  if (dup[0]) {
    throw new AppError("duplicate", "That code is already in the rotation.");
  }

  const previous = await sql<{ id: string; bid_cents: number; boost_points: number }>`
    select id, bid_cents, coalesce(boost_points, 0) as boost_points from referral_codes
    where user_id = ${input.userId}
      and provider_id = ${provider.id}
      and status in ('active', 'paused', 'quarantined')
    limit 1
  `;
  const carried = num(previous[0]?.bid_cents);
  const carriedBoost = num(previous[0]?.boost_points);

  await sql`
    update referral_codes
    set status = 'archived', boost_points = 0, updated_at = now()
    where user_id = ${input.userId}
      and provider_id = ${provider.id}
      and status in ('active', 'paused', 'quarantined')
  `;

  const id = newId();
  try {
    await sql`
      insert into referral_codes (
        id, user_id, provider_id, code, code_normalized, referral_url, url_normalized, status,
        bid_cents, last_bid_at, boost_points
      ) values (
        ${id}, ${input.userId}, ${provider.id}, ${codeResult.value}, ${codeKey},
        ${urlResult.value}, ${urlKey}, 'active',
        ${carried}, ${carried > 0 ? new Date().toISOString() : null}, ${carriedBoost}
      )
    `;
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new AppError("duplicate", "That code is already on the board.");
    }
    throw err;
  }

  await writeEvent({
    eventType: "referral_submitted",
    userId: input.userId,
    providerId: provider.id,
    referralCodeId: id,
  });
  await writeAnalytics({
    name: "referral_submitted",
    userId: input.userId,
    properties: { provider: provider.slug },
  });

  const mine = await loadOwnReferral(sql, id, input.userId);
  if (!mine) throw new AppError("save", "Saved, but we couldn't reload it.");
  return attachRank(sql, mine);
}

async function loadOwnReferral(sql: Sql, id: string, userId: string): Promise<OwnReferral | null> {
  const rows = await sql<Record<string, unknown>>`
    select c.id, c.provider_id, p.slug, p.display_name, c.code, c.referral_url, c.status,
           c.assignment_count, c.successful_reports, c.failed_reports,
           c.created_at::text as created_at, c.last_assigned_at::text as last_assigned_at,
           coalesce(c.boost_points, 0) as boost_points,
           coalesce(c.featured, false) as featured, p.metadata
    from referral_codes c
    join providers p on p.id = c.provider_id
    where c.id = ${id} and c.user_id = ${userId}
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    id: String(row.id),
    providerId: String(row.provider_id),
    providerSlug: String(row.slug),
    providerName: String(row.display_name),
    code: String(row.code),
    referralUrl: String(row.referral_url),
    status: String(row.status) as ReferralStatus,
    assignmentCount: num(row.assignment_count),
    successfulReports: num(row.successful_reports),
    failedReports: num(row.failed_reports),
    createdAt: iso(row.created_at) ?? "",
    lastAssignedAt: iso(row.last_assigned_at),
    boostPoints: num(row.boost_points),
    rank: null,
    featured: bool(row.featured),
    usesLink: parseJsonRecord(row.metadata).entry === "link",
  };
}

export async function updateOwnReferral(input: {
  userId: string;
  id: string;
  action: "pause" | "resume" | "archive" | "confirm";
}): Promise<OwnReferral> {
  const sql = await getSql();
  const rows = await sql<Record<string, unknown>>`
    select id, user_id, status, failed_reports, anonymous_failed_reports, successful_reports
    from referral_codes where id = ${input.id}
  `;
  const row = rows[0];
  if (!row) throw new AppError("not_found", "Referral not found.");
  assertOwns(input.userId, String(row.user_id));

  let status = String(row.status);
  if (input.action === "pause") status = "paused";
  if (input.action === "archive") status = "archived";
  if (input.action === "resume" && status === "paused") status = "active";
  if (input.action === "confirm") {
    status = "active";
    await sql`
      update referral_codes
      set status = 'active',
          anonymous_failed_reports = 0,
          failed_reports = least(failed_reports, 1),
          rotation_weight = 1,
          confidence_score = ${0.55},
          updated_at = now()
      where id = ${input.id} and user_id = ${input.userId}
    `;
  } else {
    await sql`
      update referral_codes
      set status = ${status},
          boost_points = case when ${status} = 'archived' then 0 else boost_points end,
          updated_at = now()
      where id = ${input.id} and user_id = ${input.userId}
    `;
  }

  const mine = await loadOwnReferral(sql, input.id, input.userId);
  if (!mine) throw new AppError("not_found", "Referral not found.");
  await writeEvent({
    eventType: `referral_${input.action}`,
    userId: input.userId,
    providerId: mine.providerId,
    referralCodeId: mine.id,
  });
  return mine;
}

export async function allocateBoost(input: {
  userId: string;
  listingId: string;
  delta: number;
}): Promise<OwnReferral> {
  if (!Number.isInteger(input.delta) || input.delta === 0) {
    throw new AppError("points", "Choose how many points to move.");
  }
  if (Math.abs(input.delta) > 10_000) {
    throw new AppError("points", "That’s too many points at once.");
  }
  const sql = await getSql();
  const moved = await sql<{ boost_points: number }>`
    with budget as (
      select
        p.share_count * ${POINTS_PER_REFERRAL} as earned,
        coalesce((
          select sum(c2.boost_points)
          from referral_codes c2
          where c2.user_id = p.user_id
            and c2.status <> 'archived'
            and c2.id <> ${input.listingId}
        ), 0) as others
      from profiles p
      where p.user_id = ${input.userId}
    )
    update referral_codes c
    set boost_points = c.boost_points + ${input.delta}, updated_at = now()
    from budget b
    where c.id = ${input.listingId}
      and c.user_id = ${input.userId}
      and c.status <> 'archived'
      and c.boost_points + ${input.delta} >= 0
      and c.boost_points + ${input.delta} + b.others <= b.earned
    returning c.boost_points
  `;
  if (!moved[0]) {
    throw new AppError(
      "points",
      input.delta > 0
        ? "Not enough unspent points. Invite more people to RideRelay."
        : "This listing doesn’t have that many points on it.",
    );
  }
  await writeEvent({
    eventType: "boost_allocated",
    userId: input.userId,
    referralCodeId: input.listingId,
    metadata: { delta: input.delta, boost: moved[0].boost_points },
  });
  const mine = await loadOwnReferral(sql, input.listingId, input.userId);
  if (!mine) throw new AppError("not_found", "Listing not found.");
  return attachRank(sql, mine);
}

function contributorLevel(peopleHelped: number, shared: number): string {
  if (peopleHelped >= 10 || shared >= 4) return "Relay";
  if (peopleHelped >= 3 || shared >= 2) return "Regular";
  if (shared >= 1 || peopleHelped >= 1) return "Contributor";
  return "New";
}

export async function loadDashboard(userId: string, identity: {
  email?: string | null;
  name?: string | null;
  image?: string | null;
}): Promise<DashboardData> {
  const profile = await ensureProfile(userId, identity);
  const sql = await getSql();
  const referralRows = await sql<Record<string, unknown>>`
    select c.id, c.provider_id, p.slug, p.display_name, c.code, c.referral_url, c.status,
           c.assignment_count, c.successful_reports, c.failed_reports,
           c.created_at::text as created_at, c.last_assigned_at::text as last_assigned_at,
           coalesce(c.boost_points, 0) as boost_points,
           coalesce(c.featured, false) as featured, p.metadata
    from referral_codes c
    join providers p on p.id = c.provider_id
    where c.user_id = ${userId} and c.status <> 'archived'
    order by p.display_name asc
  `;
  let referrals: OwnReferral[] = referralRows.map((row) => ({
    id: String(row.id),
    providerId: String(row.provider_id),
    providerSlug: String(row.slug),
    providerName: String(row.display_name),
    code: String(row.code),
    referralUrl: String(row.referral_url),
    status: String(row.status) as ReferralStatus,
    assignmentCount: num(row.assignment_count),
    successfulReports: num(row.successful_reports),
    failedReports: num(row.failed_reports),
    createdAt: iso(row.created_at) ?? "",
    lastAssignedAt: iso(row.last_assigned_at),
    boostPoints: num(row.boost_points),
    rank: null,
    featured: bool(row.featured),
    usesLink: parseJsonRecord(row.metadata).entry === "link",
  }));
  referrals = await Promise.all(referrals.map((r) => attachRank(sql, r)));

  const eventRows = await sql<Record<string, unknown>>`
    select id, event_type, provider_id, created_at::text as created_at, metadata
    from referral_events
    where user_id = ${userId}
    order by created_at desc
    limit 20
  `;
  const activity: ActivityItem[] = eventRows.map((row) => ({
    id: String(row.id),
    eventType: String(row.event_type),
    providerId: row.provider_id ? String(row.provider_id) : null,
    createdAt: iso(row.created_at) ?? "",
    summary: summarizeEvent(String(row.event_type)),
  }));

  const noteRows = await sql<Record<string, unknown>>`
    select id, kind, title, body, referral_code_id, read_at::text as read_at,
           created_at::text as created_at
    from notifications
    where user_id = ${userId}
    order by created_at desc
    limit 10
  `;
  const notifications: NotificationItem[] = noteRows.map((row) => ({
    id: String(row.id),
    kind: String(row.kind),
    title: String(row.title),
    body: String(row.body),
    referralCodeId: row.referral_code_id ? String(row.referral_code_id) : null,
    readAt: iso(row.read_at),
    createdAt: iso(row.created_at) ?? "",
  }));

  const referralsShared = referrals.filter((r) => r.status !== "archived").length;
  const selections = referrals.reduce((sum, r) => sum + r.assignmentCount, 0);
  const peopleHelped = referrals.reduce((sum, r) => sum + r.successfulReports, 0);

  const allocated = referrals.reduce((sum, r) => sum + r.boostPoints, 0);
  const earned = pointsEarned(num(profile.share_count));

  return {
    profile: {
      userId: profile.user_id,
      username: profile.username,
      displayName: profile.display_name,
      avatarUrl: profile.avatar_url,
      role: profile.role,
      createdAt: iso(profile.created_at) ?? "",
      shareCount: num(profile.share_count),
      pointsEarned: earned,
      pointsUnspent: unspentPoints(earned, allocated),
      pointsAllocated: allocated,
      inviteToken: profile.invite_token ?? null,
    },
    referrals,
    activity,
    notifications,
    stats: {
      referralsShared,
      selections,
      peopleHelped,
      contributorLevel: contributorLevel(peopleHelped, referralsShared),
    },
  };
}

function summarizeEvent(type: string): string {
  switch (type) {
    case "referral_assigned":
      return "Someone received one of your codes";
    case "referral_copied":
      return "Someone copied a code";
    case "referral_opened":
      return "Someone opened a referral link";
    case "referral_outcome_reported":
      return "Someone reported a result";
    case "referral_submitted":
      return "You joined the rotation";
    case "referral_pause":
      return "You paused a referral";
    case "referral_resume":
      return "You resumed a referral";
    case "referral_confirm":
      return "You confirmed a referral still works";
    case "referral_archive":
      return "You removed a referral";
    case "boost_allocated":
      return "You moved points on a listing";
    default:
      return type.replace(/_/g, " ");
  }
}

export async function updateProfile(input: {
  userId: string;
  username: string;
  displayName: string;
}): Promise<void> {
  const usernameError = usernameSchemaError(input.username);
  if (usernameError) throw new AppError("username", usernameError);
  const displayName = input.displayName.trim().slice(0, 40);
  const sql = await getSql();
  try {
    const rows = await sql<{ user_id: string }>`
      update profiles
      set username = ${input.username.trim().toLowerCase()},
          display_name = ${displayName || null},
          updated_at = now()
      where user_id = ${input.userId}
      returning user_id
    `;
    if (!rows[0]) throw new AppError("not_found", "Profile not found.");
  } catch (err) {
    if (isUniqueViolation(err)) throw new AppError("username", "That username is taken.");
    throw err;
  }
}

export async function markNotificationRead(userId: string, id: string): Promise<void> {
  const sql = await getSql();
  await sql`
    update notifications set read_at = now()
    where id = ${id} and user_id = ${userId}
  `;
}

export async function adminListCodes(userId: string): Promise<AdminCodeRow[]> {
  await assertAdmin((await getProfileRole(userId)) ?? "member");
  const sql = await getSql();
  const rows = await sql<Record<string, unknown>>`
    select c.id, c.provider_id, p.display_name, pr.username, c.code, c.status,
           c.assignment_count, c.successful_reports, c.failed_reports,
           c.created_at::text as created_at, c.last_assigned_at::text as last_assigned_at
    from referral_codes c
    join providers p on p.id = c.provider_id
    left join profiles pr on pr.user_id = c.user_id
    where c.status <> 'archived'
    order by c.updated_at desc
    limit 100
  `;
  return rows.map((row) => ({
    id: String(row.id),
    providerId: String(row.provider_id),
    providerName: String(row.display_name),
    username: row.username ? String(row.username) : null,
    code: String(row.code),
    status: String(row.status) as ReferralStatus,
    assignmentCount: num(row.assignment_count),
    successfulReports: num(row.successful_reports),
    failedReports: num(row.failed_reports),
    createdAt: iso(row.created_at) ?? "",
    lastAssignedAt: iso(row.last_assigned_at),
  }));
}

export async function adminListReports(userId: string): Promise<AdminReportRow[]> {
  await assertAdmin((await getProfileRole(userId)) ?? "member");
  const sql = await getSql();
  const rows = await sql<Record<string, unknown>>`
    select r.id, r.outcome, r.weight, r.created_at::text as created_at,
           c.code, p.display_name, pr.username
    from referral_reports r
    join referral_codes c on c.id = r.referral_code_id
    join providers p on p.id = c.provider_id
    left join profiles pr on pr.user_id = c.user_id
    order by r.created_at desc
    limit 80
  `;
  return rows.map((row) => ({
    id: String(row.id),
    outcome: String(row.outcome),
    weight: Number(row.weight ?? 1),
    createdAt: iso(row.created_at) ?? "",
    code: String(row.code),
    providerName: String(row.display_name),
    username: row.username ? String(row.username) : null,
  }));
}

export async function adminSetCodeStatus(input: {
  userId: string;
  id: string;
  status: "active" | "quarantined" | "invalid" | "paused";
}): Promise<void> {
  await assertAdmin((await getProfileRole(input.userId)) ?? "member");
  const sql = await getSql();
  await sql`
    update referral_codes set status = ${input.status}, updated_at = now()
    where id = ${input.id}
  `;
}

export async function adminSetProviderEnabled(input: {
  userId: string;
  providerId: string;
  enabled: boolean;
  programActive: boolean;
}): Promise<void> {
  await assertAdmin((await getProfileRole(input.userId)) ?? "member");
  const sql = await getSql();
  await sql`
    update providers set enabled = ${input.enabled}, updated_at = now()
    where id = ${input.providerId}
  `;
  await sql`
    update provider_rules
    set program_active = ${input.programActive}, updated_at = now()
    where provider_id = ${input.providerId}
  `;
}

export async function adminAddProvider(input: {
  userId: string;
  slug: string;
  displayName: string;
  accent: string;
  allowedHosts: string[];
  instructions: string;
  signupUrl: string;
}): Promise<void> {
  await assertAdmin((await getProfileRole(input.userId)) ?? "member");
  const slug = input.slug.trim().toLowerCase();
  if (!/^[a-z][a-z0-9-]{1,31}$/.test(slug)) {
    throw new AppError("slug", "Use a lowercase slug like bird or spin.");
  }
  const displayName = input.displayName.trim().slice(0, 40);
  if (displayName.length < 2) throw new AppError("name", "Add a display name.");
  const hosts = input.allowedHosts.map((h) => h.trim().toLowerCase()).filter(Boolean);
  if (hosts.length === 0) throw new AppError("hosts", "Add at least one allowed host.");
  const sql = await getSql();
  const id = slug;
  try {
    await sql`
      insert into providers (
        id, slug, display_name, accent, accent_fg, icon_key, enabled,
        referral_instructions, signup_url, allowed_hosts
      ) values (
        ${id}, ${slug}, ${displayName}, ${input.accent || "#161614"}, ${"#F4F1EA"},
        ${"scooter"}, true, ${input.instructions.trim()},
        ${input.signupUrl.trim() || null}, ${JSON.stringify(hosts)}::jsonb
      )
    `;
    await sql`
      insert into provider_rules (provider_id, program_active, new_users_only)
      values (${id}, true, true)
    `;
  } catch (err) {
    if (isUniqueViolation(err)) throw new AppError("duplicate", "That provider already exists.");
    throw err;
  }
}

export async function handleGoRedirect(assignmentId: string): Promise<Response> {
  try {
    const url = await resolveOpenUrl(assignmentId);
    return new Response(null, {
      status: 302,
      headers: { Location: url, "Cache-Control": "no-store" },
    });
  } catch (err) {
    const message = err instanceof AppError ? err.message : "That referral is no longer available.";
    const status = err instanceof AppError ? err.status : 404;
    return new Response(
      `<!doctype html><meta charset="utf-8"><title>RideRelay</title><body style="font-family:system-ui;padding:48px;background:#F4F1EA;color:#161614"><h1>Can't open that link</h1><p>${escapeHtml(message)}</p><p><a href="/get">Get another referral</a></p></body>`,
      { status, headers: { "content-type": "text/html; charset=utf-8" } },
    );
  }
}

function escapeHtml(value: string): string {
  const table: Record<string, string> = {
    "&": "&" + "amp;",
    "<": "&" + "lt;",
    ">": "&" + "gt;",
    '"': "&" + "quot;",
  };
  return value.replace(/[&<>"]/g, (ch) => table[ch] ?? ch);
}

async function attachRank(sql: Sql, listing: OwnReferral): Promise<OwnReferral> {
  const rows = await sql<{ id: string; boost_points: number; created_at: string; featured: boolean }>`
    select c.id, coalesce(c.boost_points, 0) as boost_points, c.created_at::text as created_at,
           coalesce(c.featured, false) as featured
    from referral_codes c
    where c.provider_id = ${listing.providerId} and c.status = 'active'
  `;
  const ranked = rankListings(
    rows.map((r) => ({
      id: r.id,
      score: num(r.boost_points),
      createdAt: r.created_at,
      featured: Boolean(r.featured),
    })),
  );
  const mine = ranked.find((r) => r.id === listing.id);
  return { ...listing, boostPoints: mine?.score ?? listing.boostPoints, rank: mine?.rank ?? null };
}

export async function loadBoard(slug?: string | null): Promise<BoardSnapshot> {
  const sql = await getSql();
  const rows = slug
    ? await sql<Record<string, unknown>>`
        select c.id, c.code, c.referral_url, c.user_id, c.provider_id, c.assignment_count,
               c.successful_reports, c.created_at::text as created_at,
               coalesce(c.featured, false) as featured,
               coalesce(c.boost_points, 0) as boost_points,
               p.slug, p.display_name, p.icon_key, p.signup_url, p.referral_instructions, p.metadata,
               r.new_users_only, pr.username
        from referral_codes c
        join providers p on p.id = c.provider_id
        left join provider_rules r on r.provider_id = p.id
        left join profiles pr on pr.user_id = c.user_id
        where c.status = 'active' and p.enabled = true and p.slug = ${slug}
      `
    : await sql<Record<string, unknown>>`
        select c.id, c.code, c.referral_url, c.user_id, c.provider_id, c.assignment_count,
               c.successful_reports, c.created_at::text as created_at,
               coalesce(c.featured, false) as featured,
               coalesce(c.boost_points, 0) as boost_points,
               p.slug, p.display_name, p.icon_key, p.signup_url, p.referral_instructions, p.metadata,
               r.new_users_only, pr.username
        from referral_codes c
        join providers p on p.id = c.provider_id
        left join provider_rules r on r.provider_id = p.id
        left join profiles pr on pr.user_id = c.user_id
        where c.status = 'active' and p.enabled = true
      `;

  const grouped = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = String(row.provider_id);
    const list = grouped.get(key) ?? [];
    list.push(row);
    grouped.set(key, list);
  }

  const listings: BoardListing[] = [];
  for (const group of grouped.values()) {
    const ranked = rankListings(
      group.map((row) => ({
        id: String(row.id),
        score: num(row.boost_points),
        createdAt: iso(row.created_at) ?? "",
        featured: bool(row.featured),
        row,
      })),
    );
    for (const item of ranked) {
      const row = item.row;
      const meta = parseJsonRecord(row.metadata);
      listings.push({
        rank: item.rank,
        id: item.id,
        code: String(row.code),
        providerId: String(row.provider_id),
        providerSlug: String(row.slug),
        providerName: String(row.display_name),
        iconKey: String(row.icon_key ?? "scooter"),
        shortHint: typeof meta.shortHint === "string" ? meta.shortHint : null,
        newUsersOnly: bool(row.new_users_only),
        referralInstructions: String(row.referral_instructions ?? ""),
        signupUrl: row.signup_url ? String(row.signup_url) : null,
        username: row.username ? String(row.username) : null,
        boostPoints: item.score,
        copies: num(row.assignment_count),
        worked: num(row.successful_reports),
        createdAt: item.createdAt,
        referralUrl: String(row.referral_url ?? ""),
        featured: bool(row.featured),
        usesLink: parseJsonRecord(row.metadata).entry === "link",
      });
    }
  }

  listings.sort((a, b) => {
    if (a.providerName !== b.providerName) return a.providerName.localeCompare(b.providerName);
    return a.rank - b.rank;
  });

  const uniqueSharers = new Set(listings.map((l) => l.username ?? l.id));
  const totalBoost = listings.reduce((sum, l) => sum + l.boostPoints, 0);

  return {
    providerSlug: slug ?? null,
    listings,
    totalBoost: uniqueSharers.size === listings.length ? totalBoost : totalBoost,
    listingCount: listings.length,
  };
}

export async function loadActivity(): Promise<ShareActivity[]> {
  const sql = await getSql();
  const rows = await sql<Record<string, unknown>>`
    select s.id, s.created_at::text as created_at, pr.username
    from site_shares s
    left join profiles pr on pr.user_id = s.inviter_user_id
    order by s.created_at desc
    limit 12
  `;
  return rows.map((row) => ({
    id: String(row.id),
    username: row.username ? String(row.username) : null,
    createdAt: iso(row.created_at) ?? "",
  }));
}

export async function resolveInvite(input: {
  token: string;
  visitorId: string;
  userId: string | null;
}): Promise<{ kind: "ok"; username: string } | { kind: "self" } | { kind: "unknown" }> {
  const sql = await getSql();
  const rows = await sql<{ user_id: string; username: string; home_visitor_id: string | null }>`
    select user_id, username, home_visitor_id from profiles where invite_token = ${input.token}
  `;
  const row = rows[0];
  if (!row) return { kind: "unknown" };
  if (input.userId && input.userId === row.user_id) return { kind: "self" };
  if (row.home_visitor_id && row.home_visitor_id === input.visitorId) return { kind: "self" };
  return { kind: "ok", username: row.username };
}

export async function claimInvite(input: {
  visitorId: string;
  viaToken?: string | null;
  userId: string | null;
  action: "touch" | "use" | "signup";
  listingOwnerId?: string | null;
}): Promise<{ credited: boolean; reason: string }> {
  const sql = await getSql();
  if (input.userId) {
    await sql`
      update profiles
      set home_visitor_id = coalesce(home_visitor_id, ${input.visitorId})
      where user_id = ${input.userId}
    `;
  }
  if (input.action === "touch" || !input.viaToken) {
    return { credited: false, reason: "none" };
  }

  const inviters = await sql<{
    user_id: string;
    home_visitor_id: string | null;
    invite_token: string;
  }>`
    select user_id, home_visitor_id, invite_token from profiles where invite_token = ${input.viaToken}
  `;
  const inviter = inviters[0];
  if (!inviter) return { credited: false, reason: "unknown" };

  const blocked = shareBlockReason({
    inviterUserId: inviter.user_id,
    inviterVisitorId: inviter.home_visitor_id,
    visitorId: input.visitorId,
    actorUserId: input.userId,
    listingOwnerId: input.listingOwnerId ?? null,
  });
  if (blocked) return { credited: false, reason: blocked };

  const existingVisitor = await sql<{ id: string }>`
    select id from site_shares where visitor_id = ${input.visitorId} limit 1
  `;
  if (existingVisitor[0]) {
    if (input.userId) {
      await sql`
        update site_shares
        set claimed_user_id = ${input.userId}
        where visitor_id = ${input.visitorId}
          and claimed_user_id is null
          and inviter_user_id <> ${input.userId}
      `;
    }
    return { credited: false, reason: "already" };
  }
  if (input.userId) {
    const existingUser = await sql<{ id: string }>`
      select id from site_shares where claimed_user_id = ${input.userId} limit 1
    `;
    if (existingUser[0]) return { credited: false, reason: "already" };
  }

  const limited = await consumeRateLimit(
    `share:${inviter.user_id}`,
    "site_share",
    SHARE.maxPerInviterPerHour,
    60 * 60 * 1000,
  );
  if (!limited.ok) return { credited: false, reason: "rate" };

  try {
    await sql`
      insert into site_shares (id, inviter_user_id, visitor_id, claimed_user_id, invite_token)
      values (
        ${newId()}, ${inviter.user_id}, ${input.visitorId}, ${input.userId}, ${inviter.invite_token}
      )
    `;
  } catch (err) {
    if (isUniqueViolation(err)) return { credited: false, reason: "already" };
    throw err;
  }
  await sql`
    update profiles set share_count = share_count + 1, updated_at = now()
    where user_id = ${inviter.user_id}
  `;
  await writeEvent({
    eventType: "site_share_credited",
    userId: inviter.user_id,
    visitorId: input.visitorId,
    metadata: { from: input.userId, action: input.action },
  });
  await writeAnalytics({
    name: "site_share_credited",
    visitorId: input.visitorId,
    userId: inviter.user_id,
    properties: { action: input.action },
  });
  return { credited: true, reason: "ok" };
}

export async function pinReferral(input: {
  listingId: string;
  visitorId: string;
  userId: string | null;
  viaToken?: string | null;
}): Promise<AssignedReferral> {
  const sql = await getSql();
  const rows = await sql<{
    id: string;
    provider_id: string;
    status: string;
    user_id: string;
    home_visitor_id: string | null;
  }>`
    select c.id, c.provider_id, c.status, c.user_id, pr.home_visitor_id
    from referral_codes c
    left join profiles pr on pr.user_id = c.user_id
    where c.id = ${input.listingId}
  `;
  const row = rows[0];
  if (!row || row.status !== "active") {
    throw new AppError("not_found", "That referral is no longer on the board.");
  }

  const recent = await sql<{ id: string }>`
    select id from referral_assignments
    where referral_code_id = ${input.listingId}
      and outcome is null
      and assigned_at > now() - interval '6 hours'
      and (
        visitor_id = ${input.visitorId}
        or (${input.userId}::text is not null and receiving_user_id = ${input.userId})
      )
    order by assigned_at desc
    limit 1
  `;
  if (recent[0]?.id) {
    const existing = await loadAssigned(sql, recent[0].id);
    if (existing) return existing;
  }

  const assignmentId = newId();
  await sql`
    insert into referral_assignments (id, referral_code_id, receiving_user_id, visitor_id)
    values (${assignmentId}, ${input.listingId}, ${input.userId}, ${input.visitorId})
  `;
  const counts = countsAsListingCopy({
    actorUserId: input.userId,
    listingOwnerId: row.user_id,
    visitorId: input.visitorId,
    ownerVisitorId: row.home_visitor_id,
  });
  if (counts) {
    await sql`
      update referral_codes
      set assignment_count = assignment_count + 1, last_assigned_at = now(), updated_at = now()
      where id = ${input.listingId}
    `;
    if (input.viaToken) {
      await claimInvite({
        visitorId: input.visitorId,
        viaToken: input.viaToken,
        userId: input.userId,
        action: "use",
        listingOwnerId: row.user_id,
      });
    }
  }
  await writeEvent({
    eventType: "referral_assigned",
    userId: input.userId,
    visitorId: input.visitorId,
    providerId: row.provider_id,
    referralCodeId: input.listingId,
    assignmentId,
  });
  const referral = await loadAssigned(sql, assignmentId);
  if (!referral) throw new AppError("not_found", "That referral is no longer on the board.");
  return referral;
}


export { type Sql };
