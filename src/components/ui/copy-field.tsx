"use client";

import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/ui/copy-button";

interface CopyFieldProps {
  value: string;
  label: string;
}

// A value the user must transfer somewhere else by hand — an issued secret, a
// device id destined for the phone. Read-only and selectable so it stays
// copyable even where the clipboard API is unavailable.
export function CopyField({ value, label }: CopyFieldProps) {
  return (
    <div className="flex gap-2">
      <Input
        readOnly
        value={value}
        aria-label={label}
        onFocus={(e) => e.currentTarget.select()}
        className="font-mono text-xs"
      />
      <CopyButton value={value} label={label} size="lg" />
    </div>
  );
}
