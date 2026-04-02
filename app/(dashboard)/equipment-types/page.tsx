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

async function parseResponse(response: Response) {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || "Request failed.");
  }

  return payload;
}

export default function EquipmentTypesPage() {
  const { t } = useI18n();
  const [equipmentTypes, setEquipmentTypes] = useState<ManagedEquipmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  const loadEquipmentTypes = async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = (await parseResponse(await fetch("/api/equipment-types", {
        cache: "no-store",
      }))) as EquipmentTypesResponse;

      setEquipmentTypes(payload.equipmentTypes);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t("equipmentTypes.loadError"));
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
    setError(null);

    try {
      await operation();
      await loadEquipmentTypes();
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
      );
    }, t("common.equipmentTypeUpdateSuccess"), t("equipmentTypes.updateError"));
  };

  const handleDeleteEquipmentType = async (id: string) => {
    await runMutation(async () => {
      await parseResponse(
        await fetch(`/api/equipment-types/${id}`, {
          method: "DELETE",
        }),
      );
    }, t("common.equipmentTypeDeleteSuccess"), t("equipmentTypes.updateError"));
  };

  return (
    <>
      <div className="px-4 lg:px-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{t("equipmentTypes.title")}</h1>
          <p className="text-muted-foreground">{t("equipmentTypes.description")}</p>
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
            {t("common.loadingEquipmentTypes")}
          </div>
        ) : (
          <DataTable
            equipmentTypes={equipmentTypes}
            onCreateEquipmentType={handleCreateEquipmentType}
            onUpdateEquipmentType={handleUpdateEquipmentType}
            onDeleteEquipmentType={handleDeleteEquipmentType}
            isMutating={isMutating}
          />
        )}
      </div>
    </>
  );
}
