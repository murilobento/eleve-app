"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n/provider";

type IdleLockScreenProps = {
  open: boolean;
  userEmail?: string;
  isSubmitting: boolean;
  failedAttempts: number;
  onUnlock: (password: string) => Promise<void>;
  onSignOut: () => void;
};

export function IdleLockScreen({
  open,
  userEmail,
  isSubmitting,
  failedAttempts,
  onUnlock,
  onSignOut,
}: IdleLockScreenProps) {
  const { t } = useI18n();
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const passwordInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (!open) {
      setPassword("");
      setError(null);
      if (passwordInputRef.current) {
        passwordInputRef.current.value = "";
      }
      return;
    }

    // Some browsers/password managers try to restore password fields on reload.
    // Clear the DOM value again after mount/open so the lockscreen always starts blank.
    const clearRestoredPassword = () => {
      setPassword("");
      if (passwordInputRef.current) {
        passwordInputRef.current.value = "";
      }
    };

    clearRestoredPassword();
    const timeoutId = window.setTimeout(clearRestoredPassword, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [open]);

  if (!open) {
    return null;
  }

  const remainingAttempts = Math.max(0, 3 - failedAttempts);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    try {
      await onUnlock(password);
      setPassword("");
    } catch (unlockError) {
      const fallback = t("auth.lockScreen.invalidPassword");
      if (unlockError instanceof Error && unlockError.message) {
        setError(unlockError.message);
        return;
      }
      setError(fallback);
    }
  };

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-2xl" />
      <div className="relative z-[101] flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader className="space-y-2">
            <CardTitle>{t("auth.lockScreen.title")}</CardTitle>
            <CardDescription>{t("auth.lockScreen.description")}</CardDescription>
            {userEmail ? (
              <p className="text-xs text-muted-foreground">{userEmail}</p>
            ) : null}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
              {error ? (
                <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">{error}</div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="lockscreen-password">{t("auth.password")}</Label>
                <Input
                  id="lockscreen-password"
                  ref={passwordInputRef}
                  name="lockscreen-passcode"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  autoFocus
                  autoComplete="new-password"
                  data-1p-ignore="true"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck={false}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {t("auth.lockScreen.attemptsRemaining", { count: remainingAttempts })}
              </p>
              <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="outline" onClick={onSignOut} className="cursor-pointer">
                  {t("auth.lockScreen.signOut")}
                </Button>
                <Button type="submit" disabled={isSubmitting || !password.trim()} className="cursor-pointer">
                  {isSubmitting ? t("auth.loginLoading") : t("auth.lockScreen.unlock")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
