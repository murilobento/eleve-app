"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useResourcePermissions } from "@/hooks/use-resource-permissions";
import { Input } from "@/components/ui/input";
import { useFormValidationToast } from "@/hooks/use-form-validation-toast";
import { useI18n } from "@/i18n/provider";
import type { CnpjLookupResult, ManagedCompany, PostalCodeLookupResult, UpdateCompanyInput } from "@/lib/company-admin";
import { updateCompanySchema } from "@/lib/company-admin";
import { formatCnpj, formatPhone, formatPostalCode } from "@/lib/utils";

type CompanyResponse = {
  company: ManagedCompany | null;
};

type PostalCodeResponse = {
  postalCode: PostalCodeLookupResult;
};

type CnpjResponse = {
  cnpj: CnpjLookupResult;
};

function getLocalizedCompanyError(message: string, t: ReturnType<typeof useI18n>["t"]) {
  switch (message) {
    case "Failed to save company details.":
      return t("company.errors.saveFailed");
    case "CNPJ not found.":
      return t("company.cnpjLookupError");
    case "Failed to look up the CNPJ.":
      return t("company.cnpjLookupError");
    case "Postal code not found.":
      return t("company.postalCodeLookupError");
    case "Failed to look up the postal code.":
      return t("company.postalCodeLookupError");
    case "Request failed.":
      return t("common.requestFailed");
    default:
      return message;
  }
}

async function parseResponse<T>(response: Response, t: ReturnType<typeof useI18n>["t"]): Promise<T> {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(getLocalizedCompanyError(payload?.error || "Request failed.", t));
  }

  return payload as T;
}

const EMPTY_VALUES: UpdateCompanyInput = {
  appName: "",
  legalName: "",
  tradeName: "",
  cnpj: "",
  email: "",
  phone: "",
  website: "",
  postalCode: "",
  street: "",
  number: "",
  district: "",
  city: "",
  state: "",
  country: "Brasil",
};

function mapCompanyToFormValues(company: ManagedCompany | null): UpdateCompanyInput {
  if (!company) {
    return EMPTY_VALUES;
  }

  return {
    appName: company.appName ?? "",
    legalName: company.legalName,
    tradeName: company.tradeName ?? "",
    cnpj: formatCnpj(company.cnpj),
    email: company.email,
    phone: formatPhone(company.phone),
    website: company.website ?? "",
    postalCode: formatPostalCode(company.postalCode),
    street: company.street,
    number: company.number,
    district: company.district,
    city: company.city,
    state: company.state,
    country: company.country,
  };
}

