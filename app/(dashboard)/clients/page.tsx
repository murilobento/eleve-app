"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { DataTable } from "./components/data-table";
import type {
  CreateClientInput,
  ManagedClient,
  UpdateClientInput,
} from "@/lib/clients-admin";
import { useI18n } from "@/i18n/provider";

type ClientsResponse = {
  clients: ManagedClient[];
};

function getLocalizedClientError(message: string, t: ReturnType<typeof useI18n>["t"]) {
  switch (message) {
    case "Client not found.":
      return t("clients.errors.notFound");
    case "Remove budgets linked to this client before deleting it.":
      return t("clients.errors.removeLinkedBudgets");
    case "Request failed.":
      return t("common.requestFailed");
    default:
      return message;
  }
}

async function parseResponse(response: Response, t: ReturnType<typeof useI18n>["t"]) {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(getLocalizedClientError(payload?.error || "Request failed.", t));
  }

  return payload;
}

export default function ClientsPage() {
  const { t } = useI18n();
  const [clients, setClients] = useState<ManagedClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);

  const loadClients = async () => {
    setLoading(true);

    try {
      const payload = (await parseResponse(await fetch("/api/clients", {
        cache: "no-store",
      }), t)) as ClientsResponse;

      setClients(payload.clients);
    } catch (loadError) {
      toast.error(loadError instanceof Error ? loadError.message : t("clients.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadClients();
  }, []);

  const runMutation = async (
    operation: () => Promise<void>,
    successMessage: string,
    fallbackErrorMessage: string,
  ) => {
    setIsMutating(true);

    try {
      await operation();
      await loadClients();
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

  const handleCreateClient = async (values: CreateClientInput) => {
    await runMutation(async () => {
      await parseResponse(
        await fetch("/api/clients", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        }),
        t,
      );
    }, t("common.clientCreateSuccess"), t("clients.updateError"));
  };

  const handleUpdateClient = async (id: string, values: UpdateClientInput) => {
    await runMutation(async () => {
      await parseResponse(
        await fetch(`/api/clients/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        }),
        t,
      );
    }, t("common.clientUpdateSuccess"), t("clients.updateError"));
  };

  const handleDeleteClient = async (id: string) => {
    await runMutation(async () => {
      await parseResponse(
        await fetch(`/api/clients/${id}`, {
          method: "DELETE",
        }),
        t,
      );
    }, t("common.clientDeleteSuccess"), t("clients.updateError"));
  };

  const handleDeleteClients = async (ids: string[]) => {
    if (!ids.length) {
      return;
    }

    setIsMutating(true);

    try {
      const results = await Promise.allSettled(
        ids.map(async (id) => {
          await parseResponse(
            await fetch(`/api/clients/${id}`, {
              method: "DELETE",
            }),
            t,
          );
        }),
      );

      const successCount = results.filter((result) => result.status === "fulfilled").length;
      const failedCount = ids.length - successCount;

      await loadClients();

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
          <h1 className="text-2xl font-bold tracking-tight">{t("clients.title")}</h1>
        </div>
      </div>

      <div className="@container/main mt-2 px-4 lg:mt-4 lg:px-6">
        {loading ? (
          <div className="rounded-md border px-6 py-10 text-sm text-muted-foreground">
            {t("common.loadingClients")}
          </div>
        ) : (
          <DataTable
            clients={clients}
            onCreateClient={handleCreateClient}
            onUpdateClient={handleUpdateClient}
            onDeleteClient={handleDeleteClient}
            onDeleteClients={handleDeleteClients}
            isMutating={isMutating}
          />
        )}
      </div>
    </>
  );
}
