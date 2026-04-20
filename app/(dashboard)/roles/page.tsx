"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { DataTable } from "./components/data-table";
import type { ManagedRole, CreateRoleInput, UpdateRoleInput } from "@/lib/roles-admin";
import { useI18n } from "@/i18n/provider";

type RolesResponse = {
  roles: ManagedRole[];
};

function getLocalizedRoleError(message: string, t: ReturnType<typeof useI18n>["t"]) {
  switch (message) {
    case "Role not found.":
      return t("roles.errors.notFound");
    case "Remove this role from users before deleting it.":
      return t("roles.errors.removeAssignedUsers");
    case "Request failed.":
      return t("common.requestFailed");
    default:
      return message;
  }
}

async function parseResponse(response: Response, t: ReturnType<typeof useI18n>["t"]) {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(getLocalizedRoleError(payload?.error || "Request failed.", t));
  }

  return payload;
}

export default function RolesPage() {
  const { t } = useI18n();
  const [roles, setRoles] = useState<ManagedRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);

  const loadRoles = async () => {
    setLoading(true);

    try {
      const payload = (await parseResponse(await fetch("/api/roles", {
        cache: "no-store",
      }), t)) as RolesResponse;

      setRoles(payload.roles);
    } catch (loadError) {
      toast.error(loadError instanceof Error ? loadError.message : t("roles.loadError"));
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

    try {
      await operation();
      await loadRoles();
      toast.success(successMessage);
    } catch (mutationError) {
      const message =
        mutationError instanceof Error ? mutationError.message : fallbackErrorMessage;
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
        t,
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
        t,
      );
    }, t("common.roleUpdateSuccess"), t("roles.updateError"));
  };

  const handleDeleteRole = async (id: string) => {
    await runMutation(async () => {
      await parseResponse(
        await fetch(`/api/roles/${id}`, {
          method: "DELETE",
        }),
        t,
      );
    }, t("common.roleDeleteSuccess"), t("roles.updateError"));
  };

  const handleDeleteRoles = async (ids: string[]) => {
    if (!ids.length) {
      return;
    }

    setIsMutating(true);

    try {
      const results = await Promise.allSettled(
        ids.map(async (id) => {
          await parseResponse(
            await fetch(`/api/roles/${id}`, {
              method: "DELETE",
            }),
            t,
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
          </p>
        </div>
      </div>

      <div className="@container/main px-4 lg:px-6 mt-2 lg:mt-4">
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
