"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { DataTable } from "./components/data-table";
import type {
  CreateEquipmentInput,
  ManagedEquipment,
  UpdateEquipmentInput,
} from "@/lib/equipment-admin";
import type { ManagedEquipmentType } from "@/lib/equipment-types-admin";
import { useI18n } from "@/i18n/provider";

type EquipmentResponse = {
  equipment: ManagedEquipment[];
  equipmentTypes: ManagedEquipmentType[];
};

function getLocalizedEquipmentError(message: string, t: ReturnType<typeof useI18n>["t"]) {
  switch (message) {
    case "Equipment not found.":
      return t("equipment.errors.notFound");
    case "Equipment type not found.":
      return t("equipment.errors.typeNotFound");
    case "Remove budgets linked to this equipment before deleting it.":
      return t("equipment.errors.removeLinkedBudgets");
    case "Remove maintenance records linked to this equipment before deleting it.":
      return t("equipment.errors.removeLinkedMaintenance");
    case "Remove fuel records linked to this equipment before deleting it.":
      return t("equipment.errors.removeLinkedFuel");
    case "Remove maintenance requisitions linked to this equipment before deleting it.":
      return t("equipment.errors.removeLinkedMaintenanceRequisitions");
    case "Remove fuel requisitions linked to this equipment before deleting it.":
      return t("equipment.errors.removeLinkedFuelRequisitions");
    case "Remove parts requisitions linked to this equipment before deleting it.":
      return t("equipment.errors.removeLinkedPartsRequisitions");
    case "Request failed.":
      return t("common.requestFailed");
    default:
      return message;
  }
}

async function parseResponse(response: Response, t: ReturnType<typeof useI18n>["t"]) {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(getLocalizedEquipmentError(payload?.error || "Request failed.", t));
  }

  return payload;
}

export default function EquipmentPage() {
  const { t } = useI18n();
  const [equipment, setEquipment] = useState<ManagedEquipment[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<ManagedEquipmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);

  const loadEquipment = async () => {
    setLoading(true);

    try {
      const payload = (await parseResponse(await fetch("/api/equipment", {
        cache: "no-store",
      }), t)) as EquipmentResponse;

      setEquipment(payload.equipment);
      setEquipmentTypes(payload.equipmentTypes);
    } catch (loadError) {
      toast.error(loadError instanceof Error ? loadError.message : t("equipment.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadEquipment();
  }, []);

  const runMutation = async (
    operation: () => Promise<void>,
    successMessage: string,
    fallbackErrorMessage: string,
  ) => {
    setIsMutating(true);

    try {
      await operation();
      await loadEquipment();
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

  const handleCreateEquipment = async (values: CreateEquipmentInput) => {
    await runMutation(async () => {
      await parseResponse(
        await fetch("/api/equipment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        }),
        t,
      );
    }, t("common.equipmentCreateSuccess"), t("equipment.updateError"));
  };

  const handleUpdateEquipment = async (id: string, values: UpdateEquipmentInput) => {
    await runMutation(async () => {
      await parseResponse(
        await fetch(`/api/equipment/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        }),
        t,
      );
    }, t("common.equipmentUpdateSuccess"), t("equipment.updateError"));
  };

  const handleDeleteEquipment = async (id: string) => {
    await runMutation(async () => {
      await parseResponse(
        await fetch(`/api/equipment/${id}`, {
          method: "DELETE",
        }),
        t,
      );
    }, t("common.equipmentDeleteSuccess"), t("equipment.updateError"));
  };

  const handleDeleteEquipmentItems = async (ids: string[]) => {
    if (!ids.length) {
      return;
    }

    setIsMutating(true);

    try {
      const results = await Promise.allSettled(
        ids.map(async (id) => {
          await parseResponse(
            await fetch(`/api/equipment/${id}`, {
              method: "DELETE",
            }),
            t,
          );
        }),
      );

      const successCount = results.filter((result) => result.status === "fulfilled").length;
      const failedCount = ids.length - successCount;

      await loadEquipment();

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
          <h1 className="text-2xl font-bold tracking-tight">{t("equipment.title")}</h1>
        </div>
      </div>

      <div className="@container/main mt-2 px-4 lg:mt-4 lg:px-6">
        {!loading && equipmentTypes.length === 0 ? (
          <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
            {t("equipment.emptyTypesHint")}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-md border px-6 py-10 text-sm text-muted-foreground">
            {t("common.loadingEquipment")}
          </div>
        ) : (
          <DataTable
            equipment={equipment}
            equipmentTypes={equipmentTypes}
            onCreateEquipment={handleCreateEquipment}
            onUpdateEquipment={handleUpdateEquipment}
            onDeleteEquipment={handleDeleteEquipment}
            onDeleteEquipmentItems={handleDeleteEquipmentItems}
            isMutating={isMutating}
          />
        )}
      </div>
    </>
  );
}
