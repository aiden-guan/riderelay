import { Check, Copy } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/lib/client/clipboard";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function CopyButton({
  value,
  label = "Copy code",
  onCopied,
  className,
  successMessage,
}: {
  value: string;
  label?: string;
  onCopied?: () => void;
  className?: string;
  successMessage?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [manual, setManual] = useState(false);
  const field = useRef<HTMLInputElement>(null);

  async function copy() {
    const ok = await copyToClipboard(value);
    onCopied?.();
    if (ok) {
      setCopied(true);
      setManual(false);
      toast.success(successMessage ?? `${value} copied`);
      window.setTimeout(() => setCopied(false), 1800);
      return;
    }
    setManual(true);
    window.setTimeout(() => {
      field.current?.focus();
      field.current?.select();
    }, 0);
    toast.message("Select the code, then copy", { description: value });
  }

  return (
    <div className={cn("flex w-full flex-col gap-2 sm:w-auto", className)}>
      <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={() => void copy()}>
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        {copied ? "Copied" : label}
      </Button>
      {manual ? (
        <input
          ref={field}
          readOnly
          value={value}
          aria-label="Referral code"
          className="h-11 w-full rounded-lg bg-surface-2 px-3 font-mono text-base tracking-wide"
          onFocus={(e) => e.currentTarget.select()}
        />
      ) : null}
    </div>
  );
}
