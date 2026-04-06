import { createRequire } from "node:module";

import type { ManagedCompany } from "@/lib/company-admin";
import type { ManagedFuelRequisition } from "@/lib/fuel-requisitions-admin";
import type { ManagedMaintenanceRequisition } from "@/lib/maintenance-requisitions-admin";
import type { ManagedSupplier } from "@/lib/suppliers-admin";
import { formatCnpj, formatPhone, formatPostalCode } from "@/lib/utils";

type RequisitionPdfBasePayload = {
  company: ManagedCompany | null;
  supplier: ManagedSupplier | null;
};

type MaintenancePdfPayload = RequisitionPdfBasePayload & {
  requisition: ManagedMaintenanceRequisition;
};

type FuelPdfPayload = RequisitionPdfBasePayload & {
  requisition: ManagedFuelRequisition;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(`${value}T12:00:00`));
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function renderBaseHtml(args: {
  title: string;
  number: string;
  revisionNumber: number;
  status: string;
  issuedAt: string | null;
  scheduledDate: string;
  equipmentLabel: string;
  supplier: ManagedSupplier | null;
  requesterLabel: string;
  bodyBlockTitle: string;
  bodyBlockContent: string;
  completionNotes: string | null;
  company: ManagedCompany | null;
}) {
  const companyName = args.company?.tradeName || args.company?.appName || args.company?.legalName || "ELEVE";
  const companyLegalName = args.company?.legalName || companyName;
  const companyDocument = args.company?.cnpj ? formatCnpj(args.company.cnpj) : "";
  const companyPhone = args.company?.phone ? formatPhone(args.company.phone) : "";
  const companyAddress = args.company
    ? [
      `${args.company.street}, ${args.company.number}`,
      args.company.complement,
      args.company.district,
      `${args.company.city} - ${args.company.state}`,
      formatPostalCode(args.company.postalCode),
      args.company.country,
    ].filter(Boolean).join(", ")
    : "Empresa nao cadastrada";
  const supplierAddress = args.supplier
    ? [
      `${args.supplier.street}, ${args.supplier.number}`,
      args.supplier.complement,
      args.supplier.district,
      `${args.supplier.city} - ${args.supplier.state}`,
      formatPostalCode(args.supplier.postalCode),
      args.supplier.country,
    ].filter(Boolean).join(", ")
    : "Fornecedor nao encontrado";

  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(args.title)}</title>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; padding: 12px; font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 11px; }
          table { width: 100%; border-collapse: collapse; }
          table, th, td { border: 1px solid #222; }
          th, td { padding: 6px; vertical-align: top; }
          .section { margin-top: 8px; }
          .section-title { background: #f1f1f1; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; text-align: center; }
          .label { width: 140px; font-weight: 700; background: #fafafa; white-space: nowrap; }
          .company-title { text-align: center; font-size: 16px; font-weight: 700; text-transform: uppercase; }
          .company-meta { text-align: center; margin-top: 4px; line-height: 1.35; }
          .sign-row { display: flex; gap: 10px; margin-top: 22px; }
          .sign-box { flex: 1; text-align: center; }
          .sign-line { border-top: 1px solid #111; margin-top: 34px; padding-top: 4px; font-size: 10px; }
          .notes { min-height: 90px; white-space: pre-wrap; }
          .footer { margin-top: 10px; text-align: center; color: #666; font-size: 10px; }
          @page { size: A4; margin: 8mm; }
        </style>
      </head>
      <body>
        <table>
          <tr><td>
            <div class="company-title">${escapeHtml(companyName)}</div>
            <div class="company-meta">
              ${escapeHtml(companyLegalName)}
              ${companyDocument ? `<br />CPF/CNPJ: ${escapeHtml(companyDocument)}` : ""}
              <br />${escapeHtml(companyAddress)}
              ${companyPhone ? `<br />Tel: ${escapeHtml(companyPhone)}` : ""}
              ${args.company?.email ? ` • E-mail: ${escapeHtml(args.company.email)}` : ""}
            </div>
          </td></tr>
        </table>

        <table class="section">
          <tr><th colspan="4" class="section-title">${escapeHtml(args.title)}</th></tr>
          <tr>
            <td class="label">Numero</td>
            <td>${escapeHtml(args.number)}</td>
            <td class="label">Revisao</td>
            <td>${escapeHtml(String(args.revisionNumber))}</td>
          </tr>
          <tr>
            <td class="label">Status</td>
            <td>${escapeHtml(args.status)}</td>
            <td class="label">Emitido em</td>
            <td>${escapeHtml(formatDateTime(args.issuedAt))}</td>
          </tr>
          <tr>
            <td class="label">Data prevista</td>
            <td>${escapeHtml(formatDate(args.scheduledDate))}</td>
            <td class="label">Requisitante</td>
            <td>${escapeHtml(args.requesterLabel)}</td>
          </tr>
          <tr>
            <td class="label">Equipamento</td>
            <td colspan="3">${escapeHtml(args.equipmentLabel)}</td>
          </tr>
          <tr>
            <td class="label">Fornecedor</td>
            <td colspan="3">${escapeHtml(args.supplier?.tradeName || args.supplier?.legalName || "Fornecedor nao informado")}</td>
          </tr>
          <tr>
            <td class="label">Endereco fornecedor</td>
            <td colspan="3">${escapeHtml(supplierAddress)}</td>
          </tr>
        </table>

        <table class="section">
          <tr><th class="section-title">${escapeHtml(args.bodyBlockTitle)}</th></tr>
          <tr><td class="notes">${args.bodyBlockContent}</td></tr>
        </table>

        <table class="section">
          <tr><th class="section-title">Retorno / Observacoes finais</th></tr>
          <tr><td class="notes">${escapeHtml(args.completionNotes || "") || "-"}</td></tr>
        </table>

        <div class="sign-row">
          <div class="sign-box"><div class="sign-line">Requisitante</div></div>
          <div class="sign-box"><div class="sign-line">Autorizador</div></div>
          <div class="sign-box"><div class="sign-line">Recebedor</div></div>
        </div>

        <div class="footer">
          Documento gerado em ${escapeHtml(formatDateTime(new Date().toISOString()))} • ${escapeHtml(companyName)}
        </div>
      </body>
    </html>
  `;
}

export function renderMaintenanceRequisitionPdfHtml(payload: MaintenancePdfPayload) {
  const requesterLabel = payload.requisition.requesterNameSnapshot
    || payload.requisition.requesterEmailSnapshot
    || "-";

  return renderBaseHtml({
    title: "Requisicao de Manutencao",
    number: payload.requisition.number,
    revisionNumber: payload.requisition.revisionNumber,
    status: payload.requisition.status,
    issuedAt: payload.requisition.issuedAt,
    scheduledDate: payload.requisition.scheduledDate,
    equipmentLabel: `${payload.requisition.equipmentName} • ${payload.requisition.equipmentBrand} • ${payload.requisition.equipmentModel}`,
    supplier: payload.supplier,
    requesterLabel,
    bodyBlockTitle: "Descricao da requisicao",
    bodyBlockContent: escapeHtml(payload.requisition.description)
      + (payload.requisition.notes ? `\n\nObservacoes:\n${escapeHtml(payload.requisition.notes)}` : ""),
    completionNotes: payload.requisition.completionNotes,
    company: payload.company,
  });
}

export function renderFuelRequisitionPdfHtml(payload: FuelPdfPayload) {
  const requesterLabel = payload.requisition.requesterNameSnapshot
    || payload.requisition.requesterEmailSnapshot
    || "-";

  return renderBaseHtml({
    title: "Requisicao de Abastecimento",
    number: payload.requisition.number,
    revisionNumber: payload.requisition.revisionNumber,
    status: payload.requisition.status,
    issuedAt: payload.requisition.issuedAt,
    scheduledDate: payload.requisition.scheduledDate,
    equipmentLabel: `${payload.requisition.equipmentName} • ${payload.requisition.equipmentBrand} • ${payload.requisition.equipmentModel}`,
    supplier: payload.supplier,
    requesterLabel,
    bodyBlockTitle: "Instrucoes",
    bodyBlockContent: escapeHtml(payload.requisition.notes),
    completionNotes: payload.requisition.completionNotes,
    company: payload.company,
  });
}

async function renderPdfFromHtml(html: string) {
  const require = createRequire(import.meta.url);
  const puppeteerModule = require("puppeteer-core") as typeof import("puppeteer-core");
  const puppeteer = puppeteerModule.default ?? puppeteerModule;
  const browser = await puppeteer.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || process.env.GOOGLE_CHROME_BIN || "/usr/bin/google-chrome",
    headless: true,
    pipe: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-breakpad",
      "--disable-crash-reporter",
      "--disable-crashpad",
      "--no-first-run",
      "--no-default-browser-check",
      "--no-zygote",
      "--font-render-hinting=medium",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.emulateMediaType("screen");
    return await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "14mm",
        right: "10mm",
        bottom: "14mm",
        left: "10mm",
      },
    });
  } finally {
    await browser.close();
  }
}

export async function renderMaintenanceRequisitionPdf(payload: MaintenancePdfPayload) {
  return renderPdfFromHtml(renderMaintenanceRequisitionPdfHtml(payload));
}

export async function renderFuelRequisitionPdf(payload: FuelPdfPayload) {
  return renderPdfFromHtml(renderFuelRequisitionPdfHtml(payload));
}
