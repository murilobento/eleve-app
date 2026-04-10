import type { ManagedCompany } from "@/lib/company-admin";
import type { ServiceAgendaEntry } from "@/lib/service-agenda";
import { formatCnpj, formatPhone, formatPostalCode } from "@/lib/utils";

type ServiceAgendaPngPayload = {
  date: string;
  entries: ServiceAgendaEntry[];
  company: ManagedCompany | null;
};

type CanvasModule = typeof import("@napi-rs/canvas");

const WIDTH = 1684;
const HEIGHT = 1190;
const MARGIN = 64;
const CONTENT_WIDTH = WIDTH - MARGIN * 2;
const HEADER_HEIGHT = 148;
const TABLE_HEADER_HEIGHT = 36;
const ROW_HEIGHT = 54;
const GROUP_HEADER_HEIGHT = 40;
const GROUP_GAP = 8;
const SECTION_GAP = 16;
const HOUR_COLUMN_WIDTH = 92;
const TABLE_X = MARGIN;
const TABLE_Y = MARGIN + HEADER_HEIGHT;
const TABLE_WIDTH = CONTENT_WIDTH;

const COLUMN_WIDTHS = {
  time: 118,
  os: 110,
  operator: 164,
  equipment: 212,
  description: 286,
  location: 528,
};

let canvasModulePromise: Promise<CanvasModule> | null = null;

function getCanvasModule() {
  if (!canvasModulePromise) {
    canvasModulePromise = import("@napi-rs/canvas");
  }

  return canvasModulePromise;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "full" }).format(new Date(`${value}T12:00:00`));
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

function getColumnPositions() {
  const x1 = TABLE_X;
  const x2 = x1 + HOUR_COLUMN_WIDTH;
  const x3 = x2 + COLUMN_WIDTHS.time;
  const x4 = x3 + COLUMN_WIDTHS.os;
  const x5 = x4 + COLUMN_WIDTHS.operator;
  const x6 = x5 + COLUMN_WIDTHS.equipment;
  const x7 = x6 + COLUMN_WIDTHS.description;

  return {
    time: x2,
    os: x3,
    operator: x4,
    equipment: x5,
    description: x6,
    location: x7,
  };
}

function measureTextWidth(
  context: CanvasRenderingContext2D,
  text: string,
  font: string,
) {
  context.save();
  context.font = font;
  const width = context.measureText(text).width;
  context.restore();
  return width;
}

function truncateText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  font: string,
) {
  if (measureTextWidth(context, text, font) <= maxWidth) {
    return text;
  }

  let result = text;

  while (result.length > 1 && measureTextWidth(context, `${result}...`, font) > maxWidth) {
    result = result.slice(0, -1);
  }

  return `${result}...`;
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  font: string,
) {
  const value = text.trim();

  if (!value) {
    return [""];
  }

  context.save();
  context.font = font;

  const words = value.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;

    if (context.measureText(candidate).width <= maxWidth) {
      currentLine = candidate;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    currentLine = word;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  context.restore();
  return lines.length > 0 ? lines : [""];
}

function drawText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: string,
  color = "#111827",
) {
  context.save();
  context.font = font;
  context.fillStyle = color;
  context.fillText(text, x, y);
  context.restore();
}

