export async function copyToClipboard(text: string): Promise<boolean> {
  const value = text.trim();
  if (!value || typeof window === "undefined") return false;

  if (window.isSecureContext && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      /* iframe / permission — fall through */
    }
  }

  return copyWithExecCommand(value);
}

function copyWithExecCommand(text: string): boolean {
  const el = document.createElement("textarea");
  el.value = text;
  el.setAttribute("readonly", "");
  el.setAttribute("aria-hidden", "true");
  el.tabIndex = -1;
  el.style.cssText =
    "position:fixed;top:0;left:0;width:2px;height:2px;padding:0;border:0;opacity:0;overflow:hidden;";
  document.body.appendChild(el);

  const selection = document.getSelection();
  const previous = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

  el.focus();
  el.select();
  el.setSelectionRange(0, text.length);

  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }

  document.body.removeChild(el);
  if (previous && selection) {
    selection.removeAllRanges();
    selection.addRange(previous);
  }
  return ok;
}
