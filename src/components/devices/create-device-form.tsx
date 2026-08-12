"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { CopyField } from "@/components/ui/copy-field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

interface RegisteredDevice {
  id: string;
  name: string;
}

export function CreateDeviceForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [carrier, setCarrier] = useState("");
  const [simNumber, setSimNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registered, setRegistered] = useState<RegisteredDevice | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, carrier, simNumber }),
    }).catch(() => null);

    if (!res) {
      setError("Network error. Check your connection and try again.");
      setSubmitting(false);
      return;
    }

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      setError(data?.error?.message ?? "Could not register the device.");
      setSubmitting(false);
      return;
    }

    setRegistered({ id: data.id, name: data.name });
    setName("");
    setCarrier("");
    setSimNumber("");
    setSubmitting(false);
    router.refresh();
  }

  if (registered) {
    return (
      <div className="space-y-3" data-live-refresh-pause="true">
        <p className="text-sm">
          <span className="font-medium">{registered.name}</span> is registered.
          Paste this Device ID into the sender app.
        </p>

        <CopyField value={registered.id} label="Device ID" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setRegistered(null)}
        >
          Done — register another
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4"
      data-live-refresh-pause={
        submitting || name !== "" || carrier !== "" || simNumber !== ""
          ? "true"
          : undefined
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <label htmlFor="device-name" className="text-sm font-medium">
            Name
          </label>
          <Input
            id="device-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Honor"
            maxLength={60}
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="device-carrier" className="text-sm font-medium">
            Carrier
          </label>
          <Input
            id="device-carrier"
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
            placeholder="TM"
            maxLength={30}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="device-sim" className="text-sm font-medium">
            SIM number
          </label>
          <Input
            id="device-sim"
            value={simNumber}
            onChange={(e) => setSimNumber(e.target.value)}
            placeholder="09XXXXXXXXX"
            maxLength={20}
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={submitting || name.trim() === ""}>
        {submitting ? (
          <>
            <Spinner />
            Registering…
          </>
        ) : (
          "Register device"
        )}
      </Button>
    </form>
  );
}
