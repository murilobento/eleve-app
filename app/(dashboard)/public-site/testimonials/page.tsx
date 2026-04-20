"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useResourcePermissions } from "@/hooks/use-resource-permissions";
import type { ManagedPublicTestimonial, UpdatePublicTestimonialInput } from "@/lib/public-site-admin";

type AdminTestimonialsResponse = {
  testimonials: ManagedPublicTestimonial[];
};

const EMPTY_TESTIMONIAL: UpdatePublicTestimonialInput = {
  name: "",
  role: "",
  quote: "",
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

export default function PublicSiteTestimonialsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [testimonials, setTestimonials] = useState<ManagedPublicTestimonial[]>([]);
  const [newTestimonial, setNewTestimonial] = useState<UpdatePublicTestimonialInput>(EMPTY_TESTIMONIAL);
  const { canRead, canCreate, canUpdate, canDelete } = useResourcePermissions("public-site");

  const loadTestimonials = async () => {
    setIsLoading(true);

    try {
      const payload = await parseResponse<AdminTestimonialsResponse>(
        await fetch("/api/public-site/testimonials", { cache: "no-store" }),
      );
      setTestimonials(payload.testimonials);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao carregar depoimentos.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadTestimonials();
  }, []);

  const runMutation = async (operation: () => Promise<void>, successMessage: string) => {
    setIsMutating(true);

    try {
      await operation();
      await loadTestimonials();
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
        <h1 className="text-2xl font-bold tracking-tight">Site publico - Depoimentos</h1>
      </div>

      <div className="@container/main mt-2 px-4 lg:mt-4 lg:px-6">
        {isLoading ? (
          <div className="rounded-md border px-6 py-10 text-sm text-muted-foreground">
            Carregando depoimentos...
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
              <CardTitle>Depoimentos da landing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 rounded-md border p-3 md:grid-cols-2">
                <Input
                  placeholder="Nome"
                  value={newTestimonial.name}
                  onChange={(event) => setNewTestimonial((current) => ({ ...current, name: event.target.value }))}
                  disabled={!canCreate || isMutating}
                />
                <Input
                  placeholder="Cargo/Funcao"
                  value={newTestimonial.role}
                  onChange={(event) => setNewTestimonial((current) => ({ ...current, role: event.target.value }))}
                  disabled={!canCreate || isMutating}
                />
                <Input
                  placeholder="Imagem URL (opcional)"
                  value={newTestimonial.imageUrl ?? ""}
                  onChange={(event) => setNewTestimonial((current) => ({ ...current, imageUrl: event.target.value }))}
                  disabled={!canCreate || isMutating}
                />
                <Input
                  type="number"
                  placeholder="Ordem"
                  value={newTestimonial.displayOrder}
                  onChange={(event) => setNewTestimonial((current) => ({ ...current, displayOrder: Number(event.target.value || 0) }))}
                  disabled={!canCreate || isMutating}
                />
                <Textarea
                  placeholder="Depoimento"
                  value={newTestimonial.quote}
                  onChange={(event) => setNewTestimonial((current) => ({ ...current, quote: event.target.value }))}
                  rows={3}
                  className="md:col-span-2"
                  disabled={!canCreate || isMutating}
                />
                <div className="flex items-center justify-between gap-2 md:col-span-2">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={newTestimonial.isPublished}
                      onCheckedChange={(checked) => setNewTestimonial((current) => ({ ...current, isPublished: checked === true }))}
                      disabled={!canCreate || isMutating}
                    />
                    Publicado
                  </label>
                  <Button
                    disabled={!canCreate || isMutating}
                    onClick={() => runMutation(async () => {
                      await parseResponse(
                        await fetch("/api/public-site/testimonials", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify(newTestimonial),
                        }),
                      );
                      setNewTestimonial(EMPTY_TESTIMONIAL);
                    }, "Depoimento criado com sucesso.")}
                  >
                    Criar
                  </Button>
                </div>
              </div>

              {testimonials.map((item) => (
                <div key={item.id} className="grid gap-3 rounded-md border p-3 md:grid-cols-2">
                  <Input
                    value={item.name}
                    onChange={(event) => setTestimonials((current) => current.map((entry) => (
                      entry.id === item.id ? { ...entry, name: event.target.value } : entry
                    )))}
                    disabled={!canUpdate || isMutating}
                  />
                  <Input
                    value={item.role}
                    onChange={(event) => setTestimonials((current) => current.map((entry) => (
                      entry.id === item.id ? { ...entry, role: event.target.value } : entry
                    )))}
                    disabled={!canUpdate || isMutating}
                  />
                  <Input
                    value={item.imageUrl ?? ""}
                    onChange={(event) => setTestimonials((current) => current.map((entry) => (
                      entry.id === item.id ? { ...entry, imageUrl: event.target.value || null } : entry
                    )))}
                    disabled={!canUpdate || isMutating}
                  />
                  <Input
                    type="number"
                    value={item.displayOrder}
                    onChange={(event) => setTestimonials((current) => current.map((entry) => (
                      entry.id === item.id ? { ...entry, displayOrder: Number(event.target.value || 0) } : entry
                    )))}
                    disabled={!canUpdate || isMutating}
                  />
                  <Textarea
                    value={item.quote}
                    onChange={(event) => setTestimonials((current) => current.map((entry) => (
                      entry.id === item.id ? { ...entry, quote: event.target.value } : entry
                    )))}
                    rows={3}
                    className="md:col-span-2"
                    disabled={!canUpdate || isMutating}
                  />
                  <div className="flex items-center justify-between gap-2 md:col-span-2">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={item.isPublished}
                        onCheckedChange={(checked) => setTestimonials((current) => current.map((entry) => (
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
                            await fetch(`/api/public-site/testimonials/${item.id}`, {
                              method: "PUT",
                              headers: {
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify({
                                name: item.name,
                                role: item.role,
                                quote: item.quote,
                                imageUrl: item.imageUrl ?? "",
                                displayOrder: item.displayOrder,
                                isPublished: item.isPublished,
                              }),
                            }),
                          );
                        }, "Depoimento atualizado.")}
                      >
                        Salvar
                      </Button>
                      <Button
                        variant="destructive"
                        disabled={!canDelete || isMutating}
                        onClick={() => runMutation(async () => {
                          await parseResponse(
                            await fetch(`/api/public-site/testimonials/${item.id}`, { method: "DELETE" }),
                          );
                        }, "Depoimento removido.")}
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
