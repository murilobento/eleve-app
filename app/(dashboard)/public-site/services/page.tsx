"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useResourcePermissions } from "@/hooks/use-resource-permissions";
import type { ManagedPublicService, UpdatePublicServiceInput } from "@/lib/public-site-admin";

type AdminServicesResponse = {
  services: ManagedPublicService[];
};

const EMPTY_SERVICE: UpdatePublicServiceInput = {
  tag: "",
  title: "",
  description: "",
  imageUrl: "",
  displayOrder: 0,
  isPublished: true,
  slug: "",
  seoTitle: "",
  seoDescription: "",
  pageContent: "",
  imageAlt: "",
};

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || "Request failed.");
  }

  return payload as T;
}

export default function PublicSiteServicesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [services, setServices] = useState<ManagedPublicService[]>([]);
  const [newService, setNewService] = useState<UpdatePublicServiceInput>(EMPTY_SERVICE);
  const { canRead, canCreate, canUpdate, canDelete } = useResourcePermissions("public-site");

  const loadServices = async () => {
    setIsLoading(true);

    try {
      const payload = await parseResponse<AdminServicesResponse>(
        await fetch("/api/public-site/services", { cache: "no-store" }),
      );
      setServices(payload.services);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao carregar servicos.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadServices();
  }, []);

  const runMutation = async (operation: () => Promise<void>, successMessage: string) => {
    setIsMutating(true);

    try {
      await operation();
      await loadServices();
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
        <h1 className="text-2xl font-bold tracking-tight">Site publico - Servicos</h1>
      </div>

      <div className="@container/main mt-2 px-4 lg:mt-4 lg:px-6">
        {isLoading ? (
          <div className="rounded-md border px-6 py-10 text-sm text-muted-foreground">
            Carregando servicos...
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
              <CardTitle>Servicos publicados na landing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 rounded-md border p-3 md:grid-cols-2 lg:grid-cols-6">
                <Input
                  placeholder="Tag"
                  value={newService.tag}
                  onChange={(event) => setNewService((current) => ({ ...current, tag: event.target.value }))}
                  disabled={!canCreate || isMutating}
                />
                <Input
                  placeholder="Titulo"
                  value={newService.title}
                  onChange={(event) => setNewService((current) => ({ ...current, title: event.target.value }))}
                  disabled={!canCreate || isMutating}
                />
                <Input
                  placeholder="Slug SEO"
                  value={newService.slug ?? ""}
                  onChange={(event) => setNewService((current) => ({ ...current, slug: event.target.value }))}
                  disabled={!canCreate || isMutating}
                />
                <Input
                  placeholder="Imagem URL"
                  value={newService.imageUrl}
                  onChange={(event) => setNewService((current) => ({ ...current, imageUrl: event.target.value }))}
                  disabled={!canCreate || isMutating}
                />
                <Input
                  type="number"
                  placeholder="Ordem"
                  value={newService.displayOrder}
                  onChange={(event) => setNewService((current) => ({ ...current, displayOrder: Number(event.target.value || 0) }))}
                  disabled={!canCreate || isMutating}
                />
                <Input
                  placeholder="Descricao (opcional)"
                  value={newService.description ?? ""}
                  onChange={(event) => setNewService((current) => ({ ...current, description: event.target.value }))}
                  disabled={!canCreate || isMutating}
                />
                <Input
                  placeholder="Alt da imagem"
                  value={newService.imageAlt ?? ""}
                  onChange={(event) => setNewService((current) => ({ ...current, imageAlt: event.target.value }))}
                  disabled={!canCreate || isMutating}
                />
                <Input
                  placeholder="SEO title"
                  value={newService.seoTitle ?? ""}
                  onChange={(event) => setNewService((current) => ({ ...current, seoTitle: event.target.value }))}
                  className="lg:col-span-2"
                  disabled={!canCreate || isMutating}
                />
                <Input
                  placeholder="SEO description"
                  value={newService.seoDescription ?? ""}
                  onChange={(event) => setNewService((current) => ({ ...current, seoDescription: event.target.value }))}
                  className="lg:col-span-4"
                  disabled={!canCreate || isMutating}
                />
                <Textarea
                  placeholder="Conteudo da pagina SEO"
                  value={newService.pageContent ?? ""}
                  onChange={(event) => setNewService((current) => ({ ...current, pageContent: event.target.value }))}
                  className="min-h-24 md:col-span-2 lg:col-span-6"
                  disabled={!canCreate || isMutating}
                />
                <div className="flex items-center justify-between gap-2 md:col-span-2 lg:col-span-6">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={newService.isPublished}
                      onCheckedChange={(checked) => setNewService((current) => ({ ...current, isPublished: checked === true }))}
                      disabled={!canCreate || isMutating}
                    />
                    Publicado
                  </label>
                  <Button
                    disabled={!canCreate || isMutating}
                    onClick={() => runMutation(async () => {
                      await parseResponse(
                        await fetch("/api/public-site/services", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify(newService),
                        }),
                      );
                      setNewService(EMPTY_SERVICE);
                    }, "Servico criado com sucesso.")}
                  >
                    Criar
                  </Button>
                </div>
              </div>

              {services.map((item) => (
                <div key={item.id} className="grid gap-3 rounded-md border p-3 md:grid-cols-2 lg:grid-cols-6">
                  <Input
                    value={item.tag}
                    onChange={(event) => setServices((current) => current.map((entry) => (
                      entry.id === item.id ? { ...entry, tag: event.target.value } : entry
                    )))}
                    disabled={!canUpdate || isMutating}
                  />
                  <Input
                    value={item.title}
                    onChange={(event) => setServices((current) => current.map((entry) => (
                      entry.id === item.id ? { ...entry, title: event.target.value } : entry
                    )))}
                    disabled={!canUpdate || isMutating}
                  />
                  <Input
                    value={item.slug}
                    placeholder="Slug SEO"
                    onChange={(event) => setServices((current) => current.map((entry) => (
                      entry.id === item.id ? { ...entry, slug: event.target.value } : entry
                    )))}
                    disabled={!canUpdate || isMutating}
                  />
                  <Input
                    value={item.imageUrl}
                    onChange={(event) => setServices((current) => current.map((entry) => (
                      entry.id === item.id ? { ...entry, imageUrl: event.target.value } : entry
                    )))}
                    disabled={!canUpdate || isMutating}
                  />
                  <Input
                    type="number"
                    value={item.displayOrder}
                    onChange={(event) => setServices((current) => current.map((entry) => (
                      entry.id === item.id ? { ...entry, displayOrder: Number(event.target.value || 0) } : entry
                    )))}
                    disabled={!canUpdate || isMutating}
                  />
                  <Input
                    value={item.description ?? ""}
                    onChange={(event) => setServices((current) => current.map((entry) => (
                      entry.id === item.id ? { ...entry, description: event.target.value || null } : entry
                    )))}
                    disabled={!canUpdate || isMutating}
                  />
                  <Input
                    value={item.imageAlt ?? ""}
                    placeholder="Alt da imagem"
                    onChange={(event) => setServices((current) => current.map((entry) => (
                      entry.id === item.id ? { ...entry, imageAlt: event.target.value || null } : entry
                    )))}
                    disabled={!canUpdate || isMutating}
                  />
                  <Input
                    value={item.seoTitle ?? ""}
                    placeholder="SEO title"
                    onChange={(event) => setServices((current) => current.map((entry) => (
                      entry.id === item.id ? { ...entry, seoTitle: event.target.value || null } : entry
                    )))}
                    className="lg:col-span-2"
                    disabled={!canUpdate || isMutating}
                  />
                  <Input
                    value={item.seoDescription ?? ""}
                    placeholder="SEO description"
                    onChange={(event) => setServices((current) => current.map((entry) => (
                      entry.id === item.id ? { ...entry, seoDescription: event.target.value || null } : entry
                    )))}
                    className="lg:col-span-4"
                    disabled={!canUpdate || isMutating}
                  />
                  <Textarea
                    value={item.pageContent ?? ""}
                    placeholder="Conteudo da pagina SEO"
                    onChange={(event) => setServices((current) => current.map((entry) => (
                      entry.id === item.id ? { ...entry, pageContent: event.target.value || null } : entry
                    )))}
                    className="min-h-24 md:col-span-2 lg:col-span-6"
                    disabled={!canUpdate || isMutating}
                  />
                  <div className="flex items-center justify-between gap-2 md:col-span-2 lg:col-span-6">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={item.isPublished}
                        onCheckedChange={(checked) => setServices((current) => current.map((entry) => (
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
                            await fetch(`/api/public-site/services/${item.id}`, {
                              method: "PUT",
                              headers: {
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify({
                                tag: item.tag,
                                title: item.title,
                                description: item.description ?? "",
                                slug: item.slug,
                                seoTitle: item.seoTitle ?? "",
                                seoDescription: item.seoDescription ?? "",
                                pageContent: item.pageContent ?? "",
                                imageAlt: item.imageAlt ?? "",
                                imageUrl: item.imageUrl,
                                displayOrder: item.displayOrder,
                                isPublished: item.isPublished,
                              }),
                            }),
                          );
                        }, "Servico atualizado.")}
                      >
                        Salvar
                      </Button>
                      <Button
                        variant="destructive"
                        disabled={!canDelete || isMutating}
                        onClick={() => runMutation(async () => {
                          await parseResponse(
                            await fetch(`/api/public-site/services/${item.id}`, { method: "DELETE" }),
                          );
                        }, "Servico removido.")}
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
