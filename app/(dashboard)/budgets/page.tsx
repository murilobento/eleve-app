"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { DataTable } from "./components/data-table";
import type { CreateBudgetInput, ManagedBudget, UpdateBudgetInput } from "@/lib/budgets-admin";
import type { ManagedClient } from "@/lib/clients-admin";
import type { EquipmentOption } from "@/lib/equipment-admin";
import type { ManagedOperator } from "@/lib/operators-admin";
import type { ManagedServiceType } from "@/lib/service-types-admin";
import { useI18n } from "@/i18n/provider";

type BudgetsResponse = {
  budgets: ManagedBudget[];
  clients: ManagedClient[];
  equipment: EquipmentOption[];
  serviceTypes: ManagedServiceType[];
  operators: ManagedOperator[];
};

async function parseResponse(response: Response) {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || "Request failed.");
  }

  return payload;
}

export default function BudgetsPage() {
  const { t } = useI18n();
  const [budgets, setBudgets] = useState<ManagedBudget[]>([]);
  const [clients, setClients] = useState<ManagedClient[]>([]);
  const [equipment, setEquipment] = useState<EquipmentOption[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ManagedServiceType[]>([]);
  const [operators, setOperators] = useState<ManagedOperator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  const loadBudgets = async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = (await parseResponse(await fetch("/api/budgets", {
        cache: "no-store",
      }))) as BudgetsResponse;

      setBudgets(payload.budgets);
      setClients(payload.clients);
      setEquipment(payload.equipment);
      setServiceTypes(payload.serviceTypes);
      setOperators(payload.operators);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t("budgets.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBudgets();
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
      await loadBudgets();
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

  const handleCreateBudget = async (values: CreateBudgetInput) => {
    await runMutation(async () => {
      await parseResponse(
        await fetch("/api/budgets", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        }),
      );
    }, t("common.budgetCreateSuccess"), t("budgets.updateError"));
  };

  const handleUpdateBudget = async (id: string, values: UpdateBudgetInput) => {
    await runMutation(async () => {
      await parseResponse(
        await fetch(`/api/budgets/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        }),
      );
    }, t("common.budgetUpdateSuccess"), t("budgets.updateError"));
  };

  const handleApproveBudget = async (id: string) => {
    await runMutation(async () => {
      await parseResponse(
        await fetch(`/api/budgets/${id}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "approved" }),
        }),
      );
    }, t("common.budgetApproveSuccess"), t("budgets.updateError"));
  };

  const handleCancelBudget = async (id: string) => {
    await runMutation(async () => {
      await parseResponse(
        await fetch(`/api/budgets/${id}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "cancelled" }),
        }),
      );
    }, t("common.budgetCancelSuccess"), t("budgets.updateError"));
  };

  const handleRevertBudget = async (id: string) => {
    await runMutation(async () => {
      await parseResponse(
        await fetch(`/api/budgets/${id}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "pending" }),
        }),
      );
    }, t("common.budgetRevertSuccess"), t("budgets.updateError"));
  };

  return (
    <>
      <div className="px-4 lg:px-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{t("budgets.title")}</h1>
          <p className="text-muted-foreground">{t("budgets.description")}</p>
        </div>
      </div>

      <div className="@container/main mt-2 px-4 lg:mt-4 lg:px-6">
        {error ? (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-md border px-6 py-10 text-sm text-muted-foreground">
            {t("common.loadingBudgets")}
          </div>
        ) : (
          <DataTable
            budgets={budgets}
            clients={clients}
            equipment={equipment}
            serviceTypes={serviceTypes}
            operators={operators}
            onCreateBudget={handleCreateBudget}
            onUpdateBudget={handleUpdateBudget}
            onApproveBudget={handleApproveBudget}
            onCancelBudget={handleCancelBudget}
            onRevertBudget={handleRevertBudget}
            isMutating={isMutating}
          />
        )}
      </div>
    </>
  );
}
