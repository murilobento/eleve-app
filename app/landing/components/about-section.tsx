"use client"

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { CardDecorator } from '@/components/ui/card-decorator'
import { Github, Code, Palette, Layout, Crown } from 'lucide-react'
import { useI18n } from "@/i18n/provider"

const valueIcons = [Code, Palette, Layout, Crown]

export function AboutSection() {
  const { messages, t } = useI18n()

  return (
    <section id="about" className="py-24 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center mb-16">
          <Badge variant="outline" className="mb-4">
            {t("landing.about.badge")}
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">
            {t("landing.about.title")}
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            {t("landing.about.description")}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 xl:grid-cols-4 mb-12">
          {messages.landing.about.values.map((value, index) => {
            const Icon = valueIcons[index]

            return (
              <Card key={index} className='group shadow-xs py-2'>
                <CardContent className='p-8'>
                  <div className='flex flex-col items-center text-center'>
                    <CardDecorator>
                      <Icon className='h-6 w-6' aria-hidden />
                    </CardDecorator>
                    <h3 className='mt-6 font-medium text-balance'>{value.title}</h3>
                    <p className='text-muted-foreground mt-3 text-sm'>{value.description}</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="mt-16 text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="text-muted-foreground">{t("landing.about.madeWithLove")}</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="cursor-pointer" asChild>
              <a href="https://github.com/silicondeck/shadcn-dashboard-landing-template" target="_blank" rel="noopener noreferrer">
                <Github className="mr-2 h-4 w-4" />
                {t("landing.about.starGithub")}
              </a>
            </Button>
            <Button size="lg" variant="outline" className="cursor-pointer" asChild>
              <a href="https://discord.com/invite/XEQhPc9a6p" target="_blank" rel="noopener noreferrer">
                {t("landing.about.joinDiscord")}
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
