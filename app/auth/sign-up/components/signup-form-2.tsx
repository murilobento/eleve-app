"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { signUp } from "@/lib/auth-client"
import { useI18n, useLocale } from "@/i18n/provider"
import { getAppUrl } from "@/lib/utils"

export function SignupForm2({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter()
  const [firstName, setFirstName] = React.useState("")
  const [lastName, setLastName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const { t } = useI18n()
  const locale = useLocale()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const { error } = await signUp.email({
      email,
      password,
      name: `${firstName} ${lastName}`.trim(),
    }, {
      onSuccess: () => {
        router.push(getAppUrl("/dashboard", locale))
      },
      onError: (ctx) => {
        setError(ctx.error.message || t("auth.failedSignUp"))
        setLoading(false)
      }
    })
    
    if (error) {
       setError(error.message)
       setLoading(false)
    }
  }

  return (
    <form className={cn("flex flex-col gap-6", className)} onSubmit={handleSubmit} {...props}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">{t("auth.signupTitle")}</h1>
        <p className="text-muted-foreground text-sm text-balance">
          {t("auth.signupDescription")}
        </p>
      </div>
      <div className="grid gap-6">
        {error && (
          <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
            {error}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-3">
            <Label htmlFor="firstName">{t("auth.firstName")}</Label>
            <Input id="firstName" placeholder={t("auth.firstNamePlaceholder")} required value={firstName} onChange={e => setFirstName(e.target.value)} />
          </div>
          <div className="grid gap-3">
            <Label htmlFor="lastName">{t("auth.lastName")}</Label>
            <Input id="lastName" placeholder={t("auth.lastNamePlaceholder")} required value={lastName} onChange={e => setLastName(e.target.value)} />
          </div>
        </div>
        <div className="grid gap-3">
          <Label htmlFor="email">{t("auth.email")}</Label>
          <Input id="email" type="email" placeholder={t("auth.emailPlaceholder")} required value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div className="grid gap-3">
          <Label htmlFor="password">{t("auth.password")}</Label>
          <Input id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="terms" required />
          <Label htmlFor="terms" className="text-sm">
            {t("auth.agreePrefix")}{" "}
            <a href="#" className="underline underline-offset-4 hover:text-primary">
              {t("auth.terms")}
            </a>{" "}
            {t("auth.and")}{" "}
            <a href="#" className="underline underline-offset-4 hover:text-primary">
              {t("auth.privacy")}
            </a>
          </Label>
        </div>
        <Button type="submit" className="w-full cursor-pointer" disabled={loading}>
          {loading ? t("auth.signupLoading") : t("auth.signupButton")}
        </Button>
      </div>
      <div className="text-center text-sm">
        {t("auth.alreadyHaveAccount")}{" "}
        <Link href={getAppUrl("/auth/sign-in", locale)} className="underline underline-offset-4">
          {t("common.signIn")}
        </Link>
      </div>
    </form>
  )
}
