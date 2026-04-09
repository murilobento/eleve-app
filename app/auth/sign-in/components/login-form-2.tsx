"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useFormValidationToast } from "@/hooks/use-form-validation-toast"
import { signIn } from "@/lib/auth-client"
import { useI18n, useLocale } from "@/i18n/provider"
import { getAppUrl } from "@/lib/utils"
import { markLockscreenResetOnNextLogin, resetLockscreenStorage } from "@/lib/lockscreen"

export function LoginForm2({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)
  const { t } = useI18n()
  const locale = useLocale()
  const loginSchema = React.useMemo(() => z.object({
    email: z.string().trim().email(locale === "pt-BR" ? "Informe um e-mail válido." : "Enter a valid email address."),
    password: z.string().min(1, locale === "pt-BR" ? "Informe sua senha." : "Enter your password."),
  }), [locale])
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: {
      email: "",
      password: "",
    },
  })
  const { formClassName, handleInvalidSubmit } = useFormValidationToast({
    form,
    title: t("common.validationToastTitle"),
    fallback: t("common.validationToastFallback"),
  })

  React.useEffect(() => {
    resetLockscreenStorage()
  }, [])

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

  const handleSubmit = async (values: z.infer<typeof loginSchema>) => {
    setLoading(true)
    
    const { error } = await signIn.email({
      email: values.email,
      password: values.password,
      callbackURL: getAppUrl("/dashboard", locale)
    }, {
      onSuccess: () => {
        markLockscreenResetOnNextLogin()
        resetLockscreenStorage()
        router.push(getAppUrl("/dashboard", locale))
      },
      onError: (ctx) => {
        toast.error(
          getLoginErrorMessage(
            ctx.error.message,
            typeof ctx.error.status === "number" ? ctx.error.status : undefined,
          ),
        )
        setLoading(false)
      }
    })
    
    if (error) {
       toast.error(
        getLoginErrorMessage(
          error.message,
          typeof error.status === "number" ? error.status : undefined,
        ),
      )
       setLoading(false)
    }
  }

  const {
    register,
    formState: { errors },
  } = form

  return (
    <form
      className={cn("flex flex-col gap-6", formClassName, className)}
      onSubmit={form.handleSubmit(handleSubmit, handleInvalidSubmit)}
      {...props}
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">{t("auth.loginTitle")}</h1>
        <p className="text-muted-foreground text-sm text-balance">
          {t("auth.loginDescription")}
        </p>
      </div>
      <div className="grid gap-6">
        <div className="grid gap-3">
          <Label htmlFor="email">{t("auth.email")}</Label>
          <Input 
            id="email" 
            type="email" 
            placeholder={t("auth.emailPlaceholder")} 
            aria-invalid={!!errors.email}
            {...register("email")}
          />
        </div>
        <div className="grid gap-3">
          <div className="flex items-center">
            <Label htmlFor="password">{t("auth.password")}</Label>
          </div>
          <Input 
            id="password" 
            type="password" 
            aria-invalid={!!errors.password}
            {...register("password")}
          />
        </div>
        <Button type="submit" className="w-full cursor-pointer" disabled={loading}>
          {loading ? t("auth.loginLoading") : t("auth.loginButton")}
        </Button>
      </div>
    </form>
  )
}
