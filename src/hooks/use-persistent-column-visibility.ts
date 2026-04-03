"use client";

import { useEffect, useState } from "react";
import type { VisibilityState } from "@tanstack/react-table";

export function usePersistentColumnVisibility(
  storageKey: string,
  defaultValue: VisibilityState = {},
) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => defaultValue);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);

      if (!stored) {
        return;
      }

      const parsed = JSON.parse(stored) as VisibilityState;
      setColumnVisibility(parsed);
    } catch {
      setColumnVisibility(defaultValue);
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(columnVisibility));
    } catch {
      // Ignore persistence errors and keep runtime state working.
    }
  }, [columnVisibility, storageKey]);

  return { columnVisibility, setColumnVisibility };
}
