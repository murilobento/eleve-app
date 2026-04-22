import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getPublicCompany,
  getPublicServiceBySlug,
  listPublicEquipment,
  listPublicServices,
} from "@/lib/public-site-data";
import {
  PUBLIC_SITE_REVALIDATE_SECONDS,
  buildBreadcrumbJsonLd,
  buildLocalBusinessJsonLd,
  compactDescription,
  getPublicCompanyName,
  getPublicSiteBaseUrl,
  getPublicSiteUrl,
  getServiceSeoDescription,
  getServiceSeoTitle,
} from "@/lib/public-site-seo";

type ServicePageProps = {
  params: Promise<{ slug: string }>;
};

export const revalidate = PUBLIC_SITE_REVALIDATE_SECONDS;

export async function generateStaticParams() {
  const services = await listPublicServices(true);
  return services.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({ params }: ServicePageProps): Promise<Metadata> {
  const { slug } = await params;
  const [service, company] = await Promise.all([
    getPublicServiceBySlug(slug, true),
    getPublicCompany(),
  ]);

  if (!service) {
    return {};
  }

  const title = getServiceSeoTitle(service, company);
  const description = compactDescription(getServiceSeoDescription(service));
  const path = `/servicos/${service.slug}`;

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
      type: "article",
      images: [{ url: service.imageUrl, alt: service.imageAlt || service.title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [service.imageUrl],
    },
  };
}

function renderParagraphs(content: string) {
  return content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => (
      <p key={paragraph} className="text-base leading-8 text-gray-700 dark:text-gray-300">
        {paragraph}
      </p>
    ));
}

export default async function ServicePage({ params }: ServicePageProps) {
  const { slug } = await params;
  const [service, company, services, equipment] = await Promise.all([
    getPublicServiceBySlug(slug, true),
    getPublicCompany(),
    listPublicServices(true),
    listPublicEquipment(true),
  ]);

  if (!service) {
    notFound();
  }

  const description = compactDescription(getServiceSeoDescription(service));
  const content = service.pageContent?.trim() || service.description?.trim() || description;
  const companyName = getPublicCompanyName(company);
  const serviceUrl = getPublicSiteUrl(`/servicos/${service.slug}`);
  const relatedServices = services.filter((item) => item.slug !== service.slug).slice(0, 3);
  const relatedEquipment = equipment.slice(0, 3);
  const jsonLd = [
    buildLocalBusinessJsonLd(company),
    buildBreadcrumbJsonLd([
      { name: "Inicio", url: getPublicSiteUrl("/") },
      { name: "Servicos", url: getPublicSiteUrl("/#servicos") },
      { name: service.title, url: serviceUrl },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "Service",
      "@id": `${serviceUrl}#service`,
      name: service.title,
      description,
      image: service.imageUrl,
      url: serviceUrl,
      provider: {
        "@id": getPublicSiteUrl("/#localbusiness"),
        name: companyName,
      },
      areaServed: company?.serviceAreas?.length
        ? company.serviceAreas.map((area) => ({ "@type": "Place", name: area }))
        : undefined,
    },
  ];

  return (
    <main className="min-h-screen bg-white text-gray-950 dark:bg-[#0A0A0A] dark:text-white">
      <section className="relative overflow-hidden bg-gray-950 px-4 py-24 text-white md:px-6 md:py-32">
        <img
          src={service.imageUrl}
          alt={service.imageAlt || service.title}
          className="absolute inset-0 h-full w-full object-cover opacity-45"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black via-black/75 to-black/35" />
        <div className="relative mx-auto max-w-5xl">
          <a href="/" className="text-xs font-bold uppercase tracking-[0.25em] text-[#FCD34D]">
            Eleve Locacoes
          </a>
          <p className="mt-8 inline-flex rounded-sm bg-[#FCD34D] px-3 py-1 text-xs font-black uppercase tracking-[0.25em] text-gray-950">
            {service.tag}
          </p>
          <h1 className="mt-5 max-w-4xl text-5xl font-black leading-none tracking-[-0.05em] md:text-7xl">
            {service.title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/85">{description}</p>
          <a
            href="/#contato"
            className="mt-10 inline-flex rounded-sm bg-[#FCD34D] px-6 py-4 text-xs font-bold uppercase tracking-[0.2em] text-gray-950 transition-colors hover:bg-[#F59E0B]"
          >
            Solicitar orcamento
          </a>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-12 px-4 py-20 md:px-6 lg:grid-cols-[1fr_18rem]">
        <article className="space-y-6">
          <h2 className="text-3xl font-black tracking-[-0.03em]">Sobre este servico</h2>
          {renderParagraphs(content)}
        </article>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-black/5 bg-gray-50 p-6 dark:border-white/10 dark:bg-[#121212]">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-gray-500 dark:text-gray-400">
              Empresa
            </p>
            <p className="mt-3 text-lg font-black">{companyName}</p>
            <p className="mt-2 text-sm leading-7 text-gray-600 dark:text-gray-300">
              {company?.address || "Atendimento tecnico para operacoes industriais e civis."}
            </p>
          </div>
        </aside>
      </section>

      <section className="bg-gray-100 px-4 py-20 dark:bg-[#121212] md:px-6">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-black tracking-[-0.03em]">Outros servicos</h2>
            <div className="mt-6 grid gap-3">
              {relatedServices.map((item) => (
                <a
                  key={item.id}
                  href={`/servicos/${item.slug}`}
                  className="rounded-xl border border-black/5 bg-white p-4 font-bold transition-colors hover:bg-[#FCD34D] dark:border-white/10 dark:bg-[#1A1A1A] dark:hover:bg-[#FCD34D] dark:hover:text-black"
                >
                  {item.title}
                </a>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-[-0.03em]">Equipamentos relacionados</h2>
            <div className="mt-6 grid gap-3">
              {relatedEquipment.map((item) => (
                <a
                  key={item.id}
                  href={`/equipamentos/${item.slug}`}
                  className="rounded-xl border border-black/5 bg-white p-4 font-bold transition-colors hover:bg-[#FCD34D] dark:border-white/10 dark:bg-[#1A1A1A] dark:hover:bg-[#FCD34D] dark:hover:text-black"
                >
                  {item.name}
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {jsonLd.map((item, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}
    </main>
  );
}
