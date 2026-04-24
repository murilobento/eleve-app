import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getPublicCompany,
  getPublicServiceByPath,
  listPublicServices,
} from "@/lib/public-site-data";
import {
  buildBreadcrumbJsonLd,
  buildLocalBusinessJsonLd,
  compactDescription,
  getPublicCompanyName,
  getPublicSiteBaseUrl,
  getPublicSiteUrl,
  getServiceSeoDescription,
  getServiceSeoTitle,
} from "@/lib/public-site-seo";
import { PublicSiteFooter, PublicSiteTopbar } from "../../../components/public-site-chrome";

type ServicePageProps = {
  params: Promise<{ categoria: string; slug: string }>;
};

function buildWhatsAppUrl(phone: string, message = "Olá! Gostaria de solicitar um orçamento.") {
  const digits = phone.replace(/\D/g, "");
  const normalizedPhone = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}

export async function generateStaticParams() {
  const services = await listPublicServices(true);
  return services
    .map((service) => service.slug.split("/"))
    .filter((parts): parts is [string, string] => parts.length === 2)
    .map(([categoria, slug]) => ({ categoria, slug }));
}

export async function generateMetadata({ params }: ServicePageProps): Promise<Metadata> {
  const { categoria, slug } = await params;
  const [service, company] = await Promise.all([
    getPublicServiceByPath(categoria, slug, true),
    getPublicCompany(),
  ]);
  if (!service) return {};
  const title = getServiceSeoTitle(service, company);
  const description = compactDescription(getServiceSeoDescription(service));
  const path = `/servicos/${service.slug}`;
  return {
    metadataBase: new URL(getPublicSiteBaseUrl()),
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: getPublicSiteUrl(path), siteName: getPublicCompanyName(company), locale: "pt_BR", type: "article", images: [{ url: service.imageUrl, alt: service.imageAlt || service.title }] },
    twitter: { card: "summary_large_image", title, description, images: [service.imageUrl] },
  };
}

function renderParagraphs(content: string) {
  return content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => (
      <p key={paragraph} className="text-base leading-8 text-gray-500">{paragraph}</p>
    ));
}

export default async function ServicePage({ params }: ServicePageProps) {
  const { categoria, slug } = await params;
  const [service, company, services] = await Promise.all([
    getPublicServiceByPath(categoria, slug, true),
    getPublicCompany(),
    listPublicServices(true),
  ]);
  if (!service) notFound();

  const description = compactDescription(getServiceSeoDescription(service));
  const content = service.pageContent?.trim() || service.description?.trim() || description;
  const companyName = getPublicCompanyName(company);
  const whatsAppUrl = buildWhatsAppUrl(company?.phone?.trim() || "(11) 4000-1234");
  const serviceUrl = getPublicSiteUrl(`/servicos/${service.slug}`);
  const relatedServices = services.filter((item) => item.slug !== service.slug).slice(0, 4);
  const [serviceCategory] = service.slug.split("/");
  const jsonLd = [
    buildLocalBusinessJsonLd(company),
    buildBreadcrumbJsonLd([
      { name: "Início", url: getPublicSiteUrl("/") },
      { name: "Serviços", url: getPublicSiteUrl("/servicos") },
      { name: "Categoria", url: getPublicSiteUrl(`/servicos/${serviceCategory}`) },
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
      provider: { "@id": getPublicSiteUrl("/#localbusiness"), name: companyName },
      areaServed: company?.serviceAreas?.length
        ? company.serviceAreas.map((area) => ({ "@type": "Place", name: area }))
        : undefined,
    },
  ];

  return (
    <>
      <PublicSiteTopbar whatsAppUrl={whatsAppUrl} />
      <main className="min-h-screen bg-white text-gray-900">
        <section className="relative overflow-hidden bg-white px-4 pb-24 pt-44 md:px-6 md:pb-32 md:pt-52">
          <img
            src={service.imageUrl}
            alt={service.imageAlt || service.title}
            className="absolute inset-0 h-full w-full object-cover opacity-30"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-black/65" />
          <div className="relative mx-auto max-w-5xl">
            <a href="/" className="text-xs font-bold uppercase tracking-[0.25em] text-[#FCD34D]">Eleve Locações</a>
            <p className="mt-8 inline-flex rounded-sm bg-[#FCD34D] px-3 py-1 text-xs font-black uppercase tracking-[0.25em] text-gray-950">
              {service.tag}
            </p>
            <h1 className="mt-5 max-w-4xl text-fluid-detail-hero font-black leading-none">{service.title}</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/70">{description}</p>
            <a
              href="/#contato"
              className="mt-10 inline-flex rounded-sm bg-[#FCD34D] px-6 py-4 text-xs font-bold uppercase tracking-[0.2em] text-gray-950 transition-colors hover:bg-[#F59E0B]"
            >
              Solicitar orçamento
            </a>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-12 px-4 py-20 md:px-6 md:grid-cols-[1fr_16rem] lg:grid-cols-[1fr_18rem]">
          <article className="space-y-6">
            <h2 className="text-3xl font-black tracking-[-0.03em]">Sobre este serviço</h2>
            {renderParagraphs(content)}
          </article>
          <aside className="space-y-4 md:order-first">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-gray-500">Empresa</p>
              <p className="mt-3 text-lg font-black">{companyName}</p>
              <p className="mt-2 text-sm leading-7 text-gray-500">{company?.address || "Atendimento técnico para operações industriais e civis."}</p>
            </div>
          </aside>
        </section>

        <section className="bg-[#F5F4F0] px-4 py-20 md:px-6">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-2xl font-black tracking-[-0.03em]">Outros serviços</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-4">
              {relatedServices.map((item) => (
                <a
                  key={item.id}
                  href={`/servicos/${item.slug}`}
                  className="rounded-xl border border-gray-200 bg-gray-50 p-4 font-bold transition-all hover:border-[#FCD34D]/20 hover:bg-[#FCD34D] hover:text-gray-950"
                >
                  {item.title}
                </a>
              ))}
            </div>
          </div>
        </section>

        {jsonLd.map((item, index) => (
          <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }} />
        ))}
      </main>
      <PublicSiteFooter company={company} whatsAppUrl={whatsAppUrl} />
    </>
  );
}
