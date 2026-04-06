"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type FieldErrors } from "react-hook-form";
import { EllipsisVertical, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AdminListTableCard,
  AdminListToolbar,
} from "@/components/admin-list-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useI18n } from "@/i18n/provider";
import type {
  CnpjLookupResult,
  CreateSupplierInput,
  ManagedSupplier,
  PostalCodeLookupResult,
  UpdateSupplierInput,
} from "@/lib/suppliers-admin";
import {
  createSupplierSchema,
  updateSupplierSchema,
} from "@/lib/suppliers-admin";
import { formatCnpj, formatCpf, formatPhone, formatPostalCode } from "@/lib/utils";

type SuppliersResponse = {
  suppliers: ManagedSupplier[];
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

function formatSupplierDocument(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length > 11 ? formatCnpj(digits) : formatCpf(digits);
}

function findFirstErrorMessage(value: unknown): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  if ("message" in value && typeof value.message === "string" && value.message.length > 0) {
    return value.message;
  }

  for (const entry of Object.values(value)) {
    const message = findFirstErrorMessage(entry);
    if (message) {
      return message;
    }
  }

  return null;
}

export default function SuppliersPage() {
  const { t } = useI18n();
  const [suppliers, setSuppliers] = useState<ManagedSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedSupplier | null>(null);
  const [deleting, setDeleting] = useState<ManagedSupplier | null>(null);
  const [isLookingUpDocument, setIsLookingUpDocument] = useState(false);
  const [isLookingUpPostalCode, setIsLookingUpPostalCode] = useState(false);

  const isEdit = Boolean(editing);
  const schema = isEdit ? updateSupplierSchema : createSupplierSchema;
  const open = createOpen || isEdit;

  const form = useForm<CreateSupplierInput | UpdateSupplierInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      supplierType: "workshop",
      status: "active",
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

  async function loadSuppliers() {
    setLoading(true);
    try {
      const payload = await parseResponse<SuppliersResponse>(await fetch("/api/suppliers", { cache: "no-store" }));
      setSuppliers(payload.suppliers);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("suppliers.loadError"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSuppliers();
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    form.reset({
      supplierType: editing?.supplierType ?? "workshop",
      status: editing?.status ?? "active",
      legalName: editing?.legalName ?? "",
      tradeName: editing?.tradeName ?? "",
      document: formatSupplierDocument(editing?.document ?? ""),
      contactName: editing?.contactName ?? "",
      contactPhone: editing?.contactPhone ? formatPhone(editing.contactPhone) : "",
      email: editing?.email ?? "",
      phone: formatPhone(editing?.phone ?? ""),
      website: editing?.website ?? "",
      postalCode: formatPostalCode(editing?.postalCode ?? ""),
      street: editing?.street ?? "",
      number: editing?.number ?? "",
      complement: editing?.complement ?? "",
      district: editing?.district ?? "",
      city: editing?.city ?? "",
      state: editing?.state ?? "",
      country: editing?.country ?? "Brasil",
    });
  }, [editing, form, open]);

  const visibleSuppliers = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return suppliers;
    }

    return suppliers.filter((supplier) =>
      [
        supplier.legalName,
        supplier.tradeName ?? "",
        supplier.document,
        supplier.city,
        supplier.state,
        supplier.phone,
      ].some((value) => value.toLowerCase().includes(term)),
    );
  }, [search, suppliers]);

  async function runMutation(operation: () => Promise<void>, successMessage: string) {
    setIsMutating(true);

    try {
      await operation();
      await loadSuppliers();
      toast.success(successMessage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("suppliers.updateError"));
      throw error;
    } finally {
      setIsMutating(false);
    }
  }

  function closeDialog() {
    setCreateOpen(false);
    setEditing(null);
    form.reset();
  }

  async function handleDocumentLookup() {
    const document = form.getValues("document").replace(/\D/g, "");
    form.clearErrors("document");

    if (document.length !== 14) {
      toast.error(t("suppliers.cnpjInvalid"));
      return;
    }

    setIsLookingUpDocument(true);
    try {
      const payload = await parseResponse<DocumentLookupResponse>(
        await fetch(`/api/suppliers/document?cnpj=${document}`, {
          cache: "no-store",
        }),
      );

      form.setValue("document", formatCnpj(payload.document.document), { shouldDirty: true, shouldValidate: true });
      form.setValue("legalName", payload.document.legalName, { shouldDirty: true, shouldValidate: true });
      form.setValue("tradeName", payload.document.tradeName, { shouldDirty: true });
      form.setValue("email", payload.document.email ?? "", { shouldDirty: true, shouldValidate: true });
      form.setValue("phone", formatPhone(payload.document.phone), { shouldDirty: true, shouldValidate: true });
      form.setValue("postalCode", formatPostalCode(payload.document.postalCode), { shouldDirty: true, shouldValidate: true });
      form.setValue("street", payload.document.street, { shouldDirty: true, shouldValidate: true });
      form.setValue("number", payload.document.number, { shouldDirty: true, shouldValidate: true });
      form.setValue("complement", payload.document.complement, { shouldDirty: true });
      form.setValue("district", payload.document.district, { shouldDirty: true, shouldValidate: true });
      form.setValue("city", payload.document.city, { shouldDirty: true, shouldValidate: true });
      form.setValue("state", payload.document.state, { shouldDirty: true, shouldValidate: true });
      toast.success(t("suppliers.cnpjLookupSuccess"));
    } catch (lookupError) {
      const message = lookupError instanceof Error ? lookupError.message : t("suppliers.cnpjLookupError");
      toast.error(message);
    } finally {
      setIsLookingUpDocument(false);
    }
  }

  async function handlePostalCodeLookup() {
    const postalCode = form.getValues("postalCode").replace(/\D/g, "");

    if (postalCode.length !== 8) {
      toast.error(t("suppliers.postalCodeInvalid"));
      return;
    }

    setIsLookingUpPostalCode(true);
    try {
      const payload = await parseResponse<PostalCodeLookupResponse>(
        await fetch(`/api/suppliers/postal-code?postalCode=${postalCode}`, {
          cache: "no-store",
        }),
      );

      form.setValue("postalCode", formatPostalCode(payload.postalCode.postalCode), { shouldDirty: true, shouldValidate: true });
      form.setValue("street", payload.postalCode.street, { shouldDirty: true, shouldValidate: true });
      form.setValue("district", payload.postalCode.district, { shouldDirty: true, shouldValidate: true });
      form.setValue("city", payload.postalCode.city, { shouldDirty: true, shouldValidate: true });
      form.setValue("state", payload.postalCode.state, { shouldDirty: true, shouldValidate: true });
      toast.success(t("suppliers.postalCodeLookupSuccess"));
    } catch (lookupError) {
      const message = lookupError instanceof Error ? lookupError.message : t("suppliers.postalCodeLookupError");
      toast.error(message);
    } finally {
      setIsLookingUpPostalCode(false);
    }
  }

  async function handleSubmit(values: CreateSupplierInput | UpdateSupplierInput) {
    const path = editing ? `/api/suppliers/${editing.id}` : "/api/suppliers";
    const method = editing ? "PUT" : "POST";

    await runMutation(async () => {
      await parseResponse(
        await fetch(path, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        }),
      );
    }, editing ? t("common.supplierUpdateSuccess") : t("common.supplierCreateSuccess"));

    closeDialog();
  }

  function handleInvalidSubmit(errors: FieldErrors<CreateSupplierInput | UpdateSupplierInput>) {
    const message = findFirstErrorMessage(errors) ?? t("suppliers.updateError");
    toast.error(message);
  }

  return (
    <>
      <div className="px-4 lg:px-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{t("suppliers.title")}</h1>
          <p className="text-muted-foreground">{t("suppliers.description")}</p>
        </div>
      </div>

      <div className="@container/main mt-2 space-y-4 px-4 lg:mt-4 lg:px-6">
        <AdminListToolbar>
          <div className="grid min-w-[220px] flex-1 gap-2">
            <Label htmlFor="suppliers-search">{t("suppliers.search")}</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="suppliers-search"
                className="pl-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("suppliers.searchPlaceholder")}
              />
            </div>
          </div>
          <Button
            className="cursor-pointer"
            onClick={() => {
              setEditing(null);
              setCreateOpen(true);
            }}
          >
            <Plus className="mr-2 size-4" />
            {t("suppliers.add")}
          </Button>
        </AdminListToolbar>

        {loading ? (
          <div className="rounded-md border px-6 py-10 text-sm text-muted-foreground">{t("suppliers.loading")}</div>
        ) : (
          <AdminListTableCard>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("suppliers.name")}</TableHead>
                  <TableHead>{t("suppliers.type")}</TableHead>
                  <TableHead>{t("suppliers.status")}</TableHead>
                  <TableHead>{t("suppliers.location")}</TableHead>
                  <TableHead>{t("suppliers.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleSuppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      {t("suppliers.noSuppliers")}
                    </TableCell>
                  </TableRow>
                ) : visibleSuppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell>
                      <div className="font-medium">{supplier.tradeName || supplier.legalName}</div>
                      <div className="text-xs text-muted-foreground">{supplier.legalName}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{t(`suppliers.types.${supplier.supplierType}`)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={supplier.status === "active" ? "default" : "secondary"}>
                        {supplier.status === "active" ? t("suppliers.active") : t("suppliers.inactive")}
                      </Badge>
                    </TableCell>
                    <TableCell>{supplier.city} - {supplier.state}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer">
                            <EllipsisVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="cursor-pointer" onClick={() => setEditing(supplier)}>
                            <Pencil className="mr-2 size-4" />
                            {t("common.saveChanges")}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer text-destructive" onClick={() => setDeleting(supplier)}>
                            <Trash2 className="mr-2 size-4" />
                            {t("common.delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </AdminListTableCard>
        )}
      </div>

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            closeDialog();
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit, handleInvalidSubmit)} className="space-y-3">
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-3 pr-8">
                  <DialogTitle>{editing ? t("suppliers.edit") : t("suppliers.add")}</DialogTitle>
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem className="flex shrink-0 flex-row items-center gap-3 space-y-0 rounded-md border px-3 py-2">
                        <FormLabel className="cursor-pointer text-sm font-medium">
                          {field.value === "active" ? t("suppliers.active") : t("suppliers.inactive")}
                        </FormLabel>
                        <FormControl>
                          <Switch
                            checked={field.value === "active"}
                            onCheckedChange={(checked) => field.onChange(checked ? "active" : "inactive")}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <DialogDescription>{t("suppliers.formDescription")}</DialogDescription>
              </DialogHeader>

              <div className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)]">
                <FormField
                  control={form.control}
                  name="supplierType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("suppliers.type")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full cursor-pointer">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="fuel_station">{t("suppliers.types.fuel_station")}</SelectItem>
                          <SelectItem value="workshop">{t("suppliers.types.workshop")}</SelectItem>
                          <SelectItem value="other">{t("suppliers.types.other")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="document"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("suppliers.document")}</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input
                            placeholder="00.000.000/0000-00 ou 000.000.000-00"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(event) => field.onChange(formatSupplierDocument(event.target.value))}
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          className="cursor-pointer"
                          onClick={() => void handleDocumentLookup()}
                          disabled={isLookingUpDocument || isMutating}
                        >
                          {isLookingUpDocument ? t("common.loading") : t("suppliers.lookupCnpj")}
                        </Button>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <FormField
                  control={form.control}
                  name="legalName"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>{t("suppliers.legalName")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tradeName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("suppliers.tradeName")}</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("suppliers.contactName")}</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <FormField
                  control={form.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("suppliers.contactPhone")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="(11) 99999-9999"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(event) => field.onChange(formatPhone(event.target.value))}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("suppliers.email")}</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="fornecedor@exemplo.com" {...field} value={field.value ?? ""} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("suppliers.phone")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="(11) 99999-9999"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(event) => field.onChange(formatPhone(event.target.value))}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("suppliers.website")}</FormLabel>
                      <FormControl>
                        <Input placeholder="https://exemplo.com.br" {...field} value={field.value ?? ""} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                <FormField
                  control={form.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("suppliers.postalCode")}</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input
                            placeholder="00000-000"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(event) => field.onChange(formatPostalCode(event.target.value))}
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          className="shrink-0 cursor-pointer"
                          onClick={() => void handlePostalCodeLookup()}
                          disabled={isLookingUpPostalCode || isMutating}
                        >
                          {isLookingUpPostalCode ? t("common.loading") : t("suppliers.lookupPostalCode")}
                        </Button>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("suppliers.country")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-[minmax(0,1.4fr)_120px_180px_minmax(0,1fr)]">
                <FormField
                  control={form.control}
                  name="street"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("suppliers.street")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("suppliers.number")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="complement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("suppliers.complement")}</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="district"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("suppliers.district")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_120px]">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("suppliers.city")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("suppliers.state")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" className="cursor-pointer" onClick={closeDialog}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" className="cursor-pointer" disabled={isMutating}>
                  {isMutating ? t("common.loading") : t("common.saveChanges")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(deleting)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setDeleting(null);
          }
        }}
        description={deleting ? t("suppliers.confirmDelete", { name: deleting.tradeName || deleting.legalName }) : ""}
        onConfirm={async () => {
          if (!deleting) {
            return;
          }

          await runMutation(async () => {
            await parseResponse(await fetch(`/api/suppliers/${deleting.id}`, { method: "DELETE" }));
          }, t("common.supplierDeleteSuccess"));
          setDeleting(null);
        }}
        isLoading={isMutating}
      />
    </>
  );
}
