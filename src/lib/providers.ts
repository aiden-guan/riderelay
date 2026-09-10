import { z } from "zod";

export const providerSlugSchema = z
  .string()
  .regex(/^[a-z][a-z0-9-]{1,31}$/, "Unknown service");

export type ProviderSlug = string;

export type ProviderRecord = {
  id: string;
  slug: string;
  displayName: string;
  accent: string;
  accentFg: string;
  iconKey: string;
  enabled: boolean;
  referralInstructions: string;
  termsUrl: string | null;
  referralProgramUrl: string | null;
  signupUrl: string | null;
  allowedHosts: string[];
  codePattern: string | null;
  markets: string[];
  programActive: boolean;
  newUsersOnly: boolean;
  geographicNotes: string | null;
  expirationNotes: string | null;
  codeFormatHint: string | null;
  maxKnownBenefit: string | null;
  officialTermsUrl: string | null;
  lastVerifiedOn: string | null;
  unavailableMessage: string | null;
  shortHint: string | null;
  entryMode: "link" | "code";
  category: string;
  sortOrder: number;
};

export const DEFAULT_CODE_PATTERN = "^[A-Za-z0-9_-]{4,24}$";

export function parseHostList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((h): h is string => typeof h === "string" && h.length > 0);
  }
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      return parseHostList(parsed);
    } catch {
      return [];
    }
  }
  return [];
}

export function parseJsonRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      return parseJsonRecord(parsed);
    } catch {
      return {};
    }
  }
  return {};
}

export function joinEnglish(names: string[]): string {
  if (names.length === 0) return "your apps";
  if (names.length === 1) return names[0] ?? "your apps";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

export function providerTone(slug: string): "lime" | "veo" | "ink" {
  if (slug === "lime") return "lime";
  if (slug === "veo") return "veo";
  return "ink";
}
