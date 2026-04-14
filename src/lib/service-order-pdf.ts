import { createRequire } from "node:module";
import { getPdfBrowserLaunchOptions, resolvePdfBrowserExecutablePath } from "@/lib/pdf-browser";

import type { ManagedClient } from "@/lib/clients-admin";
import type { ManagedCompany } from "@/lib/company-admin";
import type { ManagedServiceOrder } from "@/lib/service-orders-admin";
import { formatCnpj, formatCpf, formatPhone, formatPostalCode } from "@/lib/utils";

type ServiceOrderPdfPayload = {
  serviceOrder: ManagedServiceOrder;
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

function getStatusLabel(status: ManagedServiceOrder["status"]) {
  switch (status) {
    case "scheduled":
      return "Agendada";
    case "in_progress":
      return "Em execução";
    case "completed":
      return "Concluída";
    case "cancelled":
      return "Cancelada";
    default:
      return "Pendente";
  }
}

function getOriginLabel(originType: ManagedServiceOrder["originType"]) {
  return originType === "budget" ? "De orçamento" : "Manual";
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

function getClientDocument(client: ManagedClient | null) {
  if (!client) {
    return null;
  }

  return client.personType === "PJ" ? formatCnpj(client.document) : formatCpf(client.document);
}

function renderServiceOrderItemsRows(serviceOrder: ManagedServiceOrder) {
  return serviceOrder.items
    .map((item, index) => `
      <tr>
        <td class="index-cell">${index + 1}</td>
        <td>
          <div class="service-name">${escapeHtml(item.serviceTypeName)}</div>
          <div class="service-description">${escapeHtml(item.serviceDescription)}</div>
          <div class="meta">Equipamento: ${escapeHtml(item.equipmentName)} • Operador: ${escapeHtml(item.operatorName)}</div>
          ${item.notes?.trim() ? `<div class="meta">Obs.: ${formatMultilineText(item.notes.trim())}</div>` : ""}
        </td>
        <td class="center-cell">
          <div>${escapeHtml(formatDate(item.serviceDate))}</div>
          <div class="meta">${escapeHtml(item.plannedStartTime)} às ${escapeHtml(item.plannedEndTime)}</div>
        </td>
        <td class="money-cell">${item.quotedValue !== null ? escapeHtml(formatCurrency(item.quotedValue)) : "-"}</td>
      </tr>
    `)
    .join("");
}

export function renderServiceOrderPdfHtml({ serviceOrder, client, company }: ServiceOrderPdfPayload) {
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
    `${serviceOrder.serviceStreet}, ${serviceOrder.serviceNumber}`,
    serviceOrder.serviceComplement,
    serviceOrder.serviceDistrict,
    `${serviceOrder.serviceCity} - ${serviceOrder.serviceState}`,
    formatPostalCode(serviceOrder.servicePostalCode),
    serviceOrder.serviceCountry,
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
  const clientDocument = getClientDocument(client);
  const clientPhone = client?.phone ? formatPhone(client.phone) : "";
  const companyPhone = company?.phone ? formatPhone(company.phone) : "";
  const companyDocument = company?.cnpj ? formatCnpj(company.cnpj) : "";
  const notes = serviceOrder.notes?.trim() ? formatMultilineText(serviceOrder.notes.trim()) : "Sem observacoes adicionais.";

  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(`Ordem de Serviço ${serviceOrder.number}`)}</title>
        <style>
          :root {
            color-scheme: light;
            --line: #262626;
            --fill: #efefef;
            --text: #111111;
          }
          * { box-sizing: border-box; }
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
          .block {
            width: 100%;
            border-collapse: collapse;
            margin-top: 6px;
          }
          .block:first-child { margin-top: 0; }
          .block, .block th, .block td { border: 1px solid var(--line); }
          .block th, .block td {
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
          .header-cell { padding: 8px 10px; }
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
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }
          .index-cell, .center-cell, .money-cell { text-align: center; }
          .money-cell {
            font-weight: 700;
            white-space: nowrap;
          }
          .service-name {
            font-weight: 700;
            text-transform: uppercase;
          }
          .service-description {
            margin-top: 2px;
            line-height: 1.35;
          }
          .meta {
            margin-top: 3px;
            color: #555555;
            font-size: 10px;
          }
          .notes-box {
            min-height: 72px;
            line-height: 1.45;
          }
          .footer {
            margin-top: 10px;
            text-align: center;
            font-size: 10px;
            color: #555555;
          }
        </style>
      </head>
      <body>
        <table class="block">
          <tr>
            <td class="header-cell" colspan="8">
              <div class="company-name">${escapeHtml(companyName)}</div>
              <div class="company-meta">
                ${escapeHtml(companyLegalName)}<br />
                ${escapeHtml(companyAddress)}<br />
                ${escapeHtml(companyDocument || "-")} • ${escapeHtml(companyPhone || "-")}
              </div>
            </td>
          </tr>
        </table>

        <table class="block">
          <tr>
            <th colspan="8" class="section-title">Ordem de Serviço</th>
          </tr>
          <tr class="meta-line">
            <td colspan="2">Número</td>
            <td colspan="2">Status</td>
            <td colspan="2">Origem</td>
            <td colspan="2">Atualizada em</td>
          </tr>
          <tr>
            <td colspan="2" class="center-cell">${escapeHtml(serviceOrder.number)}</td>
            <td colspan="2" class="center-cell">${escapeHtml(getStatusLabel(serviceOrder.status))}</td>
            <td colspan="2" class="center-cell">${escapeHtml(getOriginLabel(serviceOrder.originType))}</td>
            <td colspan="2" class="center-cell">${escapeHtml(formatDateTime(serviceOrder.updatedAt))}</td>
          </tr>
          <tr>
            <td class="label">Orçamento</td>
            <td colspan="3">${escapeHtml(serviceOrder.sourceBudgetNumber || "-")}</td>
            <td class="label">Itens</td>
            <td colspan="3">${escapeHtml(String(serviceOrder.itemCount))}</td>
          </tr>
        </table>

        <table class="block">
          <tr>
            <th colspan="8" class="section-title">Cliente e Local</th>
          </tr>
          <tr>
            <td class="label">Cliente</td>
            <td colspan="7">${escapeHtml(client?.tradeName || client?.legalName || serviceOrder.clientName)}</td>
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
            <td class="label">Endereco do cliente</td>
            <td colspan="7">${escapeHtml(clientAddress)}</td>
          </tr>
          <tr>
            <td class="label">Local do servico</td>
            <td colspan="7">${escapeHtml(serviceAddress)}</td>
          </tr>
        </table>

        <table class="block">
          <tr>
            <th colspan="4" class="section-title">Itens da Ordem</th>
          </tr>
          <tr>
            <th style="width: 44px;">Item</th>
            <th>Servico</th>
            <th style="width: 170px;">Data / Horario</th>
            <th style="width: 110px;">Valor</th>
          </tr>
          ${renderServiceOrderItemsRows(serviceOrder)}
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
          Documento gerado em ${escapeHtml(formatDateTime(new Date().toISOString()))} • ${escapeHtml(companyName)} • Ordem de Serviço ${escapeHtml(serviceOrder.number)}
        </div>
      </body>
    </html>
  `;
}

export async function renderServiceOrderPdf(payload: ServiceOrderPdfPayload) {
  const require = createRequire(import.meta.url);
  const puppeteerModule = require("puppeteer-core") as typeof import("puppeteer-core");
  const puppeteer = puppeteerModule.default ?? puppeteerModule;
  const browser = await puppeteer.launch(
    getPdfBrowserLaunchOptions(resolvePdfBrowserExecutablePath()),
  );

  try {
    const page = await browser.newPage();
    await page.setContent(renderServiceOrderPdfHtml(payload), {
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
