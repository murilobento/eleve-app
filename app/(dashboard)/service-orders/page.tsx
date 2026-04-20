"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { DataTable } from "./components/data-table";
import type { ManagedClient } from "@/lib/clients-admin";
import type { EquipmentOption } from "@/lib/equipment-admin";
import type { ManagedOperator } from "@/lib/operators-admin";
import type {
  CreateServiceOrderInput,
  ManagedServiceOrder,
  UpdateServiceOrderInput,
} from "@/lib/service-orders-admin";
import type { ManagedServiceType } from "@/lib/service-types-admin";
import { useI18n } from "@/i18n/provider";

type ServiceOrdersResponse = {
  serviceOrders: ManagedServiceOrder[];
  clients: ManagedClient[];
  equipment: EquipmentOption[];
  serviceTypes: ManagedServiceType[];
  operators: ManagedOperator[];
};

function getLocalizedServiceOrderError(message: string, t: ReturnType<typeof useI18n>["t"]) {
  switch (message) {
    case "Service order not found.":
      return t("serviceOrders.errors.notFound");
    case "This service order status transition is not allowed.":
      return t("serviceOrders.errors.invalidStatusTransition");
    case "Completed or cancelled service orders cannot be edited.":
      return t("serviceOrders.errors.editLocked");
    case "Only approved budgets can originate service orders.":
      return t("serviceOrders.errors.originBudgetRequiredApproved");
    case "Only approved budgets can generate service orders.":
      return t("serviceOrders.errors.generateFromApprovedBudgetOnly");
    case "Budget not found.":
      return t("budgets.errors.notFound");
    default:
      return message;
  }
}

async function parseResponse(response: Response, t: ReturnType<typeof useI18n>["t"]) {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(getLocalizedServiceOrderError(payload?.error || "Request failed.", t));
  }

  return payload;
}

export default function ServiceOrdersPage() {
  const { t } = useI18n();
  const [serviceOrders, setServiceOrders] = useState<ManagedServiceOrder[]>([]);
  const [clients, setClients] = useState<ManagedClient[]>([]);
  const [equipment, setEquipment] = useState<EquipmentOption[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ManagedServiceType[]>([]);
  const [operators, setOperators] = useState<ManagedOperator[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [openCreateDialogFromQuery, setOpenCreateDialogFromQuery] = useState(false);
  const [editServiceOrderIdFromQuery, setEditServiceOrderIdFromQuery] = useState<string | null>(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const shouldOpenCreate = searchParams.get("create") === "1";
    const editServiceOrderId = searchParams.get("edit");

    if (!shouldOpenCreate && !editServiceOrderId) {
      return;
    }

    if (shouldOpenCreate) {
      setOpenCreateDialogFromQuery(true);
    }

    if (editServiceOrderId) {
      setEditServiceOrderIdFromQuery(editServiceOrderId);
    }

    searchParams.delete("create");
    searchParams.delete("edit");
    const nextSearch = searchParams.toString();
    const nextUrl = nextSearch ? `${window.location.pathname}?${nextSearch}` : window.location.pathname;
    window.history.replaceState({}, "", nextUrl);
  }, []);

  const loadServiceOrders = async () => {
    setLoading(true);

    try {
      const payload = (await parseResponse(await fetch("/api/service-orders", {
        cache: "no-store",
      }), t)) as ServiceOrdersResponse;

      setServiceOrders(payload.serviceOrders);
      setClients(payload.clients);
      setEquipment(payload.equipment);
      setServiceTypes(payload.serviceTypes);
      setOperators(payload.operators);
    } catch (loadError) {
      toast.error(loadError instanceof Error ? loadError.message : t("serviceOrders.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadServiceOrders();
  }, []);

  const runMutation = async (
    operation: () => Promise<void>,
    successMessage: string,
    fallbackErrorMessage: string,
  ) => {
    setIsMutating(true);

    try {
      await operation();
      await loadServiceOrders();
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

  const handleCreateServiceOrder = async (values: CreateServiceOrderInput) => {
    await runMutation(async () => {
      await parseResponse(
        await fetch("/api/service-orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        }),
        t,
      );
    }, t("common.serviceOrderCreateSuccess"), t("serviceOrders.updateError"));
  };

  const handleUpdateServiceOrder = async (id: string, values: UpdateServiceOrderInput) => {
    await runMutation(async () => {
      await parseResponse(
        await fetch(`/api/service-orders/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        }),
        t,
      );
    }, t("common.serviceOrderUpdateSuccess"), t("serviceOrders.updateError"));
  };

  const handleStatusChange = async (
    id: string,
    status: "pending" | "scheduled" | "in_progress" | "completed" | "cancelled",
    reason?: string,
  ) => {
    const successKeyByStatus = {
      pending: "common.serviceOrderRevertSuccess",
      scheduled: "common.serviceOrderScheduleSuccess",
      in_progress: "common.serviceOrderStartSuccess",
      completed: "common.serviceOrderCompleteSuccess",
      cancelled: "common.serviceOrderCancelSuccess",
    } as const;

    await runMutation(async () => {
      await parseResponse(
        await fetch(`/api/service-orders/${id}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status, reason }),
        }),
        t,
      );
    }, t(successKeyByStatus[status]), t("serviceOrders.updateError"));
  };

  const handleCancelServiceOrders = async (ids: string[]) => {
    if (!ids.length) {
      return;
    }

    setIsMutating(true);

    try {
      const results = await Promise.allSettled(
        ids.map(async (id) => {
          await parseResponse(
            await fetch(`/api/service-orders/${id}/status`, {
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

      await loadServiceOrders();

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
          <h1 className="text-2xl font-bold tracking-tight">{t("serviceOrders.title")}</h1>
        </div>
      </div>

      <div className="@container/main mt-2 px-4 lg:mt-4 lg:px-6">
        {loading ? (
          <div className="rounded-md border px-6 py-10 text-sm text-muted-foreground">
            {t("common.loadingServiceOrders")}
          </div>
        ) : (
          <DataTable
            serviceOrders={serviceOrders}
            clients={clients}
            equipment={equipment}
            serviceTypes={serviceTypes}
            operators={operators}
            openCreateDialogFromQuery={openCreateDialogFromQuery}
            editServiceOrderIdFromQuery={editServiceOrderIdFromQuery}
            onCreateServiceOrder={handleCreateServiceOrder}
            onUpdateServiceOrder={handleUpdateServiceOrder}
            onChangeStatus={handleStatusChange}
            onCancelServiceOrders={handleCancelServiceOrders}
            isMutating={isMutating}
          />
        )}
      </div>
    </>
  );
}
