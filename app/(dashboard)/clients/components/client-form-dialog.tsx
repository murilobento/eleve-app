"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  CnpjLookupResult,
  CreateClientInput,
  ManagedClient,
  PostalCodeLookupResult,
  UpdateClientInput,
} from "@/lib/clients-admin";
import {
  createClientSchema,
  updateClientSchema,
} from "@/lib/clients-admin";
import { useI18n } from "@/i18n/provider";
import { formatPhone, formatPostalCode } from "@/lib/utils";

type ClientFormDialogProps = {
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreateClientInput | UpdateClientInput) => Promise<void> | void;
  isSubmitting: boolean;
  client?: ManagedClient | null;
};

type DocumentLookupResponse = {
  document: CnpjLookupResult;
};

type PostalCodeLookupResponse = {
  postalCode: PostalCodeLookupResult;
};

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || "Request failed.");
  }

  return payload as T;
}

export function ClientFormDialog({
  mode,
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  client,
}: ClientFormDialogProps) {
  const { t } = useI18n();
  const isEdit = mode === "edit";
  const schema = isEdit ? updateClientSchema : createClientSchema;
  const [isLookingUpDocument, setIsLookingUpDocument] = useState(false);
  const [isLookingUpPostalCode, setIsLookingUpPostalCode] = useState(false);

  const form = useForm<CreateClientInput | UpdateClientInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      personType: "PF",
      legalName: "",
      tradeName: "",
      document: "",
      contactName: "",
      contactPhone: "",
      email: "",
      phone: "",
      website: "",
      postalCode: "",
      street: "",
      number: "",
      complement: "",
      district: "",
      city: "",
      state: "",
      country: "Brasil",
    },
  });

  const personType = form.watch("personType");

  useEffect(() => {
    if (!open) {
      return;
    }

    form.reset({
      personType: client?.personType ?? "PF",
      legalName: client?.legalName ?? "",
      tradeName: client?.tradeName ?? "",
      document: client?.document ?? "",
      contactName: client?.contactName ?? "",
      contactPhone: client?.contactPhone ? formatPhone(client.contactPhone) : "",
      email: client?.email ?? "",
      phone: formatPhone(client?.phone ?? ""),
      website: client?.website ?? "",
      postalCode: formatPostalCode(client?.postalCode ?? ""),
      street: client?.street ?? "",
      number: client?.number ?? "",
      complement: client?.complement ?? "",
      district: client?.district ?? "",
      city: client?.city ?? "",
      state: client?.state ?? "",
      country: client?.country ?? "Brasil",
    });
  }, [client, form, open]);

  async function handleDocumentLookup() {
    const document = form.getValues("document").replace(/\D/g, "");

    if (personType !== "PJ") {
      return;
    }

    if (document.length !== 14) {
      form.setError("document", { message: t("clients.cnpjInvalid") });
      return;
    }

    setIsLookingUpDocument(true);
    try {
      const payload = await parseResponse<DocumentLookupResponse>(
        await fetch(`/api/clients/document?cnpj=${document}`, {
          cache: "no-store",
        }),
      );

      form.setValue("document", payload.document.document, { shouldDirty: true, shouldValidate: true });
      form.setValue("legalName", payload.document.legalName, { shouldDirty: true, shouldValidate: true });
      form.setValue("tradeName", payload.document.tradeName, { shouldDirty: true });
      form.setValue("email", payload.document.email, { shouldDirty: true, shouldValidate: true });
      form.setValue("phone", formatPhone(payload.document.phone), { shouldDirty: true, shouldValidate: true });
      form.setValue("postalCode", formatPostalCode(payload.document.postalCode), { shouldDirty: true, shouldValidate: true });
      form.setValue("street", payload.document.street, { shouldDirty: true, shouldValidate: true });
      form.setValue("number", payload.document.number, { shouldDirty: true, shouldValidate: true });
      form.setValue("complement", payload.document.complement, { shouldDirty: true });
      form.setValue("district", payload.document.district, { shouldDirty: true, shouldValidate: true });
      form.setValue("city", payload.document.city, { shouldDirty: true, shouldValidate: true });
      form.setValue("state", payload.document.state, { shouldDirty: true, shouldValidate: true });

      toast.success(t("clients.cnpjLookupSuccess"));
    } catch (lookupError) {
      const message = lookupError instanceof Error ? lookupError.message : t("clients.cnpjLookupError");
      form.setError("document", { message });
      toast.error(message);
    } finally {
      setIsLookingUpDocument(false);
    }
  }

  async function handlePostalCodeLookup() {
    const postalCode = form.getValues("postalCode").replace(/\D/g, "");

    if (postalCode.length !== 8) {
      form.setError("postalCode", { message: t("clients.postalCodeInvalid") });
      return;
    }

    setIsLookingUpPostalCode(true);
    try {
      const payload = await parseResponse<PostalCodeLookupResponse>(
        await fetch(`/api/clients/postal-code?postalCode=${postalCode}`, {
          cache: "no-store",
        }),
      );

      form.setValue("postalCode", formatPostalCode(payload.postalCode.postalCode), { shouldDirty: true, shouldValidate: true });
      form.setValue("street", payload.postalCode.street, { shouldDirty: true, shouldValidate: true });
      form.setValue("district", payload.postalCode.district, { shouldDirty: true, shouldValidate: true });
      form.setValue("city", payload.postalCode.city, { shouldDirty: true, shouldValidate: true });
      form.setValue("state", payload.postalCode.state, { shouldDirty: true, shouldValidate: true });

      toast.success(t("clients.postalCodeLookupSuccess"));
    } catch (lookupError) {
      const message = lookupError instanceof Error ? lookupError.message : t("clients.postalCodeLookupError");
      form.setError("postalCode", { message });
      toast.error(message);
    } finally {
      setIsLookingUpPostalCode(false);
    }
  }

  async function handleSubmit(values: CreateClientInput | UpdateClientInput) {
    await onSubmit(values);
    form.reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {!isEdit ? (
        <DialogTrigger asChild>
          <Button className="cursor-pointer">
            <Plus className="mr-2 h-4 w-4" />
            {t("clients.addClient")}
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("clients.editClient") : t("clients.createClient")}</DialogTitle>
          <DialogDescription>{t("clients.createDescription")}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3">
            <div className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)]">
              <FormField
                control={form.control}
                name="personType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("clients.personType")}</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        form.setValue("document", "", { shouldDirty: false, shouldValidate: false });
                        form.clearErrors("document");
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full cursor-pointer">
                          <SelectValue placeholder={t("clients.selectPersonType")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PF">{t("clients.individual")}</SelectItem>
                        <SelectItem value="PJ">{t("clients.legalEntity")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="document"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{personType === "PJ" ? t("clients.cnpj") : t("clients.cpf")}</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input
                          placeholder={personType === "PJ" ? "00.000.000/0000-00" : "000.000.000-00"}
                          {...field}
                        />
                      </FormControl>
                      {personType === "PJ" ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="cursor-pointer"
                          onClick={() => void handleDocumentLookup()}
                          disabled={isLookingUpDocument || isSubmitting}
                        >
                          {isLookingUpDocument ? t("common.loading") : t("clients.lookupCnpj")}
                        </Button>
                      ) : null}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <FormField
                control={form.control}
                name="legalName"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>{personType === "PJ" ? t("clients.legalName") : t("clients.fullName")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={personType === "PJ" ? "Empresa Exemplo LTDA" : "João da Silva"}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tradeName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("clients.tradeName")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={personType === "PJ" ? "Nome fantasia" : t("clients.optionalField")}
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <FormField
                control={form.control}
                name="contactName"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>{t("clients.contactName")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("clients.contactNamePlaceholder")}
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("clients.contactPhone")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="(11) 99999-9999"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(event) => field.onChange(formatPhone(event.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("clients.email")}</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="cliente@exemplo.com" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("clients.phone")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="(11) 99999-9999"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(event) => field.onChange(formatPhone(event.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-[160px_minmax(0,1fr)_140px]">
              <FormField
                control={form.control}
                name="postalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("clients.postalCode")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="00000-000"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(event) => field.onChange(formatPostalCode(event.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("clients.website")}</FormLabel>
                    <FormControl>
                      <Input placeholder="https://exemplo.com.br" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-end md:pb-0.5">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full cursor-pointer"
                  onClick={() => void handlePostalCodeLookup()}
                  disabled={isLookingUpPostalCode || isSubmitting}
                >
                  {isLookingUpPostalCode ? t("common.loading") : t("clients.lookupPostalCode")}
                </Button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(0,1.4fr)_120px_180px_minmax(0,1fr)]">
              <FormField
                control={form.control}
                name="street"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("clients.street")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("clients.number")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="complement"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("clients.complement")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("clients.complementPlaceholder")}
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="district"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("clients.district")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_120px_160px]">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("clients.city")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("clients.state")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("clients.country")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="submit" className="cursor-pointer" disabled={isSubmitting}>
                {isSubmitting ? t("common.loading") : isEdit ? t("common.saveChanges") : t("clients.createClient")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
