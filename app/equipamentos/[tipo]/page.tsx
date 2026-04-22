import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicSiteFooter, PublicSiteTopbar } from "../../components/public-site-chrome";
import {
  getPublicCompany,
  getPublicEquipmentCategories,
  getPublicEquipmentCategoryBySlug,
  listEquipmentByCategory,
} from "@/lib/public-site-data";
import {
  buildBreadcrumbJsonLd,
  buildItemListJsonLd,
  buildLocalBusinessJsonLd,
  compactDescription,
  getPublicCompanyName,
  getPublicSiteBaseUrl,
  getPublicSiteUrl,
} from "@/lib/public-site-seo";

type EquipmentCategoryPageProps = {
  params: Promise<{ tipo: string }>;
};

function buildWhatsAppUrl(phone: string, message = "Olá! Gostaria de solicitar um orçamento.") {
  const digits = phone.replace(/\D/g, "");
  const normalizedPhone = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}

export async function generateStaticParams() {
  const categories = await getPublicEquipmentCategories();
  return categories.map((category) => ({ tipo: category.slug }));
}

export async function generateMetadata({ params }: EquipmentCategoryPageProps): Promise<Metadata> {
  const { tipo } = await params;
  const [company, category] = await Promise.all([
    getPublicCompany(),
    getPublicEquipmentCategoryBySlug(tipo),
  ]);

  if (!category) {
    return {};
  }

  const title = `${category.title} | Equipamentos | ${getPublicCompanyName(company)}`;
  const description = compactDescription(category.description);
  const path = `/equipamentos/${category.slug}`;

  return {
    metadataBase: new URL(getPublicSiteBaseUrl()),
    title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title,
      description,
      url: getPublicSiteUrl(path),
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

export default async function EquipmentCategoryPage({ params }: EquipmentCategoryPageProps) {
  const { tipo } = await params;
  const [company, category, equipment] = await Promise.all([
    getPublicCompany(),
    getPublicEquipmentCategoryBySlug(tipo),
    listEquipmentByCategory(tipo),
  ]);

  if (!category) {
    notFound();
  }

  const whatsAppUrl = buildWhatsAppUrl(company?.phone?.trim() || "(11) 4000-1234");
  const categoryUrl = getPublicSiteUrl(`/equipamentos/${category.slug}`);
  const jsonLd = [
    buildLocalBusinessJsonLd(company),
    buildBreadcrumbJsonLd([
      { name: "Início", url: getPublicSiteUrl("/") },
      { name: "Equipamentos", url: getPublicSiteUrl("/equipamentos") },
      { name: category.title, url: categoryUrl },
    ]),
    buildItemListJsonLd(
      equipment.map((item) => ({
        name: item.name,
        url: getPublicSiteUrl(`/equipamentos/${item.slug}`),
      })),
      `/equipamentos/${category.slug}#items`,
      `Equipamentos - ${category.title}`,
    ),
  ];

  return (
    <>
      <PublicSiteTopbar whatsAppUrl={whatsAppUrl} />
      <main className="min-h-screen bg-white pb-24 pt-36 text-gray-950 dark:bg-[#121212] dark:text-white">
        <section className="mx-auto max-w-6xl px-4 md:px-6">
          <a
            href="/equipamentos"
            className="text-xs font-black uppercase tracking-[0.22em] text-amber-700 dark:text-[#FCD34D]"
          >
            Equipamentos
          </a>
          <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] md:text-6xl">{category.title}</h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-gray-700 dark:text-gray-300">{category.description}</p>
        </section>

        <section className="mx-auto mt-14 grid max-w-6xl gap-6 px-4 md:grid-cols-2 md:px-6">
          {equipment.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-black/5 bg-gray-50 p-7 dark:border-white/10 dark:bg-[#1A1A1A]"
            >
              <p className="text-xs font-black uppercase tracking-[0.24em] text-gray-500 dark:text-gray-400">
                {item.capacity}
              </p>
              <h2 className="mt-3 text-2xl font-black tracking-[-0.03em]">{item.name}</h2>
              <p className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                {item.model}
              </p>
              <p className="mt-3 text-sm leading-7 text-gray-700 dark:text-gray-300">{item.technicalInfo}</p>
              <a
                href={`/equipamentos/${item.slug}`}
                className="mt-6 inline-flex rounded-sm bg-[#FCD34D] px-5 py-3 text-xs font-bold uppercase tracking-[0.18em] text-gray-950 transition-colors hover:bg-[#F59E0B]"
              >
                Ver página
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
