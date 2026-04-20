"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { DataTable } from "./components/data-table";
import type {
  CreateEquipmentTypeInput,
  ManagedEquipmentType,
  UpdateEquipmentTypeInput,
} from "@/lib/equipment-types-admin";
import { useI18n } from "@/i18n/provider";

type EquipmentTypesResponse = {
  equipmentTypes: ManagedEquipmentType[];
};

function getLocalizedEquipmentTypeError(message: string, t: ReturnType<typeof useI18n>["t"]) {
  switch (message) {
    case "Equipment type not found.":
      return t("equipmentTypes.errors.notFound");
    case "Remove equipment linked to this type before deleting it.":
      return t("equipmentTypes.errors.removeLinkedEquipment");
    case "Request failed.":
      return t("common.requestFailed");
    default:
      return message;
  }
}

async function parseResponse(response: Response, t: ReturnType<typeof useI18n>["t"]) {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(getLocalizedEquipmentTypeError(payload?.error || "Request failed.", t));
  }

  return payload;
}

export default function EquipmentTypesPage() {
  const { t } = useI18n();
  const [equipmentTypes, setEquipmentTypes] = useState<ManagedEquipmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);

  const loadEquipmentTypes = async () => {
    setLoading(true);

    try {
      const payload = (await parseResponse(await fetch("/api/equipment-types", {
        cache: "no-store",
      }), t)) as EquipmentTypesResponse;

      setEquipmentTypes(payload.equipmentTypes);
    } catch (loadError) {
      toast.error(loadError instanceof Error ? loadError.message : t("equipmentTypes.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadEquipmentTypes();
  }, []);

  const runMutation = async (
    operation: () => Promise<void>,
    successMessage: string,
    fallbackErrorMessage: string,
  ) => {
    setIsMutating(true);

    try {
      await operation();
      await loadEquipmentTypes();
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

  const handleCreateEquipmentType = async (values: CreateEquipmentTypeInput) => {
    await runMutation(async () => {
      await parseResponse(
        await fetch("/api/equipment-types", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        }),
        t,
      );
    }, t("common.equipmentTypeCreateSuccess"), t("equipmentTypes.updateError"));
  };

  const handleUpdateEquipmentType = async (id: string, values: UpdateEquipmentTypeInput) => {
    await runMutation(async () => {
      await parseResponse(
        await fetch(`/api/equipment-types/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        }),
        t,
      );
    }, t("common.equipmentTypeUpdateSuccess"), t("equipmentTypes.updateError"));
  };

  const handleDeleteEquipmentType = async (id: string) => {
    await runMutation(async () => {
      await parseResponse(
        await fetch(`/api/equipment-types/${id}`, {
          method: "DELETE",
        }),
        t,
      );
    }, t("common.equipmentTypeDeleteSuccess"), t("equipmentTypes.updateError"));
  };

  const handleDeleteEquipmentTypes = async (ids: string[]) => {
    if (!ids.length) {
      return;
    }

    setIsMutating(true);

    try {
      const results = await Promise.allSettled(
        ids.map(async (id) => {
          await parseResponse(
            await fetch(`/api/equipment-types/${id}`, {
              method: "DELETE",
            }),
            t,
          );
        }),
      );

      const successCount = results.filter((result) => result.status === "fulfilled").length;
      const failedCount = ids.length - successCount;

      await loadEquipmentTypes();

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
          <h1 className="text-2xl font-bold tracking-tight">{t("equipmentTypes.title")}</h1>
        </div>
      </div>

      <div className="@container/main mt-2 px-4 lg:mt-4 lg:px-6">
        {loading ? (
          <div className="rounded-md border px-6 py-10 text-sm text-muted-foreground">
            {t("common.loadingEquipmentTypes")}
          </div>
        ) : (
          <DataTable
            equipmentTypes={equipmentTypes}
            onCreateEquipmentType={handleCreateEquipmentType}
            onUpdateEquipmentType={handleUpdateEquipmentType}
            onDeleteEquipmentType={handleDeleteEquipmentType}
            onDeleteEquipmentTypes={handleDeleteEquipmentTypes}
            isMutating={isMutating}
          />
        )}
      </div>
    </>
  );
}
