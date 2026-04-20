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

function getLocalizedBudgetError(message: string, t: ReturnType<typeof useI18n>["t"]) {
  switch (message) {
    case "Budget not found.":
      return t("budgets.errors.notFound");
    case "This budget status transition is not allowed.":
      return t("budgets.errors.invalidStatusTransition");
    case "Approved budget cannot be reverted because no linked service order was found.":
      return t("budgets.errors.approvedRevertMissingServiceOrder");
    case "Approved budget can only be reverted when the linked service order is pending.":
      return t("budgets.errors.approvedRevertRequiresPendingServiceOrder");
    default:
      return message;
  }
}

async function parseResponse(response: Response, t: ReturnType<typeof useI18n>["t"]) {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(getLocalizedBudgetError(payload?.error || "Request failed.", t));
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
  const [isMutating, setIsMutating] = useState(false);

  const loadBudgets = async () => {
    setLoading(true);

    try {
      const payload = (await parseResponse(await fetch("/api/budgets", {
        cache: "no-store",
      }), t)) as BudgetsResponse;

      setBudgets(payload.budgets);
      setClients(payload.clients);
      setEquipment(payload.equipment);
      setServiceTypes(payload.serviceTypes);
      setOperators(payload.operators);
    } catch (loadError) {
      toast.error(loadError instanceof Error ? loadError.message : t("budgets.loadError"));
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

    try {
      await operation();
      await loadBudgets();
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
        t,
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
        t,
      );
    }, t("common.budgetUpdateSuccess"), t("budgets.updateError"));
  };

  const handleApproveBudget = async (id: string, reason?: string) => {
    await runMutation(async () => {
      await parseResponse(
        await fetch(`/api/budgets/${id}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "approved", reason }),
        }),
        t,
      );
    }, t("common.budgetApproveSuccess"), t("budgets.updateError"));
  };

  const handleCancelBudget = async (id: string, reason?: string) => {
    await runMutation(async () => {
      await parseResponse(
        await fetch(`/api/budgets/${id}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "cancelled", reason }),
        }),
        t,
      );
    }, t("common.budgetCancelSuccess"), t("budgets.updateError"));
  };

  const handleRevertBudget = async (id: string, reason?: string) => {
    await runMutation(async () => {
      await parseResponse(
        await fetch(`/api/budgets/${id}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "pending", reason }),
        }),
        t,
      );
    }, t("common.budgetRevertSuccess"), t("budgets.updateError"));
  };

  const handleCancelBudgets = async (ids: string[]) => {
    if (!ids.length) {
      return;
    }

    setIsMutating(true);

    try {
      const results = await Promise.allSettled(
        ids.map(async (id) => {
          await parseResponse(
            await fetch(`/api/budgets/${id}/status`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ status: "cancelled" }),
            }),
            t,
          );
        }),
      );

      const successCount = results.filter((result) => result.status === "fulfilled").length;
      const failedCount = ids.length - successCount;

      await loadBudgets();

      if (successCount > 0) {
        toast.success(t("common.bulkCancelSuccess", { count: successCount }));
      }

      if (failedCount > 0) {
        const message = t("common.bulkCancelPartialError", { failed: failedCount, total: ids.length });
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
          <h1 className="text-2xl font-bold tracking-tight">{t("budgets.title")}</h1>
        </div>
      </div>

      <div className="@container/main mt-2 px-4 lg:mt-4 lg:px-6">
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
            onCancelBudgets={handleCancelBudgets}
            isMutating={isMutating}
          />
        )}
      </div>
    </>
  );
}
