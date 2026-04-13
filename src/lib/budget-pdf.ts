import { createRequire } from "node:module";
import { getPdfBrowserLaunchOptions, resolvePdfBrowserExecutablePath } from "@/lib/pdf-browser";

import type { ManagedBudget } from "@/lib/budgets-admin";
import type { ManagedClient } from "@/lib/clients-admin";
import type { ManagedCompany } from "@/lib/company-admin";
import { formatCnpj, formatCpf, formatPhone, formatPostalCode } from "@/lib/utils";

type BudgetPdfPayload = {
  budget: ManagedBudget;
  client: ManagedClient | null;
  company: ManagedCompany | null;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
  }).format(new Date(`${value}T12:00:00`));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function getStatusLabel(status: ManagedBudget["status"]) {
  switch (status) {
    case "approved":
      return "Aprovado";
    case "cancelled":
      return "Cancelado";
    default:
      return "Pendente";
  }
}

function getBillingUnitLabel(value: string) {
  switch (value) {
    case "hour":
      return "por hora";
    case "daily":
      return "por diaria";
    case "monthly":
      return "por mes";
    case "annual":
      return "por ano";
    case "km":
      return "por km";
    case "freight":
      return "frete";
    case "mobilization_demobilization":
      return "mobilizacao/desmobilizacao";
    case "counterweight_transport":
      return "transporte de contrapeso";
    default:
      return value;
  }
}

function getClientDocument(client: ManagedClient | null) {
  if (!client) {
    return null;
  }

  return client.personType === "PJ" ? formatCnpj(client.document) : formatCpf(client.document);
}

function formatAddress(parts: Array<string | null | undefined>) {
  return parts
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
}

function formatMultilineText(value: string) {
  return escapeHtml(value).replaceAll("\n", "<br />");
}

function renderBudgetItemsRows(budget: ManagedBudget) {
  return budget.items
    .map((item, index) => {
      const billingDetails =
        item.serviceTypeBillingUnit === "hour" && item.minimumHours
          ? `${formatCurrency(item.baseValue)}/h • minimo ${item.minimumHours.toLocaleString("pt-BR")}h`
          : `${formatCurrency(item.baseValue)} • ${getBillingUnitLabel(item.serviceTypeBillingUnit)}`;

      return `
        <tr>
          <td class="index-cell">${index + 1}</td>
          <td>
            <div class="service-name">${escapeHtml(item.serviceTypeName)}</div>
            <div class="service-description">${escapeHtml(item.serviceDescription)}</div>
            <div class="meta">${escapeHtml(billingDetails)}</div>
          </td>
          <td class="center-cell">1</td>
          <td class="center-cell">
            <div>${escapeHtml(formatDate(item.serviceDate))}</div>
            <div class="meta">${escapeHtml(item.startTime)} as ${escapeHtml(item.endTime)}</div>
          </td>
          <td class="money-cell">${escapeHtml(formatCurrency(item.initialValue))}</td>
        </tr>
      `;
    })
    .join("");
}