export async function renderServiceAgendaPng(payload: ServiceAgendaPngPayload) {
  const canvasModule = await getCanvasModule();
  const canvas = canvasModule.createCanvas(WIDTH, HEIGHT);
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Could not create 2D context for PNG rendering.");
  }

  const companyName = payload.company?.tradeName || payload.company?.appName || payload.company?.legalName || "ELEVE";
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
  const groupedEntries = groupEntriesByStartHour(payload.entries);
  const columns = getColumnPositions();
  const locationWidth = TABLE_X + TABLE_WIDTH - columns.location;

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, WIDTH, HEIGHT);
  context.strokeStyle = "#111827";
  context.lineWidth = 2;

  context.strokeRect(MARGIN, MARGIN, CONTENT_WIDTH, HEADER_HEIGHT);
  drawText(context, companyName.toUpperCase(), MARGIN + 28, MARGIN + 44, "bold 28px Arial");
  drawText(context, "AGENDA DIÁRIA DE ORDENS DE SERVIÇO", WIDTH - MARGIN - 500, MARGIN + 44, "bold 22px Arial");
  drawText(context, formatDate(payload.date), WIDTH - MARGIN - 500, MARGIN + 76, "18px Arial");
  drawText(context, companyLegalName, MARGIN + 28, MARGIN + 76, "18px Arial");

  const metaLine = [
    companyDocument ? `CPF/CNPJ: ${companyDocument}` : "",
    companyPhone ? `Tel: ${companyPhone}` : "",
    payload.company?.email ? `E-mail: ${payload.company.email}` : "",
  ]
    .filter(Boolean)
    .join("   ");

  if (metaLine) {
    drawText(context, metaLine, MARGIN + 28, MARGIN + 100, "16px Arial");
  }

  const addressLines = wrapText(context, companyAddress, CONTENT_WIDTH - 560, "16px Arial").slice(0, 2);
  for (const [index, line] of addressLines.entries()) {
    drawText(context, line, MARGIN + 28, MARGIN + 124 + index * 20, "16px Arial");
  }

  context.beginPath();
  context.moveTo(MARGIN + 24, MARGIN + HEADER_HEIGHT - 10);
  context.lineTo(WIDTH - MARGIN - 24, MARGIN + HEADER_HEIGHT - 10);
  context.stroke();

  context.fillStyle = "#ececec";
  context.fillRect(TABLE_X, TABLE_Y, TABLE_WIDTH, TABLE_HEADER_HEIGHT);
  context.strokeRect(TABLE_X, TABLE_Y, TABLE_WIDTH, TABLE_HEADER_HEIGHT);

  const headerLabels = [
    ["Hora", columns.time + 10],
    ["OS", columns.os + 10],
    ["Operador", columns.operator + 10],
    ["Equipamento", columns.equipment + 10],
    ["Descrição", columns.description + 10],
    ["Local", columns.location + 10],
  ] as const;

  for (const [label, x] of headerLabels) {
    drawText(context, label, x, TABLE_Y + 24, "bold 16px Arial");
  }

  let cursorY = TABLE_Y + TABLE_HEADER_HEIGHT;

  if (groupedEntries.length === 0) {
    context.strokeRect(TABLE_X, cursorY, TABLE_WIDTH, 80);
    drawText(context, "Nenhuma ordem de serviço programada para esta data.", TABLE_X + 24, cursorY + 46, "20px Arial");
    return await canvas.encode("png");
  }

  for (const [hour, hourEntries] of groupedEntries) {
    context.fillStyle = "#f1f1f1";
    context.fillRect(TABLE_X, cursorY, HOUR_COLUMN_WIDTH, GROUP_HEADER_HEIGHT);
    context.strokeRect(TABLE_X, cursorY, HOUR_COLUMN_WIDTH, GROUP_HEADER_HEIGHT);
    drawText(context, formatTimeLabel(hour), TABLE_X + 16, cursorY + 25, "bold 18px Arial");

    for (const entry of hourEntries) {
      context.strokeRect(columns.time, cursorY, TABLE_WIDTH - HOUR_COLUMN_WIDTH, ROW_HEIGHT);

      for (const x of [
        columns.time,
        columns.os,
        columns.operator,
        columns.equipment,
        columns.description,
        columns.location,
      ]) {
        context.beginPath();
        context.moveTo(x, cursorY);
        context.lineTo(x, cursorY + ROW_HEIGHT);
        context.stroke();
      }

      drawText(context, formatTimeRange(entry.plannedStartTime, entry.plannedEndTime), columns.time + 8, cursorY + 22, "bold 15px Arial");
      drawText(context, entry.serviceOrderNumber, columns.os + 8, cursorY + 22, "bold 15px Arial");
      drawText(context, truncateText(context, entry.operatorName || "-", COLUMN_WIDTHS.operator - 14, "15px Arial"), columns.operator + 8, cursorY + 22, "15px Arial");
      drawText(context, truncateText(context, entry.equipmentName || "-", COLUMN_WIDTHS.equipment - 14, "15px Arial"), columns.equipment + 8, cursorY + 22, "15px Arial");

      const descriptionLines = wrapText(context, entry.serviceDescription || "-", COLUMN_WIDTHS.description - 14, "14px Arial").slice(0, 2);
      for (const [index, line] of descriptionLines.entries()) {
        drawText(context, line, columns.description + 8, cursorY + 18 + index * 16, "14px Arial");
      }

      const locationLines = wrapText(context, entry.address || entry.location || "-", locationWidth - 14, "14px Arial").slice(0, 2);
      for (const [index, line] of locationLines.entries()) {
        drawText(context, line, columns.location + 8, cursorY + 18 + index * 16, "14px Arial");
      }

      cursorY += ROW_HEIGHT;
    }

    cursorY += SECTION_GAP;
  }

  return await canvas.encode("png");
}
