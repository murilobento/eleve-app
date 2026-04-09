"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useFormValidationToast } from "@/hooks/use-form-validation-toast"
import { signUp } from "@/lib/auth-client"
import { useI18n, useLocale } from "@/i18n/provider"
import { getAppUrl } from "@/lib/utils"

export function SignupForm2({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)
  const { t } = useI18n()
  const locale = useLocale()
  const signupSchema = React.useMemo(() => z.object({
    firstName: z.string().trim().min(2, locale === "pt-BR" ? "Informe seu nome." : "Enter your first name."),
    lastName: z.string().trim().min(2, locale === "pt-BR" ? "Informe seu sobrenome." : "Enter your last name."),
    email: z.string().trim().email(locale === "pt-BR" ? "Informe um e-mail válido." : "Enter a valid email address."),
    password: z.string().min(8, locale === "pt-BR" ? "A senha deve ter pelo menos 8 caracteres." : "Password must be at least 8 characters."),
    terms: z.boolean().refine(
      (value) => value,
      locale === "pt-BR"
        ? "Você precisa aceitar os termos e a política de privacidade."
        : "You must accept the terms and privacy policy.",
    ),
  }), [locale])
  const form = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      terms: false,
    },
  })
  const { formClassName, handleInvalidSubmit } = useFormValidationToast({
    form,
    title: t("common.validationToastTitle"),
    fallback: t("common.validationToastFallback"),
  })

  const handleSubmit = async (values: z.infer<typeof signupSchema>) => {
    setLoading(true)
    
    const { error } = await signUp.email({
      email: values.email,
      password: values.password,
      name: `${values.firstName} ${values.lastName}`.trim(),
    }, {
      onSuccess: () => {
        router.push(getAppUrl("/dashboard", locale))
      },
      onError: (ctx) => {
        toast.error(ctx.error.message || t("auth.failedSignUp"))
        setLoading(false)
      }
    })
    
    if (error) {
       toast.error(error.message)
       setLoading(false)
    }
  }

  const {
    control,
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
        <h1 className="text-2xl font-bold">{t("auth.signupTitle")}</h1>
        <p className="text-muted-foreground text-sm text-balance">
          {t("auth.signupDescription")}
        </p>
      </div>
      <div className="grid gap-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-3">
            <Label htmlFor="firstName">{t("auth.firstName")}</Label>
            <Input id="firstName" placeholder={t("auth.firstNamePlaceholder")} aria-invalid={!!errors.firstName} {...register("firstName")} />
          </div>
          <div className="grid gap-3">
            <Label htmlFor="lastName">{t("auth.lastName")}</Label>
            <Input id="lastName" placeholder={t("auth.lastNamePlaceholder")} aria-invalid={!!errors.lastName} {...register("lastName")} />
          </div>
        </div>
        <div className="grid gap-3">
          <Label htmlFor="email">{t("auth.email")}</Label>
          <Input id="email" type="email" placeholder={t("auth.emailPlaceholder")} aria-invalid={!!errors.email} {...register("email")} />
        </div>
        <div className="grid gap-3">
          <Label htmlFor="password">{t("auth.password")}</Label>
          <Input id="password" type="password" aria-invalid={!!errors.password} {...register("password")} />
        </div>
        <div className="flex items-center space-x-2">
          <Controller
            control={control}
            name="terms"
            render={({ field }) => (
              <Checkbox
                id="terms"
                checked={field.value}
                aria-invalid={!!errors.terms}
                onCheckedChange={(checked) => field.onChange(Boolean(checked))}
              />
            )}
          />
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
