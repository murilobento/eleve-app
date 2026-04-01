import { Heart } from "lucide-react"
import { useI18n } from "@/i18n/provider"


export function SiteFooter() {
  const { t } = useI18n()

  return (
    <footer className="border-t bg-background">
      <div className="px-4 py-6 lg:px-6">
        <div className="flex flex-col items-center justify-center space-y-2 text-center">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <span>{t("dashboard.madeWith")}</span>
            <Heart className="h-4 w-4 fill-red-500 text-red-500" />
            <span>{t("dashboard.by")}</span>
            <a
              href="https://shadcnstore.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground hover:text-primary transition-colors"
            >
              ShadcnStore Team
            </a>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("dashboard.footerDescription")}
          </p>
        </div>
      </div>
    </footer>
  )
}
