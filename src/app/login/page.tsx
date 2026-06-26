"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";

import { Brand } from "@/components/layout/brand";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

const DEFAULT_LOCK_SECONDS = 60;

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Bumped on every failed attempt so the error message remounts and replays
  // its shake animation even when the message text is unchanged.
  const [errorNonce, setErrorNonce] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [lockSeconds, setLockSeconds] = useState(0);

  const locked = lockSeconds > 0;

  // Tick the lockout countdown down to zero, one second at a time.
  useEffect(() => {
    if (lockSeconds <= 0) return;
    const timer = setTimeout(() => {
      setLockSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => clearTimeout(timer);
  }, [lockSeconds]);

  function fail(message: string) {
    setError(message);
    setErrorNonce((nonce) => nonce + 1);
    setSubmitting(false);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting || locked) return;

    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    }).catch(() => null);

    if (!res) {
      fail("Network error. Please check your connection and try again.");
      return;
    }

    if (res.ok) {
      router.replace("/");
      router.refresh();
      return; // keep the button in its loading state through navigation
    }

    const data = await res.json().catch(() => null);

    if (res.status === 429) {
      const retryAfter =
        Number(data?.error?.details?.retryAfter) ||
        Number(res.headers.get("Retry-After")) ||
        DEFAULT_LOCK_SECONDS;
      setLockSeconds(retryAfter);
    }

    fail(data?.error?.message ?? "Login failed. Please try again.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:ease-out">
        <CardHeader className="items-center gap-3 text-center">
          <Brand />
          <div className="space-y-1">
            <CardTitle>Sign in</CardTitle>
            <CardDescription>
              Enter your administrator credentials to continue.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium">
                Username
              </label>
              <Input
                id="username"
                name="username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={locked}
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={locked}
                required
              />
            </div>

            {error && (
              <p
                key={errorNonce}
                role="alert"
                className="text-sm text-destructive motion-safe:animate-shake"
              >
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={submitting || locked}
              className="w-full transition-transform active:scale-[0.98]"
            >
              {locked ? (
                <>
                  <Ban className="size-4" />
                  <span className="sr-only">Sign in temporarily locked</span>
                </>
              ) : submitting ? (
                <>
                  <Spinner />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
