const APP_TIME_ZONE = "America/Sao_Paulo";

export function getTodayDateKey(timeZone = APP_TIME_ZONE) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function isDateBeforeToday(value: string, timeZone = APP_TIME_ZONE) {
  return value < getTodayDateKey(timeZone);
}
