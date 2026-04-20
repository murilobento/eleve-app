"use client";

import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/i18n/provider";
import { getAppUrl } from "@/lib/utils";

const sections = [
  {
    title: "Empresa",
    description: "Nome, telefone, email e endereco exibidos no rodape e pontos institucionais.",
    path: "/public-site/company",
  },
  {
    title: "Servicos",
    description: "Cards de servicos exibidos na vitrine principal da landing.",
    path: "/public-site/services",
  },
  {
    title: "Equipamentos",
    description: "Itens em destaque da frota mostrados no carrossel do site.",
    path: "/public-site/equipment",
  },
  {
    title: "Depoimentos",
    description: "Depoimentos de clientes publicados na secao social proof.",
    path: "/public-site/testimonials",
  },
];

export default function PublicSitePage() {
  const locale = useLocale();

  return (
    <>
      <div className="px-4 lg:px-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Site publico</h1>
          <p className="text-sm text-muted-foreground">
            Escolha a secao para gerenciar o conteudo da landing de forma separada.
          </p>
        </div>
      </div>

      <div className="@container/main mt-2 grid gap-4 px-4 lg:mt-4 lg:grid-cols-2 lg:px-6">
        {sections.map((section) => (
          <Link key={section.path} href={getAppUrl(section.path, locale)}>
            <Card className="h-full cursor-pointer transition-colors hover:bg-accent/40">
              <CardHeader>
                <CardTitle>{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-sm font-medium text-primary">Abrir secao</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
