"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signIn } from "@/lib/auth-client"
import { useI18n, useLocale } from "@/i18n/provider"
import { getAppUrl } from "@/lib/utils"

export function LoginForm2({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter()
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const { t } = useI18n()
  const locale = useLocale()

  const getLoginErrorMessage = React.useCallback((rawMessage?: string | null, status?: number) => {
    const normalizedMessage = rawMessage?.toLowerCase() ?? ""

    if (
      status === 403 ||
      normalizedMessage.includes("inactive") ||
      normalizedMessage.includes("inativ")
    ) {
      return t("auth.inactiveUser")
    }

    if (
      normalizedMessage.includes("invalid") ||
      normalizedMessage.includes("wrong") ||
      normalizedMessage.includes("credential") ||
      normalizedMessage.includes("email or password") ||
      normalizedMessage.includes("senha") ||
      normalizedMessage.includes("credencial")
    ) {
      return t("auth.invalidCredentials")
    }

    return rawMessage || t("auth.failedSignIn")
  }, [t])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const { error } = await signIn.email({
      email,
      password,
      callbackURL: getAppUrl("/dashboard", locale)
    }, {
      onSuccess: () => {
        router.push(getAppUrl("/dashboard", locale))
      },
      onError: (ctx) => {
        setError(
          getLoginErrorMessage(
            ctx.error.message,
            typeof ctx.error.status === "number" ? ctx.error.status : undefined,
          ),
        )
        setLoading(false)
      }
    })
    
    if (error) {
       setError(
        getLoginErrorMessage(
          error.message,
          typeof error.status === "number" ? error.status : undefined,
        ),
      )
       setLoading(false)
    }
  }

  return (
    <form className={cn("flex flex-col gap-6", className)} onSubmit={handleSubmit} {...props}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">{t("auth.loginTitle")}</h1>
        <p className="text-muted-foreground text-sm text-balance">
          {t("auth.loginDescription")}
        </p>
      </div>
      <div className="grid gap-6">
        {error && (
          <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
            {error}
          </div>
        )}
        <div className="grid gap-3">
          <Label htmlFor="email">{t("auth.email")}</Label>
          <Input 
            id="email" 
            type="email" 
            placeholder={t("auth.emailPlaceholder")} 
            required 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="grid gap-3">
          <div className="flex items-center">
            <Label htmlFor="password">{t("auth.password")}</Label>
          </div>
          <Input 
            id="password" 
            type="password" 
            required 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full cursor-pointer" disabled={loading}>
          {loading ? t("auth.loginLoading") : t("auth.loginButton")}
        </Button>
      </div>
      <div className="text-center text-sm">
        {t("auth.noAccount")}{" "}
        <Link href={getAppUrl("/auth/sign-up", locale)} className="underline underline-offset-4">
          {t("common.signUp")}
        </Link>
      </div>
    </form>
  )
}
