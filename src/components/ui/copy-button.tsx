"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/lib/copy-to-clipboard";

const FEEDBACK_MS = 2000;

interface CopyButtonProps extends React.ComponentProps<typeof Button> {
  value: string;
  label?: string;
}

export function CopyButton({ value, label, ...props }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!copied && !failed) return;
    const timer = setTimeout(() => {
      setCopied(false);
      setFailed(false);
    }, FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [copied, failed]);

  async function onClick() {
    const ok = await copyToClipboard(value);
    setCopied(ok);
    setFailed(!ok);
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      aria-label={label ? `Copy ${label}` : "Copy"}
      {...props}
    >
      {copied ? <Check /> : <Copy />}
      {label !== undefined && (copied ? "Copied" : failed ? "Press Ctrl+C" : "Copy")}
    </Button>
  );
}