export function renderBudgetPdfHtml({ budget, client, company }: BudgetPdfPayload) {
  const companyName = company?.tradeName || company?.appName || company?.legalName || "ELEVE";
  const companyLegalName = company?.legalName || companyName;
  const companyAddress = company
    ? formatAddress([
      `${company.street}, ${company.number}`,
      company.complement,
      company.district,
      `${company.city} - ${company.state}`,
      formatPostalCode(company.postalCode),
      company.country,
    ])
    : "Empresa nao cadastrada";
  const serviceAddress = formatAddress([
    `${budget.serviceStreet}, ${budget.serviceNumber}`,
    budget.serviceComplement,
    budget.serviceDistrict,
    `${budget.serviceCity} - ${budget.serviceState}`,
    formatPostalCode(budget.servicePostalCode),
    budget.serviceCountry,
  ]);
  const clientAddress = client
    ? formatAddress([
      `${client.street}, ${client.number}`,
      client.complement,
      client.district,
      `${client.city} - ${client.state}`,
      formatPostalCode(client.postalCode),
      client.country,
    ])
    : serviceAddress;
  const discountValue = budget.manualAdjustment < 0 ? Math.abs(budget.manualAdjustment) : 0;
  const surchargeValue = budget.manualAdjustment > 0 ? budget.manualAdjustment : 0;
  const issuedAt = formatDateTime(budget.updatedAt);
  const clientDocument = getClientDocument(client);
  const clientPhone = client?.phone ? formatPhone(client.phone) : "";
  const companyPhone = company?.phone ? formatPhone(company.phone) : "";
  const companyDocument = company?.cnpj ? formatCnpj(company.cnpj) : "";
  const notes = budget.notes?.trim() ? formatMultilineText(budget.notes.trim()) : "Sem observacoes adicionais.";

  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(`Orcamento ${budget.number}`)}</title>
        <style>
          :root {
            color-scheme: light;
            --line: #262626;
            --line-soft: #7a7a7a;
            --fill: #efefef;
            --text: #111111;
          }

          * {
            box-sizing: border-box;
          }

          html, body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            color: var(--text);
            font-family: Arial, Helvetica, sans-serif;
          }

          body {
            padding: 10px;
            font-size: 11px;
          }

          .document {
            width: 100%;
            border: 1px solid var(--line);
            border-collapse: collapse;
          }

          .block {
            width: 100%;
            border-collapse: collapse;
            margin-top: 6px;
          }

          .block:first-child {
            margin-top: 0;
          }

          .block,
          .block th,
          .block td {
            border: 1px solid var(--line);
          }

          .block th,
          .block td {
            padding: 4px 6px;
            vertical-align: top;
          }

          .section-title {
            background: var(--fill);
            text-align: center;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.2em;
            font-size: 12px;
          }

          .label {
            width: 1%;
            white-space: nowrap;
            font-weight: 700;
            background: #fafafa;
          }

          .header-cell {
            padding: 8px 10px;
          }

          .company-name {
            font-size: 16px;
            font-weight: 700;
            text-transform: uppercase;
            text-align: center;
          }

          .company-meta {
            margin-top: 4px;
            text-align: center;
            line-height: 1.35;
          }

          .meta-line td {
            text-align: center;
            font-weight: 700;
            background: #fafafa;
          }

          .items th {
            background: #fafafa;
            text-transform: uppercase;
            font-size: 10px;
            text-align: center;
          }

          .items td {
            min-height: 22px;
          }

          .index-cell,
          .center-cell {
            text-align: center;
            white-space: nowrap;
          }

          .money-cell {
            text-align: right;
            white-space: nowrap;
            width: 100px;
          }

          .compact-cell {
            font-size: 10px;
            line-height: 1.35;
          }

          .service-name {
            font-weight: 700;
          }

          .service-description,
          .meta {
            margin-top: 2px;
            color: #333333;
            line-height: 1.35;
          }

          .totals td {
            font-weight: 700;
          }

          .notes-box {
            min-height: 110px;
            line-height: 1.45;
          }

          .footer {
            margin-top: 8px;
            font-size: 10px;
            color: var(--line-soft);
            text-align: center;
          }

          .mono {
            letter-spacing: 0.06em;
          }

          @page {
            size: A4;
            margin: 8mm;
          }
        </style>
      </head>
      <body>
        <table class="document">
          <tr>
            <td class="header-cell">
              <div class="company-name">${escapeHtml(companyName)}</div>
              <div class="company-meta">
                ${escapeHtml(companyLegalName)}
                ${companyDocument ? `<br />CPF/CNPJ: ${escapeHtml(companyDocument)}` : ""}
                <br />${escapeHtml(companyAddress)}
                ${companyPhone ? `<br />Tel: ${escapeHtml(companyPhone)}` : ""}
                ${company?.email ? ` • E-mail: ${escapeHtml(company.email)}` : ""}
                ${company?.website ? `<br />Site: ${escapeHtml(company.website)}` : ""}
              </div>
            </td>
          </tr>
        </table>

        <table class="block">
          <tr class="meta-line">
            <td>Orcamento n.: <span class="mono">${escapeHtml(budget.number)}</span></td>
            <td>Emitido em: ${escapeHtml(issuedAt)}</td>
            <td>Status: ${escapeHtml(getStatusLabel(budget.status))}</td>
          </tr>
        </table>

        <table class="block">
          <tr>
            <th colspan="8" class="section-title">Cliente</th>
          </tr>
          <tr>
            <td class="label">Nome</td>
            <td colspan="7">${escapeHtml(client?.tradeName || client?.legalName || budget.clientName)}</td>
          </tr>
          <tr>
            <td class="label">Telefone</td>
            <td colspan="3">${escapeHtml(clientPhone || "-")}</td>
            <td class="label">E-mail</td>
            <td colspan="3">${escapeHtml(client?.email || "-")}</td>
          </tr>
          <tr>
            <td class="label">CPF/CNPJ</td>
            <td colspan="3">${escapeHtml(clientDocument || "-")}</td>
            <td class="label">Contato</td>
            <td colspan="3">${escapeHtml(client?.contactName || "-")}</td>
          </tr>
          <tr>
            <td class="label">Endereco</td>
            <td colspan="7">${escapeHtml(clientAddress)}</td>
          </tr>
          <tr>
            <td class="label">Local do servico</td>
            <td colspan="7">${escapeHtml(serviceAddress)}</td>
          </tr>
        </table>

        <table class="block items">
          <tr>
            <th colspan="5" class="section-title">Orcamento</th>
          </tr>
          <tr>
            <th style="width: 44px;">Item</th>
            <th>Produto/Servico</th>
            <th style="width: 58px;">Quant.</th>
            <th style="width: 150px;">Data / Horario</th>
            <th style="width: 110px;">Valor</th>
          </tr>
          ${renderBudgetItemsRows(budget)}
        </table>

        <table class="block totals">
          <tr>
            <td style="text-align:center;">Subtotal: ${escapeHtml(formatCurrency(budget.subtotalValue))}</td>
            <td style="text-align:center;">Desconto: ${escapeHtml(formatCurrency(discountValue))}</td>
            <td style="text-align:center;">Acrescimo: ${escapeHtml(formatCurrency(surchargeValue))}</td>
            <td style="text-align:center;">Total: ${escapeHtml(formatCurrency(budget.totalValue))}</td>
          </tr>
        </table>

        <table class="block">
          <tr>
            <th class="section-title">Observacoes</th>
          </tr>
          <tr>
            <td class="notes-box">${notes}</td>
          </tr>
        </table>

        <div class="footer">
          Documento gerado em ${escapeHtml(formatDateTime(new Date().toISOString()))} • ${escapeHtml(companyName)} • Orcamento ${escapeHtml(budget.number)}
        </div>
      </body>
    </html>
  `;
}

export async function renderBudgetPdf(payload: BudgetPdfPayload) {
  const require = createRequire(import.meta.url);
  const puppeteerModule = require("puppeteer-core") as typeof import("puppeteer-core");
  const puppeteer = puppeteerModule.default ?? puppeteerModule;
  const browser = await puppeteer.launch(
    getPdfBrowserLaunchOptions(resolvePdfBrowserExecutablePath()),
  );

  try {
    const page = await browser.newPage();
    await page.setContent(renderBudgetPdfHtml(payload), {
      waitUntil: "networkidle0",
    });
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
