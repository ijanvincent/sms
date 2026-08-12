"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CopyField } from "@/components/ui/copy-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  ALL_API_KEY_SCOPES,
  API_KEY_SCOPE,
  type ApiKeyScope,
} from "@/lib/auth/api-key-scope";

const SCOPE_HINT: Record<ApiKeyScope, string> = {
  [API_KEY_SCOPE.CLIENT]: "Enqueues messages. For the systems that send.",
  [API_KEY_SCOPE.GATEWAY]: "Claims and reports. For the Android sender app.",
};

interface CreatedKey {
  label: string;
  scope: ApiKeyScope;
  raw: string;
}

export function CreateKeyForm() {
  const router = useRouter();

  const [label, setLabel] = useState("");
  const [scope, setScope] = useState<ApiKeyScope>(API_KEY_SCOPE.CLIENT);
  const [dailyQuota, setDailyQuota] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedKey | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    const trimmedQuota = dailyQuota.trim();
    const res = await fetch("/api/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label,
        scope,
        dailyQuota: trimmedQuota === "" ? null : Number(trimmedQuota),
      }),
    }).catch(() => null);

    if (!res) {
      setError("Network error. Check your connection and try again.");
      setSubmitting(false);
      return;
    }

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      setError(data?.error?.message ?? "Could not create the key.");
      setSubmitting(false);
      return;
    }

    setCreated({ label: data.label, scope: data.scope, raw: data.raw });
    setLabel("");
    setDailyQuota("");
    setSubmitting(false);
    router.refresh();
  }

  if (created) {
    return (
      <div className="space-y-3" data-live-refresh-pause="true">
        <div className="flex items-start gap-2 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
          <p>
            Copy <span className="font-medium">{created.label}</span> now — only its
            hash is stored, so this key cannot be shown again.
          </p>
        </div>

        <CopyField value={created.raw} label={`API key for ${created.label}`} />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setCreated(null);
            setError(null);
          }}
        >
          Done — issue another
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4"
      data-live-refresh-pause={
        submitting || label !== "" || dailyQuota !== "" || scope !== API_KEY_SCOPE.CLIENT
          ? "true"
          : undefined
      }
    >
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
        <div className="space-y-2">
          <label htmlFor="key-label" className="text-sm font-medium">
            Label
          </label>
          <Input
            id="key-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Android sender"
            maxLength={80}
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="key-scope" className="text-sm font-medium">
            Scope
          </label>
          <Select
            id="key-scope"
            value={scope}
            onChange={(e) => setScope(e.target.value as ApiKeyScope)}
          >
            {ALL_API_KEY_SCOPES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <label htmlFor="key-quota" className="text-sm font-medium">
            Daily quota
          </label>
          <Input
            id="key-quota"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={dailyQuota}
            onChange={(e) => setDailyQuota(e.target.value)}
            placeholder="Unlimited"
          />
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{SCOPE_HINT[scope]}</p>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={submitting || label.trim() === ""}>
        {submitting ? (
          <>
            <Spinner />
            Issuing…
          </>
        ) : (
          "Issue key"
        )}
      </Button>
    </form>
  );
}
