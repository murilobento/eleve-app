const POSITIVE_STATUS_BADGE_CLASS = "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
const NEGATIVE_STATUS_BADGE_CLASS = "bg-red-500/10 text-red-700 dark:text-red-400";
const NEUTRAL_STATUS_BADGE_CLASS = "bg-muted text-muted-foreground";
const WARNING_STATUS_BADGE_CLASS = "bg-amber-500/10 text-amber-700 dark:text-amber-400";
const INFO_STATUS_BADGE_CLASS = "bg-blue-500/10 text-blue-700 dark:text-blue-400";

const positiveStatuses = new Set([
  "active",
  "approved",
  "aprovado",
  "aprovada",
  "ativo",
  "ativa",
  "completed",
  "concluido",
  "concluida",
  "done",
  "finalized",
  "finalizado",
  "finalizada",
]);

const negativeStatuses = new Set([
  "inactive",
  "inativo",
  "inativa",
  "cancelled",
  "canceled",
  "cancelado",
  "cancelada",
]);

const neutralStatuses = new Set([
  "pending",
  "pendente",
  "draft",
  "rascunho",
  "issued",
  "emitida",
  "emitido",
  "emitada",
]);

const warningStatuses = new Set([
  "scheduled",
  "agendado",
  "agendada",
]);

const infoStatuses = new Set([
  "in_progress",
  "em_execucao",
]);

function normalizeStatusValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

export function getSemanticStatusBadgeClass(status?: string | null, fallbackClassName = "") {
  if (!status) {
    return fallbackClassName;
  }

  const normalizedStatus = normalizeStatusValue(status);

  if (positiveStatuses.has(normalizedStatus)) {
    return POSITIVE_STATUS_BADGE_CLASS;
  }

  if (negativeStatuses.has(normalizedStatus)) {
    return NEGATIVE_STATUS_BADGE_CLASS;
  }

  if (neutralStatuses.has(normalizedStatus)) {
    return NEUTRAL_STATUS_BADGE_CLASS;
  }

  if (warningStatuses.has(normalizedStatus)) {
    return WARNING_STATUS_BADGE_CLASS;
  }

  if (infoStatuses.has(normalizedStatus)) {
    return INFO_STATUS_BADGE_CLASS;
  }

  return fallbackClassName;
}
