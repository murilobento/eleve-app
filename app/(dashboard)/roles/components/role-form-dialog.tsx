"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  createRoleSchema,
  type CreateRoleInput,
  groupPermissionsByResource,
  type ManagedRole,
  type UpdateRoleInput,
  updateRoleSchema,
} from "@/lib/roles-admin";
import { useI18n } from "@/i18n/provider";

type RoleFormDialogProps = {
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreateRoleInput | UpdateRoleInput) => Promise<void> | void;
  isSubmitting: boolean;
  role?: ManagedRole | null;
};

const permissionGroups = groupPermissionsByResource();

export function RoleFormDialog({
  mode,
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  role,
}: RoleFormDialogProps) {
  const { t } = useI18n();
  const isEdit = mode === "edit";
  const schema = isEdit ? updateRoleSchema : createRoleSchema;

  const form = useForm<CreateRoleInput | UpdateRoleInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      permissionKeys: [],
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    form.reset({
      name: role?.name ?? "",
      slug: role?.slug ?? "",
      description: role?.description ?? "",
      permissionKeys: role?.permissionKeys ?? [],
    });
  }, [form, open, role]);

  async function handleSubmit(values: CreateRoleInput | UpdateRoleInput) {
    await onSubmit(values);
    form.reset();
    onOpenChange(false);
  }

  const isDisabled = isSubmitting || Boolean(role?.isSystem);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {!isEdit ? (
        <DialogTrigger asChild>
          <Button className="cursor-pointer">
            <Plus className="mr-2 h-4 w-4" />
            {t("roles.addRole")}
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("roles.editRole") : t("roles.createRole")}</DialogTitle>
          <DialogDescription>
            {role?.isSystem
              ? t("roles.systemProtected")
              : t("roles.createDescription")}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("roles.name")}</FormLabel>
                    <FormControl>
                      <Input placeholder="Operations Manager" {...field} disabled={isDisabled} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("roles.slug")}</FormLabel>
                    <FormControl>
                      <Input placeholder="operations-manager" {...field} disabled={isDisabled} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                <FormLabel>{t("roles.descriptionLabel")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what this role is responsible for."
                      {...field}
                      value={field.value ?? ""}
                      disabled={isDisabled}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="permissionKeys"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("roles.permissionsLabel")}</FormLabel>
                  <FormControl>
                    <ScrollArea className="h-72 rounded-md border p-4">
                      <div className="space-y-4">
                        {permissionGroups.map((group) => (
                          <div key={group.resource} className="space-y-3">
                            <div>
                              <div className="text-sm font-medium">{group.label}</div>
                              <div className="text-xs text-muted-foreground">
                                {t("roles.permissionsAvailable", { resource: group.resource })}
                              </div>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                              {group.permissions.map((permission) => {
                                const checked = field.value?.includes(permission.key) ?? false;

                                return (
                                  <label key={permission.key} className="flex cursor-pointer items-start gap-3 rounded-md border p-3">
                                    <Checkbox
                                      checked={checked}
                                      disabled={isDisabled}
                                      onCheckedChange={(value) => {
                                        const nextValue = new Set(field.value ?? []);

                                        if (value) {
                                          nextValue.add(permission.key);
                                        } else {
                                          nextValue.delete(permission.key);
                                        }

                                        field.onChange([...nextValue]);
                                      }}
                                    />
                                    <div className="space-y-1">
                                      <div className="text-sm font-medium">{permission.key}</div>
                                      <div className="text-xs text-muted-foreground">{permission.description}</div>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" className="cursor-pointer" disabled={isDisabled}>
                {isSubmitting ? t("common.loading") : isEdit ? t("common.saveChanges") : t("roles.createRole")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
