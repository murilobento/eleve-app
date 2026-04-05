"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type SearchableComboboxOption = {
  value: string;
  label: string;
  description?: string;
  keywords?: string[];
};

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

type SearchableComboboxProps = {
  value?: string;
  onChange: (value: string) => void;
  options: SearchableComboboxOption[];
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage: string;
  disabled?: boolean;
  className?: string;
};

export function SearchableCombobox({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  disabled,
  className,
}: SearchableComboboxProps) {
  const [open, setOpen] = useState(false);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-9 w-full min-w-0 justify-between px-3 font-normal",
            !selectedOption && "text-muted-foreground",
            className,
          )}
        >
          <span className="min-w-0 truncate text-left">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command
          filter={(optionValue, search, keywords = []) => {
            const normalizedSearch = normalizeSearchText(search.trim());

            if (!normalizedSearch) {
              return 1;
            }

            const haystack = [optionValue, ...keywords]
              .filter(Boolean)
              .map((entry) => normalizeSearchText(entry));

            return haystack.some((entry) => entry.includes(normalizedSearch)) ? 1 : 0;
          }}
        >
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList className="max-h-64">
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            {options.map((option) => (
              <CommandItem
                key={option.value}
                value={option.label}
                keywords={option.keywords}
                onSelect={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className="items-start py-2"
              >
                <Check
                  className={cn(
                    "mt-0.5 size-4 shrink-0",
                    value === option.value ? "opacity-100" : "opacity-0",
                  )}
                />
                <div className="min-w-0 space-y-0.5">
                  <div className="truncate">{option.label}</div>
                  {option.description ? (
                    <div className="truncate text-xs text-muted-foreground">{option.description}</div>
                  ) : null}
                </div>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
