"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  createManagedUserSchema,
  type CreateManagedUserInput,
  type ManagedUser,
  type UpdateManagedUserInput,
  updateManagedUserSchema,
} from "@/lib/users-admin";
import type { RoleRecord } from "@/lib/rbac-shared";
import { useI18n } from "@/i18n/provider";

type UserFormDialogProps = {
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreateManagedUserInput | UpdateManagedUserInput) => Promise<void> | void;
  isSubmitting: boolean;
  user?: ManagedUser | null;
  availableRoles: RoleRecord[];
};

export function UserFormDialog({
  mode,
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  user,
  availableRoles,
}: UserFormDialogProps) {
  const { t } = useI18n();
  const isEdit = mode === "edit";
  const schema = isEdit ? updateManagedUserSchema : createManagedUserSchema;

  const form = useForm<CreateManagedUserInput | UpdateManagedUserInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      roleIds: [],
      status: "active",
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    const defaultUserRole = availableRoles.find((role) => role.slug === "user");
    const defaultRoleIds = user
      ? user.roles.map((role) => role.id)
      : defaultUserRole
        ? [defaultUserRole.id]
        : [];

    form.reset({
      name: user?.name ?? "",
      email: user?.email ?? "",
      password: "",
      roleIds: defaultRoleIds,
      status: user?.status ?? "active",
    });
  }, [availableRoles, form, open, user]);

  async function handleSubmit(values: CreateManagedUserInput | UpdateManagedUserInput) {
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
            {t("users.addUser")}
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="sm:max-w-xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <DialogHeader className="gap-3">
              <div className="flex flex-wrap items-center gap-3 pr-8">
                <DialogTitle>{isEdit ? t("users.editUser") : t("users.createUser")}</DialogTitle>
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="flex shrink-0 flex-row items-center gap-3 space-y-0 rounded-md border px-3 py-2">
                      <FormLabel className="cursor-pointer text-sm font-medium">
                        {field.value === "active" ? t("users.active") : t("users.inactive")}
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
            </DialogHeader>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("users.name")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("users.fullName")} {...field} />
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
                  <FormLabel>{t("users.email")}</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="name@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{isEdit ? t("users.newPassword") : t("auth.password")}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder={isEdit ? t("users.leavePasswordBlank") : t("users.atLeast8Chars")}
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
              name="roleIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("users.roles")}</FormLabel>
                  <FormControl>
                    <ScrollArea className="h-40 w-full rounded-md border p-3">
                      <div className="space-y-3">
                        {availableRoles.map((role) => {
                          const checked = field.value?.includes(role.id) ?? false;

                          return (
                            <label key={role.id} className="flex cursor-pointer items-start gap-3">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(value) => {
                                  const nextValue = new Set(field.value ?? []);

                                  if (value) {
                                    nextValue.add(role.id);
                                  } else {
                                    nextValue.delete(role.id);
                                  }

                                  field.onChange([...nextValue]);
                                }}
                              />
                              <div className="text-sm font-medium">{role.name}</div>
                            </label>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" className="cursor-pointer" disabled={isSubmitting}>
                {isSubmitting ? t("common.loading") : isEdit ? t("common.saveChanges") : t("users.createUser")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
