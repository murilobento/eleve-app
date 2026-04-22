"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useResourcePermissions } from "@/hooks/use-resource-permissions";
import type { ManagedPublicCompany, UpdatePublicCompanyInput } from "@/lib/public-site-admin";

type AdminCompanyResponse = {
  company: ManagedPublicCompany | null;
};

const EMPTY_COMPANY: UpdatePublicCompanyInput = {
  name: "",
  cnpj: "",
  phone: "",
  email: "",
  address: "",
  facebookUrl: "",
  instagramUrl: "",
  linkedinUrl: "",
  seoTitle: "",
  seoDescription: "",
  legalName: "",
  streetAddress: "",
  addressLocality: "",
  addressRegion: "",
  postalCode: "",
  serviceAreas: [],
};

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || "Request failed.");
  }

  return payload as T;
}

export default function PublicSiteCompanyPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [company, setCompany] = useState<UpdatePublicCompanyInput>(EMPTY_COMPANY);
  const { canRead, canUpdate } = useResourcePermissions("public-site");

  const loadCompany = async () => {
    setIsLoading(true);

    try {
      const payload = await parseResponse<AdminCompanyResponse>(
        await fetch("/api/public-site/company", { cache: "no-store" }),
      );

      setCompany(payload.company
        ? {
            name: payload.company.name,
            cnpj: payload.company.cnpj ?? "",
            phone: payload.company.phone,
            email: payload.company.email,
            address: payload.company.address,
            facebookUrl: payload.company.facebookUrl ?? "",
            instagramUrl: payload.company.instagramUrl ?? "",
            linkedinUrl: payload.company.linkedinUrl ?? "",
            seoTitle: payload.company.seoTitle ?? "",
            seoDescription: payload.company.seoDescription ?? "",
            legalName: payload.company.legalName ?? "",
            streetAddress: payload.company.streetAddress ?? "",
            addressLocality: payload.company.addressLocality ?? "",
            addressRegion: payload.company.addressRegion ?? "",
            postalCode: payload.company.postalCode ?? "",
            serviceAreas: payload.company.serviceAreas,
          }
        : EMPTY_COMPANY);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao carregar empresa publica.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadCompany();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);

    try {
      await parseResponse(
        await fetch("/api/public-site/company", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(company),
        }),
      );

      toast.success("Dados da empresa publica atualizados.");
      await loadCompany();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar empresa publica.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="px-4 lg:px-6">
        <h1 className="text-2xl font-bold tracking-tight">Site publico - Empresa</h1>
      </div>

      <div className="@container/main mt-2 px-4 lg:mt-4 lg:px-6">
        {isLoading ? (
          <div className="rounded-md border px-6 py-10 text-sm text-muted-foreground">
            Carregando dados...
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
              <CardTitle>Dados publicos da empresa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-4">
                <div className="space-y-1">
                  <Label>Nome</Label>
                  <Input
                    value={company.name}
                    onChange={(event) => setCompany((current) => ({ ...current, name: event.target.value }))}
                    disabled={!canUpdate || isSaving}
                  />
                </div>
                <div className="space-y-1">
                  <Label>CNPJ</Label>
                  <Input
                    value={company.cnpj}
                    onChange={(event) => setCompany((current) => ({ ...current, cnpj: event.target.value }))}
                    disabled={!canUpdate || isSaving}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Telefone</Label>
                  <Input
                    value={company.phone}
                    onChange={(event) => setCompany((current) => ({ ...current, phone: event.target.value }))}
                    disabled={!canUpdate || isSaving}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input
                    value={company.email}
                    onChange={(event) => setCompany((current) => ({ ...current, email: event.target.value }))}
                    disabled={!canUpdate || isSaving}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Endereco</Label>
                <Textarea
                  rows={3}
                  value={company.address}
                  onChange={(event) => setCompany((current) => ({ ...current, address: event.target.value }))}
                  disabled={!canUpdate || isSaving}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <div className="space-y-1">
                  <Label>Razao social</Label>
                  <Input
                    value={company.legalName ?? ""}
                    onChange={(event) => setCompany((current) => ({ ...current, legalName: event.target.value }))}
                    disabled={!canUpdate || isSaving}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Logradouro</Label>
                  <Input
                    value={company.streetAddress ?? ""}
                    onChange={(event) => setCompany((current) => ({ ...current, streetAddress: event.target.value }))}
                    disabled={!canUpdate || isSaving}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Cidade</Label>
                  <Input
                    value={company.addressLocality ?? ""}
                    onChange={(event) => setCompany((current) => ({ ...current, addressLocality: event.target.value }))}
                    disabled={!canUpdate || isSaving}
                  />
                </div>
                <div className="space-y-1">
                  <Label>UF/CEP</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="SP"
                      value={company.addressRegion ?? ""}
                      onChange={(event) => setCompany((current) => ({ ...current, addressRegion: event.target.value }))}
                      disabled={!canUpdate || isSaving}
                    />
                    <Input
                      placeholder="00000-000"
                      value={company.postalCode ?? ""}
                      onChange={(event) => setCompany((current) => ({ ...current, postalCode: event.target.value }))}
                      disabled={!canUpdate || isSaving}
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>SEO title</Label>
                  <Input
                    value={company.seoTitle ?? ""}
                    onChange={(event) => setCompany((current) => ({ ...current, seoTitle: event.target.value }))}
                    disabled={!canUpdate || isSaving}
                  />
                </div>
                <div className="space-y-1">
                  <Label>SEO description</Label>
                  <Input
                    value={company.seoDescription ?? ""}
                    onChange={(event) => setCompany((current) => ({ ...current, seoDescription: event.target.value }))}
                    disabled={!canUpdate || isSaving}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Areas atendidas</Label>
                <Input
                  placeholder="Sao Paulo, ABC Paulista, Interior de SP"
                  value={(company.serviceAreas ?? []).join(", ")}
                  onChange={(event) => setCompany((current) => ({
                    ...current,
                    serviceAreas: event.target.value
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  }))}
                  disabled={!canUpdate || isSaving}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <Label>Facebook</Label>
                  <Input
                    placeholder="https://facebook.com/sua-pagina"
                    value={company.facebookUrl}
                    onChange={(event) => setCompany((current) => ({ ...current, facebookUrl: event.target.value }))}
                    disabled={!canUpdate || isSaving}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Instagram</Label>
                  <Input
                    placeholder="https://instagram.com/seu-perfil"
                    value={company.instagramUrl}
                    onChange={(event) => setCompany((current) => ({ ...current, instagramUrl: event.target.value }))}
                    disabled={!canUpdate || isSaving}
                  />
                </div>
                <div className="space-y-1">
                  <Label>LinkedIn</Label>
                  <Input
                    placeholder="https://linkedin.com/company/sua-empresa"
                    value={company.linkedinUrl}
                    onChange={(event) => setCompany((current) => ({ ...current, linkedinUrl: event.target.value }))}
                    disabled={!canUpdate || isSaving}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={!canUpdate || isSaving}>
                  Salvar
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </>
  );
}
