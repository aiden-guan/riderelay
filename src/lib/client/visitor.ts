import { useEffect, useState } from "react";

const KEY = "rr_vid";

export function readVisitorId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function ensureVisitorId(): string {
  const existing = readVisitorId();
  if (existing) return existing;
  const id = crypto.randomUUID();
  try {
    window.localStorage.setItem(KEY, id);
  } catch {
    /* private mode — still return an ephemeral id */
  }
  return id;
}

export function useVisitorId(): string | null {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    setId(ensureVisitorId());
  }, []);
  return id;
}
