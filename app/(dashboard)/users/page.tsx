"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { DataTable } from "./components/data-table";
import type {
  CreateManagedUserInput,
  ManagedUser,
  UpdateManagedUserInput,
} from "@/lib/users-admin";
import type { RoleRecord } from "@/lib/rbac-shared";
import { useI18n } from "@/i18n/provider";

type UsersResponse = {
  users: ManagedUser[];
  roles: RoleRecord[];
  total: number;
};

async function parseResponse(response: Response) {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || "Request failed.");
  }

  return payload;
}

export default function UsersPage() {
  const { t } = useI18n();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);

  const loadUsers = async () => {
    setLoading(true);

    try {
      const payload = (await parseResponse(await fetch("/api/users", {
        cache: "no-store",
      }))) as UsersResponse;

      setUsers(payload.users);
      setRoles(payload.roles);
    } catch (loadError) {
      toast.error(loadError instanceof Error ? loadError.message : t("users.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const runMutation = async (
    operation: () => Promise<void>,
    successMessage: string,
    fallbackErrorMessage: string,
  ) => {
    setIsMutating(true);

    try {
      await operation();
      await loadUsers();
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

  const handleCreateUser = async (values: CreateManagedUserInput) => {
    await runMutation(async () => {
      await parseResponse(
        await fetch("/api/users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        }),
      );
    }, t("common.userCreateSuccess"), t("users.updateError"));
  };

  const handleUpdateUser = async (id: string, values: UpdateManagedUserInput) => {
    await runMutation(async () => {
      await parseResponse(
        await fetch(`/api/users/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        }),
      );
    }, t("common.userUpdateSuccess"), t("users.updateError"));
  };

  const handleDeleteUser = async (id: string) => {
    await runMutation(async () => {
      await parseResponse(
        await fetch(`/api/users/${id}`, {
          method: "DELETE",
        }),
      );
    }, t("common.userDeleteSuccess"), t("users.updateError"));
  };

  const handleDeleteUsers = async (ids: string[]) => {
    if (!ids.length) {
      return;
    }

    setIsMutating(true);

    try {
      const results = await Promise.allSettled(
        ids.map(async (id) => {
          await parseResponse(
            await fetch(`/api/users/${id}`, {
              method: "DELETE",
            }),
          );
        }),
      );

      const successCount = results.filter((result) => result.status === "fulfilled").length;
      const failedCount = ids.length - successCount;

      await loadUsers();

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
          <h1 className="text-2xl font-bold tracking-tight">{t("users.title")}</h1>
          <p className="text-muted-foreground">
            {t("users.description")}
          </p>
        </div>
      </div>

      <div className="@container/main px-4 lg:px-6 mt-2 lg:mt-4">
        {loading ? (
          <div className="rounded-md border px-6 py-10 text-sm text-muted-foreground">
            {t("common.loadingUsers")}
          </div>
        ) : (
          <DataTable
            users={users}
            roles={roles}
            onCreateUser={handleCreateUser}
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
            onDeleteUsers={handleDeleteUsers}
            isMutating={isMutating}
          />
        )}
      </div>
    </>
  );
}
