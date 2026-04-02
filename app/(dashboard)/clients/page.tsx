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

async function parseResponse(response: Response) {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || "Request failed.");
  }

  return payload;
}

export default function ClientsPage() {
  const { t } = useI18n();
  const [clients, setClients] = useState<ManagedClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  const loadClients = async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = (await parseResponse(await fetch("/api/clients", {
        cache: "no-store",
      }))) as ClientsResponse;

      setClients(payload.clients);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t("clients.loadError"));
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
    setError(null);

    try {
      await operation();
      await loadClients();
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
      );
    }, t("common.clientUpdateSuccess"), t("clients.updateError"));
  };

  const handleDeleteClient = async (id: string) => {
    await runMutation(async () => {
      await parseResponse(
        await fetch(`/api/clients/${id}`, {
          method: "DELETE",
        }),
      );
    }, t("common.clientDeleteSuccess"), t("clients.updateError"));
  };

  return (
    <>
      <div className="px-4 lg:px-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{t("clients.title")}</h1>
          <p className="text-muted-foreground">{t("clients.description")}</p>
        </div>
      </div>

      <div className="@container/main mt-2 px-4 lg:mt-4 lg:px-6">
        {error ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        ) : null}

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
            isMutating={isMutating}
          />
        )}
      </div>
    </>
  );
}
