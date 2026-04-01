"use client";

import { useEffect, useState } from "react";

import { DataTable } from "./components/data-table";
import type { ManagedRole, CreateRoleInput, UpdateRoleInput } from "@/lib/roles-admin";
import { useI18n } from "@/i18n/provider";

type RolesResponse = {
  roles: ManagedRole[];
};

async function parseResponse(response: Response) {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || "Request failed.");
  }

  return payload;
}

export default function RolesPage() {
  const { t } = useI18n();
  const [roles, setRoles] = useState<ManagedRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  const loadRoles = async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = (await parseResponse(await fetch("/api/roles", {
        cache: "no-store",
      }))) as RolesResponse;

      setRoles(payload.roles);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t("roles.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRoles();
  }, []);

  const runMutation = async (operation: () => Promise<void>) => {
    setIsMutating(true);
    setError(null);

    try {
      await operation();
      await loadRoles();
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : t("roles.updateError"));
    } finally {
      setIsMutating(false);
    }
  };

  const handleCreateRole = async (values: CreateRoleInput) => {
    await runMutation(async () => {
      await parseResponse(
        await fetch("/api/roles", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        }),
      );
    });
  };

  const handleUpdateRole = async (id: string, values: UpdateRoleInput) => {
    await runMutation(async () => {
      await parseResponse(
        await fetch(`/api/roles/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        }),
      );
    });
  };

  const handleDeleteRole = async (id: string) => {
    await runMutation(async () => {
      await parseResponse(
        await fetch(`/api/roles/${id}`, {
          method: "DELETE",
        }),
      );
    });
  };

  return (
    <>
      <div className="px-4 lg:px-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{t("roles.title")}</h1>
          <p className="text-muted-foreground">
            {t("roles.description")}
          </p>
        </div>
      </div>

      <div className="@container/main px-4 lg:px-6 mt-2 lg:mt-4">
        {error ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-md border px-6 py-10 text-sm text-muted-foreground">
            {t("common.loadingRoles")}
          </div>
        ) : (
          <DataTable
            roles={roles}
            onCreateRole={handleCreateRole}
            onUpdateRole={handleUpdateRole}
            onDeleteRole={handleDeleteRole}
            isMutating={isMutating}
          />
        )}
      </div>
    </>
  );
}
