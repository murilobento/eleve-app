import type {
  ManagedPublicCompany,
  ManagedPublicEquipment,
  ManagedPublicService,
} from "@/lib/public-site-admin";

export const PUBLIC_SITE_REVALIDATE_SECONDS = 3600;

const DEFAULT_COMPANY_NAME = "Eleve Locações";
const DEFAULT_DESCRIPTION =
  "Locação de guindastes, empilhadeiras e transporte pesado para operações industriais e civis.";

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function normalizePath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

export function getPublicSiteBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim()
    || process.env.NEXT_PUBLIC_APP_URL?.trim()
    || "http://localhost:3000";

  return trimTrailingSlash(configuredUrl);
}

export function getPublicSiteUrl(path = "/") {
  return `${getPublicSiteBaseUrl()}${normalizePath(path)}`;
}

export function getPublicCompanyName(company?: ManagedPublicCompany | null) {
  return company?.name?.trim() || DEFAULT_COMPANY_NAME;
}

export function getHomeSeoTitle(company?: ManagedPublicCompany | null) {
  return company?.seoTitle?.trim() || `${getPublicCompanyName(company)} | Locação de guindastes e equipamentos`;
}

export function getHomeSeoDescription(company?: ManagedPublicCompany | null) {
  return company?.seoDescription?.trim() || DEFAULT_DESCRIPTION;
}

export function getServiceSeoTitle(service: ManagedPublicService, company?: ManagedPublicCompany | null) {
  return service.seoTitle?.trim() || `${service.title} | ${getPublicCompanyName(company)}`;
}

export function getServiceSeoDescription(service: ManagedPublicService) {
  return service.seoDescription?.trim()
    || service.description?.trim()
    || `Conheça o serviço de ${service.title} para operações industriais e civis.`;
}

export function getEquipmentSeoTitle(equipment: ManagedPublicEquipment, company?: ManagedPublicCompany | null) {
  return equipment.seoTitle?.trim() || `${equipment.name} | ${getPublicCompanyName(company)}`;
}

export function getEquipmentSeoDescription(equipment: ManagedPublicEquipment) {
  return equipment.seoDescription?.trim()
    || equipment.technicalInfo?.trim()
    || `Conheça o equipamento ${equipment.name} para locação e operações especializadas.`;
}

export function compactDescription(value: string, maxLength = 170) {
  const compacted = value.replace(/\s+/g, " ").trim();

  if (compacted.length <= maxLength) {
    return compacted;
  }

  return `${compacted.slice(0, maxLength - 1).trimEnd()}...`;
}

export function buildLocalBusinessJsonLd(company: ManagedPublicCompany | null) {
  const name = getPublicCompanyName(company);
  const sameAs = [
    company?.facebookUrl,
    company?.instagramUrl,
    company?.linkedinUrl,
  ].filter((url): url is string => Boolean(url?.trim()));

  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": getPublicSiteUrl("/#localbusiness"),
    name,
    legalName: company?.legalName || company?.name || name,
    url: getPublicSiteUrl("/"),
    telephone: company?.phone || undefined,
    email: company?.email || undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: company?.streetAddress || company?.address || undefined,
      addressLocality: company?.addressLocality || undefined,
      addressRegion: company?.addressRegion || undefined,
      postalCode: company?.postalCode || undefined,
      addressCountry: "BR",
    },
    areaServed: company?.serviceAreas?.length
      ? company.serviceAreas.map((area) => ({ "@type": "Place", name: area }))
      : undefined,
    sameAs: sameAs.length ? sameAs : undefined,
  };
}

export function buildOrganizationJsonLd(company: ManagedPublicCompany | null) {
  const name = getPublicCompanyName(company);
  const sameAs = [
    company?.facebookUrl,
    company?.instagramUrl,
    company?.linkedinUrl,
  ].filter((url): url is string => Boolean(url?.trim()));

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": getPublicSiteUrl("/#organization"),
    name,
    legalName: company?.legalName || company?.name || name,
    url: getPublicSiteUrl("/"),
    email: company?.email || undefined,
    telephone: company?.phone || undefined,
    sameAs: sameAs.length ? sameAs : undefined,
  };
}

export function buildWebsiteJsonLd(company: ManagedPublicCompany | null) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": getPublicSiteUrl("/#website"),
    name: getPublicCompanyName(company),
    url: getPublicSiteUrl("/"),
  };
}

export function buildItemListJsonLd(
  items: Array<{ name: string; url: string }>,
  id: string,
  name: string,
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": getPublicSiteUrl(id),
    name,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: item.url,
    })),
  };
}

export function buildBreadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
