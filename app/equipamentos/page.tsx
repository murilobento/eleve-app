import type { Metadata } from "next";

import { PublicSiteFooter, PublicSiteTopbar } from "../components/public-site-chrome";
import {
  getPublicCompany,
  getPublicEquipmentCategories,
  listEquipmentByCategory,
} from "@/lib/public-site-data";
import {
  buildItemListJsonLd,
  buildLocalBusinessJsonLd,
  compactDescription,
  getPublicCompanyName,
  getPublicSiteBaseUrl,
  getPublicSiteUrl,
} from "@/lib/public-site-seo";

function buildWhatsAppUrl(phone: string, message = "Olá! Gostaria de solicitar um orçamento.") {
  const digits = phone.replace(/\D/g, "");
  const normalizedPhone = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}

export async function generateMetadata(): Promise<Metadata> {
  const company = await getPublicCompany();
  const title = `Equipamentos | ${getPublicCompanyName(company)}`;
  const description = compactDescription(
    "Catálogo de equipamentos da Eleve para elevação, movimentação e transporte especial.",
  );

  return {
    metadataBase: new URL(getPublicSiteBaseUrl()),
    title,
    description,
    alternates: {
      canonical: "/equipamentos",
    },
    openGraph: {
      title,
      description,
      url: getPublicSiteUrl("/equipamentos"),
      siteName: getPublicCompanyName(company),
      locale: "pt_BR",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function EquipmentHubPage() {
  const [company, categories] = await Promise.all([
    getPublicCompany(),
    getPublicEquipmentCategories(),
  ]);

  const categoriesWithCounts = await Promise.all(
    categories.map(async (category) => ({
      ...category,
      equipment: await listEquipmentByCategory(category.slug),
    })),
  );

  const whatsAppUrl = buildWhatsAppUrl(company?.phone?.trim() || "(11) 4000-1234");
  const jsonLd = [
    buildLocalBusinessJsonLd(company),
    buildItemListJsonLd(
      categoriesWithCounts.map((category) => ({
        name: category.title,
        url: getPublicSiteUrl(`/equipamentos/${category.slug}`),
      })),
      "/equipamentos#categories",
      "Categorias de equipamentos",
    ),
  ];

  return (
    <>
      <PublicSiteTopbar whatsAppUrl={whatsAppUrl} />
      <main className="min-h-screen bg-white pb-24 pt-36 text-gray-950 dark:bg-[#121212] dark:text-white">
        <section className="mx-auto max-w-6xl px-4 md:px-6">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-700 dark:text-[#FCD34D]">
            Frota especializada
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] md:text-6xl">Equipamentos</h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-gray-700 dark:text-gray-300">
            Veja as categorias de equipamentos disponíveis para operações de elevação, movimentação e transporte técnico.
          </p>
        </section>

        <section className="mx-auto mt-14 grid max-w-6xl gap-6 px-4 md:grid-cols-2 md:px-6">
          {categoriesWithCounts.map((category) => (
            <article
              key={category.slug}
              className="rounded-2xl border border-black/5 bg-gray-50 p-7 dark:border-white/10 dark:bg-[#1A1A1A]"
            >
              <p className="text-xs font-black uppercase tracking-[0.24em] text-gray-500 dark:text-gray-400">
                Categoria
              </p>
              <h2 className="mt-3 text-2xl font-black tracking-[-0.03em]">{category.title}</h2>
              <p className="mt-3 text-sm leading-7 text-gray-700 dark:text-gray-300">{category.description}</p>
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">
                {category.equipment.length} equipamentos
              </p>
              <a
                href={`/equipamentos/${category.slug}`}
                className="mt-6 inline-flex rounded-sm bg-[#FCD34D] px-5 py-3 text-xs font-bold uppercase tracking-[0.18em] text-gray-950 transition-colors hover:bg-[#F59E0B]"
              >
                Ver categoria
              </a>
            </article>
          ))}
        </section>
      </main>
      <PublicSiteFooter company={company} whatsAppUrl={whatsAppUrl} />
      {jsonLd.map((item, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}
    </>
  );
}
