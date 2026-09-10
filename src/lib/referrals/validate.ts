export type ValidationOk<T> = { ok: true; value: T };
export type ValidationErr = { ok: false; error: string; code: string };
export type Validation<T> = ValidationOk<T> | ValidationErr;

const DEFAULT_CODE_PATTERN = "^[A-Za-z0-9_-]{4,24}$";
const BLOCKED_SCHEMES = new Set(["javascript", "data", "vbscript", "file"]);

export function normalizeCode(raw: string): string {
  return raw.trim().replace(/\s+/g, "").replace(/^\$/, "");
}

export function normalizeCodeKey(raw: string): string {
  return normalizeCode(raw).toLowerCase();
}

export function validateReferralCode(
  raw: string,
  pattern = DEFAULT_CODE_PATTERN,
): Validation<string> {
  const code = normalizeCode(raw);
  if (code.length < 3) {
    return { ok: false, error: "That code is too short.", code: "code_short" };
  }
  if (code.length > 32) {
    return { ok: false, error: "That code is too long.", code: "code_long" };
  }
  if (/[<>'"\\]/.test(code) || /script/i.test(code)) {
    return { ok: false, error: "That code contains invalid characters.", code: "code_unsafe" };
  }
  try {
    const re = new RegExp(pattern);
    if (!re.test(code)) {
      return {
        ok: false,
        error: "Use the code from the provider app.",
        code: "code_format",
      };
    }
  } catch {
    if (!/^[A-Za-z0-9_$-]{3,32}$/.test(code)) {
      return { ok: false, error: "That code does not look valid.", code: "code_format" };
    }
  }
  return { ok: true, value: code };
}

export function extractReferralUrl(raw: string, allowedHosts?: string[]): string | null {
  const matches = raw.match(/https:\/\/[^\s<>"'\\]+/gi);
  if (!matches) return null;
  const allowed = allowedHosts?.map((h) => h.toLowerCase());
  for (const candidate of matches) {
    const cleaned = candidate.replace(/[),.;!?]+$/g, "");
    try {
      const parsed = new URL(cleaned);
      if (parsed.protocol !== "https:") continue;
      if (parsed.username || parsed.password) continue;
      if (allowed?.length && !allowed.includes(parsed.hostname.toLowerCase())) continue;
      return cleaned;
    } catch {
      continue;
    }
  }
  return null;
}

export function validateReferralUrl(
  raw: string,
  allowedHosts: string[],
): Validation<string> {
  const trimmed = extractReferralUrl(raw, allowedHosts) ?? extractReferralUrl(raw) ?? raw.trim();
  if (!trimmed) {
    return { ok: false, error: "Add the referral link from the app.", code: "url_missing" };
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: "That link is not a valid URL.", code: "url_malformed" };
  }
  if (parsed.protocol !== "https:") {
    return { ok: false, error: "Referral links must use https.", code: "url_scheme" };
  }
  if (BLOCKED_SCHEMES.has(parsed.protocol.replace(":", ""))) {
    return { ok: false, error: "That link is not allowed.", code: "url_scheme" };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, error: "That link is not allowed.", code: "url_credentials" };
  }
  const host = parsed.hostname.toLowerCase();
  const allowed = new Set(allowedHosts.map((h) => h.toLowerCase()));
  if (!allowed.has(host)) {
    return {
      ok: false,
      error: "That link does not match this provider. Paste the official share URL.",
      code: "url_host",
    };
  }
  parsed.hash = "";
  parsed.hostname = host;
  const canonical = parsed.toString().replace(/\/$/, "");
  return { ok: true, value: canonical };
}

export function normalizeUrlKey(raw: string): string {
  return raw.trim().toLowerCase();
}

export function extractReferralToken(raw: string): string | null {
  const trimmed = extractReferralUrl(raw) ?? raw.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    const fromQuery =
      parsed.searchParams.get("code") ||
      parsed.searchParams.get("referral") ||
      parsed.searchParams.get("ref") ||
      parsed.searchParams.get("invite");
    if (fromQuery && /^[A-Za-z0-9_-]{4,32}$/.test(fromQuery.trim())) {
      return fromQuery.trim();
    }
    const parts = parsed.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1] ?? "";
    if (/^[A-Za-z0-9_-]{4,32}$/.test(last)) return last;
    return null;
  } catch {
    return null;
  }
}

export function looksLikeUrl(raw: string): boolean {
  return extractReferralUrl(raw) != null || /^https?:\/\//i.test(raw.trim());
}

export function isSafeExternalUrl(raw: string, allowedHosts: string[]): boolean {
  return validateReferralUrl(raw, allowedHosts).ok;
}

export function usernameSchemaError(raw: string): string | null {
  const value = raw.trim().toLowerCase();
  if (value.length < 3) return "Usernames need at least 3 characters.";
  if (value.length > 20) return "Usernames can be 20 characters.";
  if (!/^[a-z][a-z0-9_]*$/.test(value)) {
    return "Start with a letter. Use letters, numbers, and underscores.";
  }
  const reserved = new Set([
    "admin",
    "riderelay",
    "lime",
    "veo",
    "support",
    "creator",
    "relay",
    "help",
    "api",
    "login",
    "share",
    "get",
  ]);
  if (reserved.has(value)) return "That username is reserved.";
  return null;
}
