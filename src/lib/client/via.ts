const KEY = "rr_via";

export function readViaToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function writeViaToken(token: string) {
  try {
    window.localStorage.setItem(KEY, token);
  } catch {
    /* private mode */
  }
}

export function clearViaToken() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* private mode */
  }
}
