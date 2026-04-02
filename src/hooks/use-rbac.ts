"use client";

import { useEffect, useMemo, useState } from "react";

import type { PermissionKey, UserRoleSummary } from "@/lib/rbac-shared";

type RbacState = {
  roles: UserRoleSummary[];
  permissions: PermissionKey[];
};

export function useRbac(enabled = true) {
  const [data, setData] = useState<RbacState | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [hasResolved, setHasResolved] = useState(!enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      setHasResolved(false);
      setData(null);
      setError(null);
      return;
    }

    let active = true;

    async function load() {
      setIsLoading(true);
      setHasResolved(false);

      try {
        const response = await fetch("/api/rbac/me", {
          cache: "no-store",
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.error || "Failed to load permissions.");
        }

        if (active) {
          setData(payload);
          setError(null);
        }
      } catch (loadError) {
        if (active) {
          setData(null);
          setError(loadError instanceof Error ? loadError.message : "Failed to load permissions.");
        }
      } finally {
        if (active) {
          setIsLoading(false);
          setHasResolved(true);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [enabled]);

  const permissionSet = useMemo(() => new Set(data?.permissions ?? []), [data?.permissions]);

  return {
    data,
    error,
    isLoading,
    hasResolved,
    permissionSet,
    hasPermission: (permission: PermissionKey) => permissionSet.has(permission),
  };
}
