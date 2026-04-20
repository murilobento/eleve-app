"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { DataTable } from "./components/data-table";
import type {
  CreateOperatorInput,
  ManagedOperator,
  UpdateOperatorInput,
} from "@/lib/operators-admin";
import { useI18n } from "@/i18n/provider";

type OperatorsResponse = {
  operators: ManagedOperator[];
};

function getLocalizedOperatorError(message: string, t: ReturnType<typeof useI18n>["t"]) {
  switch (message) {
    case "Operator not found.":
      return t("operators.errors.notFound");
    case "Remove budgets linked to this operator before deleting it.":
      return t("operators.errors.removeLinkedBudgets");
    case "Request failed.":
      return t("common.requestFailed");
    default:
      return message;
  }
}

async function parseResponse(response: Response, t: ReturnType<typeof useI18n>["t"]) {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(getLocalizedOperatorError(payload?.error || "Request failed.", t));
  }

  return payload;
}

export default function OperatorsPage() {
  const { t } = useI18n();
  const [operators, setOperators] = useState<ManagedOperator[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);

  const loadOperators = async () => {
    setLoading(true);

    try {
      const payload = (await parseResponse(await fetch("/api/operators", {
        cache: "no-store",
      }), t)) as OperatorsResponse;

      setOperators(payload.operators);
    } catch (loadError) {
      toast.error(loadError instanceof Error ? loadError.message : t("operators.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOperators();
  }, []);

  const runMutation = async (
    operation: () => Promise<void>,
    successMessage: string,
    fallbackErrorMessage: string,
  ) => {
    setIsMutating(true);

    try {
      await operation();
      await loadOperators();
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

  const handleCreateOperator = async (values: CreateOperatorInput) => {
    await runMutation(async () => {
      await parseResponse(
        await fetch("/api/operators", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        }),
        t,
      );
    }, t("common.operatorCreateSuccess"), t("operators.updateError"));
  };

  const handleUpdateOperator = async (id: string, values: UpdateOperatorInput) => {
    await runMutation(async () => {
      await parseResponse(
        await fetch(`/api/operators/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        }),
        t,
      );
    }, t("common.operatorUpdateSuccess"), t("operators.updateError"));
  };

  const handleDeleteOperator = async (id: string) => {
    await runMutation(async () => {
      await parseResponse(
        await fetch(`/api/operators/${id}`, {
          method: "DELETE",
        }),
        t,
      );
    }, t("common.operatorDeleteSuccess"), t("operators.updateError"));
  };

  const handleDeleteOperators = async (ids: string[]) => {
    if (!ids.length) {
      return;
    }

    setIsMutating(true);

    try {
      const results = await Promise.allSettled(
        ids.map(async (id) => {
          await parseResponse(
            await fetch(`/api/operators/${id}`, {
              method: "DELETE",
            }),
            t,
          );
        }),
      );

      const successCount = results.filter((result) => result.status === "fulfilled").length;
      const failedCount = ids.length - successCount;

      await loadOperators();

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
          <h1 className="text-2xl font-bold tracking-tight">{t("operators.title")}</h1>
        </div>
      </div>

      <div className="@container/main mt-2 px-4 lg:mt-4 lg:px-6">
        {loading ? (
          <div className="rounded-md border px-6 py-10 text-sm text-muted-foreground">
            {t("common.loadingOperators")}
          </div>
        ) : (
          <DataTable
            operators={operators}
            onCreateOperator={handleCreateOperator}
            onUpdateOperator={handleUpdateOperator}
            onDeleteOperator={handleDeleteOperator}
            onDeleteOperators={handleDeleteOperators}
            isMutating={isMutating}
          />
        )}
      </div>
    </>
  );
}
