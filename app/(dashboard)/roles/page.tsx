"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

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

  const runMutation = async (
    operation: () => Promise<void>,
    successMessage: string,
    fallbackErrorMessage: string,
  ) => {
    setIsMutating(true);
    setError(null);

    try {
      await operation();
      await loadRoles();
      toast.success(successMessage);
    } catch (mutationError) {
      const message =
        mutationError instanceof Error ? mutationError.message : fallbackErrorMessage;
      setError(message);
      toast.error(message);
      throw mutationError;
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
    }, t("common.roleCreateSuccess"), t("roles.updateError"));
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
    }, t("common.roleUpdateSuccess"), t("roles.updateError"));
  };

  const handleDeleteRole = async (id: string) => {
    await runMutation(async () => {
      await parseResponse(
        await fetch(`/api/roles/${id}`, {
          method: "DELETE",
        }),
      );
    }, t("common.roleDeleteSuccess"), t("roles.updateError"));
  };

  const handleDeleteRoles = async (ids: string[]) => {
    if (!ids.length) {
      return;
    }

    setIsMutating(true);
    setError(null);

    try {
      const results = await Promise.allSettled(
        ids.map(async (id) => {
          await parseResponse(
            await fetch(`/api/roles/${id}`, {
              method: "DELETE",
            }),
          );
        }),
      );

      const successCount = results.filter((result) => result.status === "fulfilled").length;
      const failedCount = ids.length - successCount;

      await loadRoles();

      if (successCount > 0) {
        toast.success(t("common.bulkDeleteSuccess", { count: successCount }));
      }

      if (failedCount > 0) {
        const message = t("common.bulkDeletePartialError", { failed: failedCount, total: ids.length });
        setError(message);
        toast.error(message);
      }
    } finally {
      setIsMutating(false);
    }
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
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
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
            onDeleteRoles={handleDeleteRoles}
            isMutating={isMutating}
          />
        )}
      </div>
    </>
  );
}
