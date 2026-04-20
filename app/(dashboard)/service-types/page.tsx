"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { DataTable } from "./components/data-table";
import type { EquipmentOption } from "@/lib/equipment-admin";
import type {
  CreateServiceTypeInput,
  ManagedServiceType,
  UpdateServiceTypeInput,
} from "@/lib/service-types-admin";
import { useI18n } from "@/i18n/provider";

type ServiceTypesResponse = {
  serviceTypes: ManagedServiceType[];
  equipment: EquipmentOption[];
};

function getLocalizedServiceTypeError(message: string, t: ReturnType<typeof useI18n>["t"]) {
  switch (message) {
    case "Service type not found.":
      return t("serviceTypes.errors.notFound");
    case "Remove budgets linked to this service type before deleting it.":
      return t("serviceTypes.errors.removeLinkedBudgets");
    case "Remove linked equipment before deleting this service type.":
      return t("serviceTypes.errors.removeLinkedEquipment");
    case "Request failed.":
      return t("common.requestFailed");
    default:
      return message;
  }
}

async function parseResponse(response: Response, t: ReturnType<typeof useI18n>["t"]) {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(getLocalizedServiceTypeError(payload?.error || "Request failed.", t));
  }

  return payload;
}

export default function ServiceTypesPage() {
  const { t } = useI18n();
  const [serviceTypes, setServiceTypes] = useState<ManagedServiceType[]>([]);
  const [equipment, setEquipment] = useState<EquipmentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);

  const loadServiceTypes = async () => {
    setLoading(true);

    try {
      const payload = (await parseResponse(await fetch("/api/service-types", {
        cache: "no-store",
      }), t)) as ServiceTypesResponse;

      setServiceTypes(payload.serviceTypes);
      setEquipment(payload.equipment);
    } catch (loadError) {
      toast.error(loadError instanceof Error ? loadError.message : t("serviceTypes.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadServiceTypes();
  }, []);

  const runMutation = async (
    operation: () => Promise<void>,
    successMessage: string,
    fallbackErrorMessage: string,
  ) => {
    setIsMutating(true);

    try {
      await operation();
      await loadServiceTypes();
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

  const handleCreateServiceType = async (values: CreateServiceTypeInput) => {
    await runMutation(async () => {
      await parseResponse(
        await fetch("/api/service-types", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        }),
        t,
      );
    }, t("common.serviceTypeCreateSuccess"), t("serviceTypes.updateError"));
  };

  const handleUpdateServiceType = async (id: string, values: UpdateServiceTypeInput) => {
    await runMutation(async () => {
      await parseResponse(
        await fetch(`/api/service-types/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        }),
        t,
      );
    }, t("common.serviceTypeUpdateSuccess"), t("serviceTypes.updateError"));
  };

  const handleDeleteServiceType = async (id: string) => {
    await runMutation(async () => {
      await parseResponse(
        await fetch(`/api/service-types/${id}`, {
          method: "DELETE",
        }),
        t,
      );
    }, t("common.serviceTypeDeleteSuccess"), t("serviceTypes.updateError"));
  };

  const handleDeleteServiceTypes = async (ids: string[]) => {
    if (!ids.length) {
      return;
    }

    setIsMutating(true);

    try {
      const results = await Promise.allSettled(
        ids.map(async (id) => {
          await parseResponse(
            await fetch(`/api/service-types/${id}`, {
              method: "DELETE",
            }),
            t,
          );
        }),
      );

      const successCount = results.filter((result) => result.status === "fulfilled").length;
      const failedCount = ids.length - successCount;

      await loadServiceTypes();

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
          <h1 className="text-2xl font-bold tracking-tight">{t("serviceTypes.title")}</h1>
        </div>
      </div>

      <div className="@container/main mt-2 px-4 lg:mt-4 lg:px-6">
        {loading ? (
          <div className="rounded-md border px-6 py-10 text-sm text-muted-foreground">
            {t("common.loadingServiceTypes")}
          </div>
        ) : (
          <DataTable
            serviceTypes={serviceTypes}
            equipment={equipment}
            onCreateServiceType={handleCreateServiceType}
            onUpdateServiceType={handleUpdateServiceType}
            onDeleteServiceType={handleDeleteServiceType}
            onDeleteServiceTypes={handleDeleteServiceTypes}
            isMutating={isMutating}
          />
        )}
      </div>
    </>
  );
}
