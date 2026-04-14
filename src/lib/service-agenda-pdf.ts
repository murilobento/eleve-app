import type { ManagedCompany } from "@/lib/company-admin";
import type { ServiceAgendaEntry } from "@/lib/service-agenda";
import { formatCnpj, formatPhone, formatPostalCode } from "@/lib/utils";

type ServiceAgendaPdfPayload = {
  date: string;
  entries: ServiceAgendaEntry[];
  company: ManagedCompany | null;
};

const PAGE_WIDTH = 842;
const PAGE_HEIGHT = 595;
const PAGE_MARGIN = 32;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;
const HEADER_HEIGHT = 74;
const FOOTER_HEIGHT = 24;
const BODY_TOP = PAGE_MARGIN + HEADER_HEIGHT;
const BODY_BOTTOM = PAGE_HEIGHT - PAGE_MARGIN - FOOTER_HEIGHT;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "full" }).format(new Date(`${value}T12:00:00`));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function formatTimeLabel(value: string) {
  const [hours, minutes] = value.split(":");
  return minutes === "00" ? `${hours}h` : `${hours}:${minutes}h`;
}

function formatTimeRange(startTime: string, endTime: string) {
  return `${formatTimeLabel(startTime)} às ${formatTimeLabel(endTime)}`;
}

function formatAddress(parts: Array<string | null | undefined>) {
  return parts
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
}

