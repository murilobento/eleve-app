"use client"

import {
  BarChart3,
  Zap,
  Users,
  ArrowRight,
  Database,
  Package,
  Crown,
  Layout,
  Palette
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useI18n } from "@/i18n/provider"

const mainIcons = [Package, Crown, Layout, Zap]
const secondaryIcons = [BarChart3, Palette, Users, Database]

export function FeaturesSection() {
  const { messages, t } = useI18n()

  return (
    <section id="features" className="py-24 sm:py-32 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <Badge variant="outline" className="mb-4">{t("landing.features.badge")}</Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            {t("landing.features.title")}
          </h2>
          <p className="text-lg text-muted-foreground">
            {t("landing.features.description")}
          </p>
        </div>

        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-8 xl:gap-16 mb-24">
          <div className="w-full h-[400px] bg-muted/20 border rounded-xl overflow-hidden shadow-sm" />
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                {t("landing.features.sectionOneTitle")}
              </h3>
              <p className="text-muted-foreground text-base text-pretty">
                {t("landing.features.sectionOneDescription")}
              </p>
            </div>

            <ul className="grid gap-4 sm:grid-cols-2">
              {messages.landing.features.mainFeatures.map((feature, index) => {
                const Icon = mainIcons[index]

                return (
                  <li key={index} className="group hover:bg-accent/5 flex items-start gap-3 p-2 rounded-lg transition-colors">
                    <div className="mt-0.5 flex shrink-0 items-center justify-center">
                      <Icon className="size-5 text-primary" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="text-foreground font-medium">{feature.title}</h3>
                      <p className="text-muted-foreground mt-1 text-sm">{feature.description}</p>
                    </div>
                  </li>
                )
              })}
            </ul>

            <div className="flex flex-col sm:flex-row gap-4 pe-4 pt-2">
              <Button size="lg" className="cursor-pointer">
                <a href="https://shadcnstore.com/templates" className='flex items-center'>
                  {t("landing.features.browseTemplates")}
                  <ArrowRight className="ms-2 size-4" aria-hidden="true" />
                </a>
              </Button>
              <Button size="lg" variant="outline" className="cursor-pointer">
                <a href="https://shadcnstore.com/blocks">
                  {t("landing.features.viewComponents")}
                </a>
              </Button>
            </div>
          </div>
        </div>

        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-8 xl:gap-16">
          <div className="space-y-6 order-2 lg:order-1">
            <div className="space-y-4">
              <h3 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                {t("landing.features.sectionTwoTitle")}
              </h3>
              <p className="text-muted-foreground text-base text-pretty">
                {t("landing.features.sectionTwoDescription")}
              </p>
            </div>

            <ul className="grid gap-4 sm:grid-cols-2">
              {messages.landing.features.secondaryFeatures.map((feature, index) => {
                const Icon = secondaryIcons[index]

                return (
                  <li key={index} className="group hover:bg-accent/5 flex items-start gap-3 p-2 rounded-lg transition-colors">
                    <div className="mt-0.5 flex shrink-0 items-center justify-center">
                      <Icon className="size-5 text-primary" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="text-foreground font-medium">{feature.title}</h3>
                      <p className="text-muted-foreground mt-1 text-sm">{feature.description}</p>
                    </div>
                  </li>
                )
              })}
            </ul>

            <div className="flex flex-col sm:flex-row gap-4 pe-4 pt-2">
              <Button size="lg" className="cursor-pointer">
                <a href="#" className='flex items-center'>
                  {t("landing.features.viewDocumentation")}
                  <ArrowRight className="ms-2 size-4" aria-hidden="true" />
                </a>
              </Button>
              <Button size="lg" variant="outline" className="cursor-pointer">
                <a href="https://github.com/silicondeck/shadcn-dashboard-landing-template" target="_blank" rel="noopener noreferrer">
                  {t("landing.features.githubRepository")}
                </a>
              </Button>
            </div>
          </div>

          <div className="w-full h-[400px] bg-muted/20 border rounded-xl overflow-hidden shadow-sm order-1 lg:order-2" />
        </div>
      </div>
    </section>
  )
}
