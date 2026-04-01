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

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      setHasResolved(false);
      setData(null);
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
        }
      } catch {
        if (active) {
          setData(null);
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
    isLoading,
    hasResolved,
    permissionSet,
    hasPermission: (permission: PermissionKey) => permissionSet.has(permission),
  };
}
