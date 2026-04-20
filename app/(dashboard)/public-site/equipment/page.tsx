"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useResourcePermissions } from "@/hooks/use-resource-permissions";
import type { ManagedPublicEquipment, UpdatePublicEquipmentInput } from "@/lib/public-site-admin";

type AdminEquipmentResponse = {
  equipment: ManagedPublicEquipment[];
};

const EMPTY_EQUIPMENT: UpdatePublicEquipmentInput = {
  name: "",
  model: "",
  capacity: "",
  technicalInfo: "",
  manualUrl: undefined,
  imageUrl: "",
  displayOrder: 0,
  isPublished: true,
};

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || "Request failed.");
  }

  return payload as T;
}

export default function PublicSiteEquipmentPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [equipment, setEquipment] = useState<ManagedPublicEquipment[]>([]);
  const [newEquipment, setNewEquipment] = useState<UpdatePublicEquipmentInput>(EMPTY_EQUIPMENT);
  const { canRead, canCreate, canUpdate, canDelete } = useResourcePermissions("public-site");

  const loadEquipment = async () => {
    setIsLoading(true);

    try {
      const payload = await parseResponse<AdminEquipmentResponse>(
        await fetch("/api/public-site/equipment", { cache: "no-store" }),
      );
      setEquipment(payload.equipment);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao carregar equipamentos.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadEquipment();
  }, []);

  const runMutation = async (operation: () => Promise<void>, successMessage: string) => {
    setIsMutating(true);

    try {
      await operation();
      await loadEquipment();
      toast.success(successMessage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar alteracoes.");
    } finally {
      setIsMutating(false);
    }
  };

  return (
    <>
      <div className="px-4 lg:px-6">
        <h1 className="text-2xl font-bold tracking-tight">Site publico - Equipamentos</h1>
      </div>

      <div className="@container/main mt-2 px-4 lg:mt-4 lg:px-6">
        {isLoading ? (
          <div className="rounded-md border px-6 py-10 text-sm text-muted-foreground">
            Carregando equipamentos...
          </div>
        ) : null}

        {!isLoading && !canRead ? (
          <div className="rounded-md border px-6 py-10 text-sm text-muted-foreground">
            Sua conta nao possui permissao para visualizar esta secao.
          </div>
        ) : null}

        {!isLoading && canRead ? (
          <Card>
            <CardHeader>
              <CardTitle>Equipamentos em destaque da landing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 rounded-md border p-3 md:grid-cols-2 lg:grid-cols-8">
                <Input
                  placeholder="Nome"
                  value={newEquipment.name}
                  onChange={(event) => setNewEquipment((current) => ({ ...current, name: event.target.value }))}
                  className="lg:col-span-2"
                  disabled={!canCreate || isMutating}
                />
                <Input
                  placeholder="Modelo/Marca"
                  value={newEquipment.model}
                  onChange={(event) => setNewEquipment((current) => ({ ...current, model: event.target.value }))}
                  className="lg:col-span-2"
                  disabled={!canCreate || isMutating}
                />
                <Input
                  placeholder="Capacidade"
                  value={newEquipment.capacity}
                  onChange={(event) => setNewEquipment((current) => ({ ...current, capacity: event.target.value }))}
                  className="lg:col-span-1"
                  disabled={!canCreate || isMutating}
                />
                <Input
                  placeholder="Manual URL (opcional)"
                  value={newEquipment.manualUrl ?? ""}
                  onChange={(event) => setNewEquipment((current) => ({ ...current, manualUrl: event.target.value || undefined }))}
                  className="lg:col-span-3"
                  disabled={!canCreate || isMutating}
                />
                <Textarea
                  placeholder="Informacoes tecnicas"
                  value={newEquipment.technicalInfo}
                  onChange={(event) => setNewEquipment((current) => ({ ...current, technicalInfo: event.target.value }))}
                  className="min-h-24 md:col-span-2 lg:col-span-4"
                  disabled={!canCreate || isMutating}
                />
                <Input
                  placeholder="Imagem URL"
                  value={newEquipment.imageUrl}
                  onChange={(event) => setNewEquipment((current) => ({ ...current, imageUrl: event.target.value }))}
                  className="md:col-span-2 lg:col-span-3"
                  disabled={!canCreate || isMutating}
                />
                <Input
                  type="number"
                  placeholder="Ordem"
                  value={newEquipment.displayOrder}
                  onChange={(event) => setNewEquipment((current) => ({ ...current, displayOrder: Number(event.target.value || 0) }))}
                  className="lg:col-span-1"
                  disabled={!canCreate || isMutating}
                />
                <div className="flex items-center justify-between gap-2 md:col-span-2 lg:col-span-8">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={newEquipment.isPublished}
                      onCheckedChange={(checked) => setNewEquipment((current) => ({ ...current, isPublished: checked === true }))}
                      disabled={!canCreate || isMutating}
                    />
                    Publicado
                  </label>
                  <Button
                    disabled={!canCreate || isMutating}
                    onClick={() => runMutation(async () => {
                      await parseResponse(
                        await fetch("/api/public-site/equipment", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify(newEquipment),
                        }),
                      );
                      setNewEquipment(EMPTY_EQUIPMENT);
                    }, "Equipamento criado com sucesso.")}
                  >
                    Criar
                  </Button>
                </div>
              </div>

              {equipment.map((item) => (
                <div key={item.id} className="grid gap-3 rounded-md border p-3 md:grid-cols-2 lg:grid-cols-8">
                  <Input
                    value={item.name}
                    onChange={(event) => setEquipment((current) => current.map((entry) => (
                      entry.id === item.id ? { ...entry, name: event.target.value } : entry
                    )))}
                    className="lg:col-span-2"
                    disabled={!canUpdate || isMutating}
                  />
                  <Input
                    value={item.model}
                    onChange={(event) => setEquipment((current) => current.map((entry) => (
                      entry.id === item.id ? { ...entry, model: event.target.value } : entry
                    )))}
                    className="lg:col-span-2"
                    disabled={!canUpdate || isMutating}
                  />
                  <Input
                    value={item.capacity}
                    onChange={(event) => setEquipment((current) => current.map((entry) => (
                      entry.id === item.id ? { ...entry, capacity: event.target.value } : entry
                    )))}
                    className="lg:col-span-1"
                    disabled={!canUpdate || isMutating}
                  />
                  <Input
                    value={item.manualUrl ?? ""}
                    placeholder="Manual URL (opcional)"
                    onChange={(event) => setEquipment((current) => current.map((entry) => (
                      entry.id === item.id ? { ...entry, manualUrl: event.target.value || null } : entry
                    )))}
                    className="lg:col-span-3"
                    disabled={!canUpdate || isMutating}
                  />
                  <Textarea
                    value={item.technicalInfo}
                    placeholder="Informacoes tecnicas"
                    onChange={(event) => setEquipment((current) => current.map((entry) => (
                      entry.id === item.id ? { ...entry, technicalInfo: event.target.value } : entry
                    )))}
                    className="min-h-24 md:col-span-2 lg:col-span-4"
                    disabled={!canUpdate || isMutating}
                  />
                  <Input
                    value={item.imageUrl}
                    onChange={(event) => setEquipment((current) => current.map((entry) => (
                      entry.id === item.id ? { ...entry, imageUrl: event.target.value } : entry
                    )))}
                    className="md:col-span-2 lg:col-span-3"
                    disabled={!canUpdate || isMutating}
                  />
                  <Input
                    type="number"
                    value={item.displayOrder}
                    onChange={(event) => setEquipment((current) => current.map((entry) => (
                      entry.id === item.id ? { ...entry, displayOrder: Number(event.target.value || 0) } : entry
                    )))}
                    className="lg:col-span-1"
                    disabled={!canUpdate || isMutating}
                  />
                  <div className="flex items-center justify-between gap-2 md:col-span-2 lg:col-span-8">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={item.isPublished}
                        onCheckedChange={(checked) => setEquipment((current) => current.map((entry) => (
                          entry.id === item.id ? { ...entry, isPublished: checked === true } : entry
                        )))}
                        disabled={!canUpdate || isMutating}
                      />
                      Publicado
                    </label>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        disabled={!canUpdate || isMutating}
                        onClick={() => runMutation(async () => {
                          await parseResponse(
                            await fetch(`/api/public-site/equipment/${item.id}`, {
                              method: "PUT",
                              headers: {
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify({
                                name: item.name,
                                model: item.model,
                                capacity: item.capacity,
                                technicalInfo: item.technicalInfo,
                                manualUrl: item.manualUrl ?? undefined,
                                imageUrl: item.imageUrl,
                                displayOrder: item.displayOrder,
                                isPublished: item.isPublished,
                              }),
                            }),
                          );
                        }, "Equipamento atualizado.")}
                      >
                        Salvar
                      </Button>
                      <Button
                        variant="destructive"
                        disabled={!canDelete || isMutating}
                        onClick={() => runMutation(async () => {
                          await parseResponse(
                            await fetch(`/api/public-site/equipment/${item.id}`, { method: "DELETE" }),
                          );
                        }, "Equipamento removido.")}
                      >
                        Excluir
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </>
  );
}
