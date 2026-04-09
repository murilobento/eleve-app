"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFormValidationToast } from "@/hooks/use-form-validation-toast";
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
  const passwordInputRef = React.useRef<HTMLInputElement | null>(null);
  const lockScreenSchema = React.useMemo(
    () =>
      z.object({
        password: z.string().trim().min(1, t("auth.lockScreen.invalidPassword")),
      }),
    [t],
  );
  const form = useForm<z.infer<typeof lockScreenSchema>>({
    resolver: zodResolver(lockScreenSchema),
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: {
      password: "",
    },
  });
  const watchedPassword = form.watch("password");
  const { formClassName, handleInvalidSubmit } = useFormValidationToast({
    form,
    title: t("common.validationToastTitle"),
    fallback: t("auth.lockScreen.invalidPassword"),
  });
  const passwordField = form.register("password");

  React.useEffect(() => {
    if (!open) {
      form.reset({ password: "" });
      if (passwordInputRef.current) {
        passwordInputRef.current.value = "";
      }
      return;
    }

    // Some browsers/password managers try to restore password fields on reload.
    // Clear the DOM value again after mount/open so the lockscreen always starts blank.
    const clearRestoredPassword = () => {
      form.reset({ password: "" });
      if (passwordInputRef.current) {
        passwordInputRef.current.value = "";
      }
    };

    clearRestoredPassword();
    const timeoutId = window.setTimeout(clearRestoredPassword, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [form, open]);

  if (!open) {
    return null;
  }

  const remainingAttempts = Math.max(0, 3 - failedAttempts);

  const handleSubmit = async (values: z.infer<typeof lockScreenSchema>) => {
    try {
      await onUnlock(values.password);
      form.reset({ password: "" });
    } catch (unlockError) {
      const fallback = t("auth.lockScreen.invalidPassword");
      const message = unlockError instanceof Error && unlockError.message ? unlockError.message : fallback;
      form.setError("password", { message });
      toast.error(message);
      return;
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
            <form
              onSubmit={form.handleSubmit(handleSubmit, handleInvalidSubmit)}
              className={`space-y-4 ${formClassName}`}
              autoComplete="off"
            >
              <div className="space-y-2">
                <Label htmlFor="lockscreen-password">{t("auth.password")}</Label>
                <Input
                  id="lockscreen-password"
                  type="password"
                  {...passwordField}
                  ref={(element) => {
                    passwordField.ref(element);
                    passwordInputRef.current = element;
                  }}
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
                <Button type="submit" disabled={isSubmitting || !watchedPassword?.trim()} className="cursor-pointer">
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
