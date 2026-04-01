"use client"

import { SignupForm2 } from "./components/signup-form-2"
import { Logo } from "@/components/logo"
import { LanguageSwitcher } from "@/components/language-switcher"
import { useI18n, useLocale } from "@/i18n/provider"
import { getAppUrl } from "@/lib/utils"

export default function SignUp2Page() {
  const locale = useLocale()
  const { t } = useI18n()

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex items-center justify-between gap-4">
          <a href={getAppUrl("/landing", locale)} className="flex items-center gap-2 font-medium">
            <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-md">
              <Logo size={24} />
            </div>
            ShadcnStore
          </a>
          <LanguageSwitcher />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-md">
            <SignupForm2 />
          </div>
        </div>
      </div>
      <div className="bg-muted relative hidden lg:block">
        <img
          src="https://ui.shadcn.com/placeholder.svg"
          alt={t("auth.brandAlt")}
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.95] dark:invert"
        />
      </div>
    </div>
  )
}
