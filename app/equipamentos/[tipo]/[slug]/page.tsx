import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getPublicCompany,
  getPublicEquipmentByPath,
  listPublicEquipment,
  listPublicServices,
} from "@/lib/public-site-data";
import {
  buildBreadcrumbJsonLd,
  buildLocalBusinessJsonLd,
  compactDescription,
  getEquipmentSeoDescription,
  getEquipmentSeoTitle,
  getPublicCompanyName,
  getPublicSiteBaseUrl,
  getPublicSiteUrl,
} from "@/lib/public-site-seo";
import { PublicSiteFooter, PublicSiteTopbar } from "../../../components/public-site-chrome";

type EquipmentPageProps = {
  params: Promise<{ tipo: string; slug: string }>;
};

function buildWhatsAppUrl(phone: string, message = "Olá! Gostaria de solicitar um orçamento.") {
  const digits = phone.replace(/\D/g, "");
  const normalizedPhone = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}

export async function generateStaticParams() {
  const equipment = await listPublicEquipment(true);
  return equipment
    .map((item) => item.slug.split("/"))
    .filter((parts): parts is [string, string] => parts.length === 2)
    .map(([tipo, slug]) => ({ tipo, slug }));
}

export async function generateMetadata({ params }: EquipmentPageProps): Promise<Metadata> {
  const { tipo, slug } = await params;
  const [equipment, company] = await Promise.all([
    getPublicEquipmentByPath(tipo, slug, true),
    getPublicCompany(),
  ]);
  if (!equipment) return {};
  const title = getEquipmentSeoTitle(equipment, company);
  const description = compactDescription(getEquipmentSeoDescription(equipment));
  const path = `/equipamentos/${equipment.slug}`;
  return {
    metadataBase: new URL(getPublicSiteBaseUrl()),
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: getPublicSiteUrl(path), siteName: getPublicCompanyName(company), locale: "pt_BR", type: "article", images: [{ url: equipment.imageUrl, alt: equipment.imageAlt || equipment.name }] },
    twitter: { card: "summary_large_image", title, description, images: [equipment.imageUrl] },
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

export default async function EquipmentPage({ params }: EquipmentPageProps) {
  const { tipo, slug } = await params;
  const [equipment, company, allEquipment, services] = await Promise.all([
    getPublicEquipmentByPath(tipo, slug, true),
    getPublicCompany(),
    listPublicEquipment(true),
    listPublicServices(true),
  ]);
  if (!equipment) notFound();

  const description = compactDescription(getEquipmentSeoDescription(equipment));
  const content = equipment.pageContent?.trim() || equipment.technicalInfo?.trim() || description;
  const companyName = getPublicCompanyName(company);
  const whatsAppUrl = buildWhatsAppUrl(company?.phone?.trim() || "(11) 4000-1234");
  const equipmentUrl = getPublicSiteUrl(`/equipamentos/${equipment.slug}`);
  const relatedEquipment = allEquipment.filter((item) => item.slug !== equipment.slug).slice(0, 4);
  const relatedServices = services.slice(0, 3);
  const [equipmentCategory] = equipment.slug.split("/");
  const jsonLd = [
    buildLocalBusinessJsonLd(company),
    buildBreadcrumbJsonLd([
      { name: "Início", url: getPublicSiteUrl("/") },
      { name: "Equipamentos", url: getPublicSiteUrl("/equipamentos") },
      { name: "Categoria", url: getPublicSiteUrl(`/equipamentos/${equipmentCategory}`) },
      { name: equipment.name, url: equipmentUrl },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "Product",
      "@id": `${equipmentUrl}#product`,
      name: equipment.name,
      model: equipment.model,
      category: "Equipamento para locação",
      description,
      image: equipment.imageUrl,
      url: equipmentUrl,
      brand: { "@type": "Brand", name: equipment.model },
      additionalProperty: [{ "@type": "PropertyValue", name: "Capacidade", value: equipment.capacity }],
    },
  ];

  return (
    <>
      <PublicSiteTopbar whatsAppUrl={whatsAppUrl} />
      <main className="min-h-screen bg-white text-gray-900">
        <section className="relative overflow-hidden bg-white px-4 pb-24 pt-44 md:px-6 md:pb-32 md:pt-52">
          <img
            src={equipment.imageUrl}
            alt={equipment.imageAlt || equipment.name}
            className="absolute inset-0 h-full w-full object-cover opacity-30"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-black/65" />
          <div className="relative mx-auto max-w-5xl">
            <a href="/" className="text-xs font-bold uppercase tracking-[0.25em] text-[#FCD34D]">Eleve Locações</a>
            <p className="mt-8 inline-flex rounded-sm bg-[#FCD34D] px-3 py-1 text-xs font-black uppercase tracking-[0.25em] text-gray-950">
              {equipment.capacity}
            </p>
            <h1 className="mt-5 max-w-4xl text-fluid-detail-hero font-black leading-none">{equipment.name}</h1>
            <p className="mt-4 text-sm font-bold uppercase tracking-[0.3em] text-white/50">{equipment.model}</p>
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
            <h2 className="text-3xl font-black tracking-[-0.03em]">Informações técnicas</h2>
            {renderParagraphs(content)}
          </article>
          <aside className="space-y-4 md:order-first">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-gray-500">Capacidade</p>
              <p className="mt-3 text-2xl font-black">{equipment.capacity}</p>
              {equipment.manualUrl ? (
                <a
                  href={equipment.manualUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-6 inline-flex rounded-sm bg-[#FCD34D] px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-gray-950"
                >
                  Ver manual
                </a>
              ) : null}
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-gray-500">Empresa</p>
              <p className="mt-3 text-lg font-black">{companyName}</p>
            </div>
          </aside>
        </section>

        <section className="bg-[#F5F4F0] px-4 py-20 md:px-6">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-black tracking-[-0.03em]">Outros equipamentos</h2>
              <div className="mt-6 grid gap-3">
                {relatedEquipment.map((item) => (
                  <a
                    key={item.id}
                    href={`/equipamentos/${item.slug}`}
                    className="rounded-xl border border-gray-200 bg-gray-50 p-4 font-bold transition-all hover:border-[#FCD34D]/20 hover:bg-[#FCD34D] hover:text-gray-950"
                  >
                    {item.name}
                  </a>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-[-0.03em]">Serviços</h2>
              <div className="mt-6 grid gap-3">
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
