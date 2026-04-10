"use client";

import { CalendarDays, X } from "lucide-react";
import type { Matcher } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLocale } from "@/i18n/provider";
import { getDateFnsLocale } from "@/lib/date-locale";
import { cn } from "@/lib/utils";

type DatePickerInputProps = {
  id?: string;
  value?: Date;
  onChange: (value?: Date) => void;
  placeholder: string;
  disabled?: boolean;
  disabledDays?: Matcher | Matcher[];
  className?: string;
};

export function parseDateString(value?: string | null) {
  if (!value) {
    return undefined;
  }

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return undefined;
  }

  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function formatDateString(value?: Date) {
  if (!value) {
    return "";
  }

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDisplayDate(value: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(value);
}

export function DatePickerInput({
  id,
  value,
  onChange,
  placeholder,
  disabled = false,
  disabledDays,
  className,
}: DatePickerInputProps) {
  const locale = useLocale();
  const dateLocale = getDateFnsLocale(locale);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "h-10 w-full justify-start rounded-lg text-left font-normal",
              !value && "text-muted-foreground",
            )}
          >
            <CalendarDays className="mr-2 size-4" />
            {value ? formatDisplayDate(value, locale) : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            locale={dateLocale}
            selected={value}
            month={value}
            onSelect={onChange}
            disabled={disabledDays}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {value ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0 cursor-pointer"
          onClick={() => onChange(undefined)}
          disabled={disabled}
        >
          <X className="size-4" />
          <span className="sr-only">Clear date</span>
        </Button>
      ) : null}
    </div>
  );
}