function getStatusLabel(status: ServiceAgendaEntry["status"]) {
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

function sanitizePdfText(value: string) {
  return value
    .replace(/\r/g, " ")
    .replace(/\n/g, " ")
    .replace(/[^\x20-\xFF]/g, "?");
}

function escapePdfText(value: string) {
  const normalized = sanitizePdfText(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");

  return Buffer.from(normalized, "latin1").toString("latin1");
}

function formatNumber(value: number) {
  return value.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

function estimateTextWidth(text: string, fontSize: number) {
  return text.length * fontSize * 0.52;
}

function wrapText(text: string, maxWidth: number, fontSize: number) {
  const value = sanitizePdfText(text).trim();

  if (!value) {
    return [""];
  }

  const words = value.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  const pushWordChunks = (word: string) => {
    let chunk = "";

    for (const character of word) {
      const nextChunk = chunk + character;

      if (estimateTextWidth(nextChunk, fontSize) <= maxWidth || chunk.length === 0) {
        chunk = nextChunk;
        continue;
      }

      lines.push(chunk);
      chunk = character;
    }

    if (chunk) {
      currentLine = chunk;
    }
  };

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;

    if (estimateTextWidth(candidate, fontSize) <= maxWidth) {
      currentLine = candidate;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
      currentLine = "";
    }

    if (estimateTextWidth(word, fontSize) <= maxWidth) {
      currentLine = word;
      continue;
    }

    pushWordChunks(word);
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [""];
}

function truncateText(text: string, maxWidth: number, fontSize: number) {
  const value = sanitizePdfText(text).trim();

  if (!value) {
    return "";
  }

  if (estimateTextWidth(value, fontSize) <= maxWidth) {
    return value;
  }

  let result = value;

  while (result.length > 1 && estimateTextWidth(`${result}...`, fontSize) > maxWidth) {
    result = result.slice(0, -1);
  }

  return `${result}...`;
}

function groupEntriesByStartHour(entries: ServiceAgendaEntry[]) {
  const grouped = new Map<string, ServiceAgendaEntry[]>();

  for (const entry of entries) {
    const hour = `${entry.plannedStartTime.slice(0, 2)}:00`;
    const current = grouped.get(hour) ?? [];
    current.push(entry);
    grouped.set(hour, current);
  }

  return Array.from(grouped.entries()).sort(([left], [right]) => left.localeCompare(right));
}

class PdfPageBuilder {
  private commands: string[] = [];

  line(x1: number, y1: number, x2: number, y2: number) {
    this.commands.push(`${formatNumber(x1)} ${formatNumber(PAGE_HEIGHT - y1)} m ${formatNumber(x2)} ${formatNumber(PAGE_HEIGHT - y2)} l S`);
  }

  rect(x: number, y: number, width: number, height: number) {
    this.commands.push(`${formatNumber(x)} ${formatNumber(PAGE_HEIGHT - y - height)} ${formatNumber(width)} ${formatNumber(height)} re S`);
  }

  fillRect(x: number, y: number, width: number, height: number, gray = 0.95) {
    this.commands.push(`${gray} g ${formatNumber(x)} ${formatNumber(PAGE_HEIGHT - y - height)} ${formatNumber(width)} ${formatNumber(height)} re f 0 g`);
  }

  text(text: string, x: number, y: number, fontSize = 11, font: "F1" | "F2" = "F1") {
    this.commands.push(`BT /${font} ${formatNumber(fontSize)} Tf 1 0 0 1 ${formatNumber(x)} ${formatNumber(PAGE_HEIGHT - y)} Tm (${escapePdfText(text)}) Tj ET`);
  }

  getContent() {
    return this.commands.join("\n");
  }
}

function buildHeader(page: PdfPageBuilder, payload: ServiceAgendaPdfPayload) {
  const companyName =
    payload.company?.tradeName || payload.company?.appName || payload.company?.legalName || "ELEVE";
  const companyLegalName = payload.company?.legalName || companyName;
  const companyDocument = payload.company?.cnpj ? formatCnpj(payload.company.cnpj) : "";
  const companyPhone = payload.company?.phone ? formatPhone(payload.company.phone) : "";
  const companyAddress = payload.company
    ? formatAddress([
        `${payload.company.street}, ${payload.company.number}`,
        payload.company.complement,
        payload.company.district,
        `${payload.company.city} - ${payload.company.state}`,
        formatPostalCode(payload.company.postalCode),
        payload.company.country,
      ])
    : "Empresa não cadastrada";
  const generatedAt = formatDateTime(new Date().toISOString());

  page.rect(PAGE_MARGIN, PAGE_MARGIN, CONTENT_WIDTH, HEADER_HEIGHT);
  page.text(companyName.toUpperCase(), PAGE_MARGIN + 16, PAGE_MARGIN + 18, 15, "F2");
  page.text("AGENDA DIÁRIA DE ORDENS DE SERVIÇO", PAGE_WIDTH - PAGE_MARGIN - 250, PAGE_MARGIN + 18, 11, "F2");
  page.text(formatDate(payload.date), PAGE_WIDTH - PAGE_MARGIN - 250, PAGE_MARGIN + 32, 9);
  page.text(companyLegalName, PAGE_MARGIN + 16, PAGE_MARGIN + 34, 9);

  const metaLine = [
    companyDocument ? `CPF/CNPJ: ${companyDocument}` : "",
    companyPhone ? `Tel: ${companyPhone}` : "",
    payload.company?.email ? `E-mail: ${payload.company.email}` : "",
  ]
    .filter(Boolean)
    .join("   ");

  if (metaLine) {
    page.text(metaLine, PAGE_MARGIN + 16, PAGE_MARGIN + 46, 8);
  }

  for (const [index, line] of wrapText(companyAddress, CONTENT_WIDTH - 300, 8).slice(0, 2).entries()) {
    page.text(line, PAGE_MARGIN + 16, PAGE_MARGIN + 58 + index * 9, 8);
  }

  page.line(PAGE_MARGIN + 16, PAGE_MARGIN + 72, PAGE_WIDTH - PAGE_MARGIN - 16, PAGE_MARGIN + 72);
  page.text(`Gerado em ${generatedAt}`, PAGE_MARGIN + 16, PAGE_HEIGHT - PAGE_MARGIN - 8, 9);
}

function buildEmptyStatePage(page: PdfPageBuilder, payload: ServiceAgendaPdfPayload) {
  buildHeader(page, payload);
  page.rect(PAGE_MARGIN, BODY_TOP + 24, CONTENT_WIDTH, 64);
  page.text("Nenhuma ordem de serviço programada para esta data.", PAGE_MARGIN + 16, BODY_TOP + 62, 11);
}

const TABLE_HEADER_HEIGHT = 18;
const ROW_HEIGHT = 27;
const GROUP_HEADER_HEIGHT = 20;
const GROUP_GAP = 4;
const SECTION_GAP = 8;
const HOUR_COLUMN_WIDTH = 46;
const TABLE_X = PAGE_MARGIN;
const TABLE_Y = BODY_TOP + 8;
const TABLE_WIDTH = CONTENT_WIDTH;
const COLUMN_WIDTHS = {
  time: 58,
  os: 62,
  operator: 82,
  equipment: 96,
  status: 72,
  description: 118,
};

function getColumnPositions() {
  const x1 = TABLE_X;
  const x2 = x1 + HOUR_COLUMN_WIDTH;
  const x3 = x2 + COLUMN_WIDTHS.time;
  const x4 = x3 + COLUMN_WIDTHS.os;
  const x5 = x4 + COLUMN_WIDTHS.operator;
  const x6 = x5 + COLUMN_WIDTHS.equipment;
  const x7 = x6 + COLUMN_WIDTHS.status;
  const x8 = x7 + COLUMN_WIDTHS.description;

  return {
    hour: x1,
    time: x2,
    os: x3,
    operator: x4,
    equipment: x5,
    status: x6,
    description: x7,
    location: x8,
  };
}

function measureRowHeight(entry: ServiceAgendaEntry, locationWidth: number) {
  const locationLines = wrapText(entry.address || entry.location || "-", locationWidth - 8, 7).slice(0, 2);
  return Math.max(ROW_HEIGHT, 15 + locationLines.length * 8);
}

function drawTableHeader(page: PdfPageBuilder, y: number) {
  const columns = getColumnPositions();
  page.fillRect(TABLE_X, y, TABLE_WIDTH, TABLE_HEADER_HEIGHT, 0.92);
  page.rect(TABLE_X, y, TABLE_WIDTH, TABLE_HEADER_HEIGHT);

  const labels = [
    ["Hora", columns.time + 4],
    ["OS", columns.os + 4],
    ["Operador", columns.operator + 4],
    ["Equipamento", columns.equipment + 4],
    ["Status", columns.status + 4],
    ["Descrição", columns.description + 4],
    ["Local", columns.location + 4],
  ] as const;

  for (const [label, x] of labels) {
    page.text(label, x, y + 12, 8, "F2");
  }
}

function drawTableGrid(page: PdfPageBuilder, y: number, height: number) {
  const columns = getColumnPositions();
  const lines = [
    columns.time,
    columns.os,
    columns.operator,
    columns.equipment,
    columns.status,
    columns.description,
    columns.location,
  ];

  for (const x of lines) {
    page.line(x, y, x, y + height);
  }
}

function drawEntryRow(page: PdfPageBuilder, entry: ServiceAgendaEntry, y: number, rowHeight: number) {
  const columns = getColumnPositions();
  const locationWidth = TABLE_X + TABLE_WIDTH - columns.location;
  const descriptionWidth = columns.location - columns.description;

  page.rect(columns.time, y, TABLE_WIDTH - HOUR_COLUMN_WIDTH, rowHeight);
  drawTableGrid(page, y, rowHeight);

  const rowTop = y + 9;
  page.text(formatTimeRange(entry.plannedStartTime, entry.plannedEndTime), columns.time + 4, rowTop, 7, "F2");
  page.text(entry.serviceOrderNumber, columns.os + 4, rowTop, 7, "F2");
  page.text(truncateText(entry.operatorName || "-", COLUMN_WIDTHS.operator - 8, 7), columns.operator + 4, rowTop, 7);
  page.text(truncateText(entry.equipmentName || "-", COLUMN_WIDTHS.equipment - 8, 7), columns.equipment + 4, rowTop, 7);
  page.text(truncateText(getStatusLabel(entry.status), COLUMN_WIDTHS.status - 8, 7), columns.status + 4, rowTop, 7);

  const descriptionLines = wrapText(entry.serviceDescription || "-", descriptionWidth - 8, 7).slice(0, 2);
  for (const [index, line] of descriptionLines.entries()) {
    page.text(line, columns.description + 4, rowTop + index * 8, 7);
  }

  const locationLines = wrapText(entry.address || entry.location || "-", locationWidth - 8, 7).slice(0, 2);
  for (const [index, line] of locationLines.entries()) {
    page.text(line, columns.location + 4, rowTop + index * 8, 7);
  }
}

export function renderServiceAgendaPdfHtml({ date, entries, company }: ServiceAgendaPdfPayload) {
  const companyName = company?.tradeName || company?.appName || company?.legalName || "ELEVE";
  const lines = entries.map(
    (entry) =>
      `${entry.plannedStartTime}-${entry.plannedEndTime} | OS ${entry.serviceOrderNumber} | ${getStatusLabel(entry.status)} | ${entry.operatorName} | ${entry.equipmentName} | ${entry.serviceTypeName} | ${entry.serviceDescription}`,
  );

  return [
    `Agenda diária de ordens de serviço - ${date}`,
    companyName,
    ...lines,
  ].join("\n");
}

export async function renderServiceAgendaPdf(payload: ServiceAgendaPdfPayload) {
  const pages: string[] = [];
  const groupedEntries = groupEntriesByStartHour(payload.entries);

  if (groupedEntries.length === 0) {
    const page = new PdfPageBuilder();
    buildEmptyStatePage(page, payload);
    pages.push(page.getContent());
  } else {
    let page = new PdfPageBuilder();
    buildHeader(page, payload);
    let cursorY = TABLE_Y;
    drawTableHeader(page, cursorY);
    cursorY += TABLE_HEADER_HEIGHT;

    for (const [hour, entries] of groupedEntries) {
      const columns = getColumnPositions();
      const locationWidth = TABLE_X + TABLE_WIDTH - columns.location;
      const sectionHeight =
        GROUP_HEADER_HEIGHT +
        entries.reduce((total, entry) => total + measureRowHeight(entry, locationWidth), 0) +
        GROUP_GAP;

      if (cursorY + sectionHeight > BODY_BOTTOM) {
        pages.push(page.getContent());
        page = new PdfPageBuilder();
        buildHeader(page, payload);
        cursorY = TABLE_Y;
        drawTableHeader(page, cursorY);
        cursorY += TABLE_HEADER_HEIGHT;
      }

      page.fillRect(TABLE_X, cursorY, HOUR_COLUMN_WIDTH, GROUP_HEADER_HEIGHT, 0.94);
      page.rect(TABLE_X, cursorY, HOUR_COLUMN_WIDTH, GROUP_HEADER_HEIGHT);
      page.text(formatTimeLabel(hour), TABLE_X + 8, cursorY + 13, 9, "F2");
      for (const entry of entries) {
        const rowHeight = measureRowHeight(entry, locationWidth);
        drawEntryRow(page, entry, cursorY, rowHeight);
        cursorY += rowHeight;
      }

      cursorY += SECTION_GAP;
    }

    pages.push(page.getContent());
  }

  const objects: Array<string | null> = [null, null, null, null, null];
  const pageIds: number[] = [];
  let nextObjectId = 5;

  for (const content of pages) {
    const contentId = nextObjectId;
    const pageId = nextObjectId + 1;
    nextObjectId += 2;

    objects[contentId] = `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`;
    objects[pageId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`;
    pageIds.push(pageId);
  }

  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] >>`;
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";

  let pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const offsets: number[] = [0];

  for (let index = 1; index < objects.length; index += 1) {
    const object = objects[index];

    if (!object) {
      continue;
    }

    offsets[index] = Buffer.byteLength(pdf, "latin1");
    pdf += `${index} 0 obj\n${object}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length}\n`;
  pdf += "0000000000 65535 f \n";

  for (let index = 1; index < objects.length; index += 1) {
    const offset = offsets[index] ?? 0;
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "latin1");
}