export default function CompanyPage() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLookingUpCnpj, setIsLookingUpCnpj] = useState(false);
  const [isLookingUpPostalCode, setIsLookingUpPostalCode] = useState(false);
  const { canUpdate } = useResourcePermissions("company");

  const form = useForm<UpdateCompanyInput>({
    resolver: zodResolver(updateCompanySchema),
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: EMPTY_VALUES,
  });
  const { formClassName, handleInvalidSubmit } = useFormValidationToast({
    form,
    title: t("common.validationToastTitle"),
    fallback: t("common.validationToastFallback"),
  });

  const loadCompany = async () => {
    setLoading(true);

    try {
      const payload = await parseResponse<CompanyResponse>(await fetch("/api/company", {
        cache: "no-store",
      }), t);

      form.reset(mapCompanyToFormValues(payload.company));
    } catch (loadError) {
      toast.error(loadError instanceof Error ? loadError.message : t("company.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCompany();
  }, []);

  const handleCnpjLookup = async () => {
    const cnpj = form.getValues("cnpj");
    const normalizedCnpj = cnpj.replace(/\D/g, "");

    if (normalizedCnpj.length !== 14) {
      form.setError("cnpj", { message: t("company.cnpjInvalid") });
      toast.error(t("company.cnpjInvalid"));
      return;
    }

    setIsLookingUpCnpj(true);

    try {
      const payload = await parseResponse<CnpjResponse>(
        await fetch(`/api/company/cnpj?cnpj=${normalizedCnpj}`, {
          cache: "no-store",
        }),
        t,
      );

      form.setValue("cnpj", formatCnpj(payload.cnpj.cnpj), { shouldValidate: true });
      form.setValue("legalName", payload.cnpj.legalName, { shouldValidate: true });
      form.setValue("tradeName", payload.cnpj.tradeName, { shouldValidate: true });

      if (payload.cnpj.email) {
        form.setValue("email", payload.cnpj.email, { shouldValidate: true });
      }

      if (payload.cnpj.phone) {
        form.setValue("phone", formatPhone(payload.cnpj.phone), { shouldValidate: true });
      }

      if (payload.cnpj.postalCode) {
        form.setValue("postalCode", formatPostalCode(payload.cnpj.postalCode), { shouldValidate: true });
      }

      if (payload.cnpj.street) {
        form.setValue("street", payload.cnpj.street, { shouldValidate: true });
      }

      if (payload.cnpj.number) {
        form.setValue("number", payload.cnpj.number, { shouldValidate: true });
      }

      if (payload.cnpj.district) {
        form.setValue("district", payload.cnpj.district, { shouldValidate: true });
      }

      if (payload.cnpj.city) {
        form.setValue("city", payload.cnpj.city, { shouldValidate: true });
      }

      if (payload.cnpj.state) {
        form.setValue("state", payload.cnpj.state, { shouldValidate: true });
      }

      toast.success(t("company.cnpjLookupSuccess"));
    } catch (lookupError) {
      const message = lookupError instanceof Error ? lookupError.message : t("company.cnpjLookupError");
      toast.error(message);
    } finally {
      setIsLookingUpCnpj(false);
    }
  };

  const handlePostalCodeLookup = async () => {
    const postalCode = form.getValues("postalCode");
    const normalizedPostalCode = postalCode.replace(/\D/g, "");

    if (normalizedPostalCode.length !== 8) {
      form.setError("postalCode", { message: t("company.postalCodeInvalid") });
      toast.error(t("company.postalCodeInvalid"));
      return;
    }

    setIsLookingUpPostalCode(true);

    try {
      const payload = await parseResponse<PostalCodeResponse>(
        await fetch(`/api/company/postal-code?postalCode=${normalizedPostalCode}`, {
          cache: "no-store",
        }),
        t,
      );

      form.setValue("postalCode", formatPostalCode(payload.postalCode.postalCode), { shouldValidate: true });
      form.setValue("street", payload.postalCode.street, { shouldValidate: true });
      form.setValue("district", payload.postalCode.district, { shouldValidate: true });
      form.setValue("city", payload.postalCode.city, { shouldValidate: true });
      form.setValue("state", payload.postalCode.state, { shouldValidate: true });
      toast.success(t("company.postalCodeLookupSuccess"));
    } catch (lookupError) {
      const message = lookupError instanceof Error ? lookupError.message : t("company.postalCodeLookupError");
      toast.error(message);
    } finally {
      setIsLookingUpPostalCode(false);
    }
  };

  const handleSubmit = async (values: UpdateCompanyInput) => {
    setIsSaving(true);

    try {
      const payload = await parseResponse<CompanyResponse>(
        await fetch("/api/company", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        }),
        t,
      );

      form.reset(mapCompanyToFormValues(payload.company));
      toast.success(t("common.companyUpdateSuccess"));
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : t("company.updateError");
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="px-4 lg:px-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{t("company.title")}</h1>
        </div>
      </div>

      <div className="@container/main mt-2 px-4 lg:mt-4 lg:px-6">
        {loading ? (
          <div className="rounded-md border px-6 py-10 text-sm text-muted-foreground">
            {t("common.loadingCompany")}
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{t("company.formTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit, handleInvalidSubmit)} className={`space-y-4 ${formClassName}`}>
                  <fieldset className="grid gap-3" disabled={!canUpdate || isSaving}>
                    <div className="grid gap-3 xl:grid-cols-[220px_minmax(320px,1fr)]">
                      <FormField
                        control={form.control}
                        name="appName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("company.appName")}</FormLabel>
                            <FormControl>
                              <Input placeholder="ELVE" {...field} value={field.value ?? ""} />
                            </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                      <div className="grid gap-3 md:grid-cols-[minmax(280px,1fr)_auto]">
                        <FormField
                          control={form.control}
                          name="cnpj"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("company.cnpj")}</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="00.000.000/0000-00"
                                  {...field}
                                  value={field.value ?? ""}
                                  onChange={(event) => field.onChange(formatCnpj(event.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex items-end">
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full cursor-pointer md:w-auto"
                            onClick={handleCnpjLookup}
                            disabled={!canUpdate || isLookingUpCnpj || isLookingUpPostalCode || isSaving}
                          >
                            <Search className="mr-2 size-4" />
                            {isLookingUpCnpj ? t("common.loading") : t("company.lookupCnpj")}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 xl:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="legalName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("company.legalName")}</FormLabel>
                            <FormControl>
                              <Input placeholder="Empresa Exemplo Ltda" {...field} />
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
                            <FormLabel>{t("company.tradeName")}</FormLabel>
                            <FormControl>
                              <Input placeholder="Empresa Exemplo" {...field} value={field.value ?? ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid gap-3 xl:grid-cols-3">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("company.email")}</FormLabel>
                            <FormControl>
                              <Input placeholder="contato@empresa.com" {...field} />
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
                            <FormLabel>{t("company.phone")}</FormLabel>
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
                        name="website"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("company.website")}</FormLabel>
                            <FormControl>
                              <Input placeholder="empresa.com.br" {...field} value={field.value ?? ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </fieldset>

                  <fieldset className="grid gap-3" disabled={!canUpdate || isSaving}>
                    <div className="grid gap-3 xl:grid-cols-[160px_140px_minmax(0,1fr)_96px]">
                      <FormField
                        control={form.control}
                        name="postalCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("company.postalCode")}</FormLabel>
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

                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full cursor-pointer"
                          onClick={handlePostalCodeLookup}
                          disabled={!canUpdate || isLookingUpCnpj || isLookingUpPostalCode || isSaving}
                        >
                          <Search className="mr-2 size-4" />
                          {isLookingUpPostalCode ? t("common.loading") : t("company.lookupPostalCode")}
                        </Button>
                      </div>

                      <FormField
                        control={form.control}
                        name="street"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("company.street")}</FormLabel>
                            <FormControl>
                              <Input placeholder="Rua Exemplo" {...field} />
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
                            <FormLabel>{t("company.number")}</FormLabel>
                            <FormControl>
                              <Input placeholder="123" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid gap-3 xl:grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)_120px_120px]">
                      <FormField
                        control={form.control}
                        name="district"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("company.district")}</FormLabel>
                            <FormControl>
                              <Input placeholder="Centro" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("company.city")}</FormLabel>
                            <FormControl>
                              <Input placeholder="Sao Paulo" {...field} />
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
                            <FormLabel>{t("company.state")}</FormLabel>
                            <FormControl>
                              <Input placeholder="SP" {...field} />
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
                            <FormLabel>{t("company.country")}</FormLabel>
                            <FormControl>
                              <Input placeholder="Brasil" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </fieldset>

                  <div className="flex justify-end">
                    {canUpdate ? (
                      <Button type="submit" className="cursor-pointer" disabled={isSaving || isLookingUpCnpj || isLookingUpPostalCode}>
                        {isSaving ? t("common.loading") : t("common.saveChanges")}
                      </Button>
                    ) : null}
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
