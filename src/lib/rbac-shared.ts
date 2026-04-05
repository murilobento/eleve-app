export const PERMISSION_CATALOG = [
  { key: "dashboard.read", resource: "dashboard", action: "read", description: "Access the dashboard." },
  { key: "calendar.read", resource: "calendar", action: "read", description: "View the calendar." },
  { key: "calendar.create", resource: "calendar", action: "create", description: "Create calendar events." },
  { key: "calendar.update", resource: "calendar", action: "update", description: "Edit calendar events." },
  { key: "calendar.delete", resource: "calendar", action: "delete", description: "Delete calendar events." },
  { key: "budgets.read", resource: "budgets", action: "read", description: "View budgets." },
  { key: "budgets.create", resource: "budgets", action: "create", description: "Create budgets." },
  { key: "budgets.update", resource: "budgets", action: "update", description: "Edit budgets." },
  { key: "budgets.delete", resource: "budgets", action: "delete", description: "Delete budgets." },
  { key: "service-orders.read", resource: "service-orders", action: "read", description: "View service orders." },
  { key: "service-orders.create", resource: "service-orders", action: "create", description: "Create service orders." },
  { key: "service-orders.update", resource: "service-orders", action: "update", description: "Edit service orders." },
  { key: "service-orders.delete", resource: "service-orders", action: "delete", description: "Delete service orders." },
  { key: "company.read", resource: "company", action: "read", description: "View company details." },
  { key: "company.update", resource: "company", action: "update", description: "Edit company details." },
  { key: "clients.read", resource: "clients", action: "read", description: "View clients." },
  { key: "clients.create", resource: "clients", action: "create", description: "Create clients." },
  { key: "clients.update", resource: "clients", action: "update", description: "Edit clients." },
  { key: "clients.delete", resource: "clients", action: "delete", description: "Delete clients." },
  { key: "operators.read", resource: "operators", action: "read", description: "View operators." },
  { key: "operators.create", resource: "operators", action: "create", description: "Create operators." },
  { key: "operators.update", resource: "operators", action: "update", description: "Edit operators." },
  { key: "operators.delete", resource: "operators", action: "delete", description: "Delete operators." },
  { key: "equipment.read", resource: "equipment", action: "read", description: "View equipment." },
  { key: "equipment.create", resource: "equipment", action: "create", description: "Create equipment." },
  { key: "equipment.update", resource: "equipment", action: "update", description: "Edit equipment." },
  { key: "equipment.delete", resource: "equipment", action: "delete", description: "Delete equipment." },
  { key: "equipment-types.read", resource: "equipment-types", action: "read", description: "View equipment types." },
  { key: "equipment-types.create", resource: "equipment-types", action: "create", description: "Create equipment types." },
  { key: "equipment-types.update", resource: "equipment-types", action: "update", description: "Edit equipment types." },
  { key: "equipment-types.delete", resource: "equipment-types", action: "delete", description: "Delete equipment types." },
  { key: "service-types.read", resource: "service-types", action: "read", description: "View service types." },
  { key: "service-types.create", resource: "service-types", action: "create", description: "Create service types." },
  { key: "service-types.update", resource: "service-types", action: "update", description: "Edit service types." },
  { key: "service-types.delete", resource: "service-types", action: "delete", description: "Delete service types." },
  { key: "users.read", resource: "users", action: "read", description: "View users." },
  { key: "users.create", resource: "users", action: "create", description: "Create users." },
  { key: "users.update", resource: "users", action: "update", description: "Edit users." },
  { key: "users.delete", resource: "users", action: "delete", description: "Delete users." },
  { key: "roles.read", resource: "roles", action: "read", description: "View roles." },
  { key: "roles.create", resource: "roles", action: "create", description: "Create roles." },
  { key: "roles.update", resource: "roles", action: "update", description: "Edit roles." },
  { key: "roles.delete", resource: "roles", action: "delete", description: "Delete roles." },
  { key: "roles.assign", resource: "roles", action: "assign", description: "Assign roles to users." },
] as const;

export type PermissionKey = (typeof PERMISSION_CATALOG)[number]["key"];
export type PermissionResource = (typeof PERMISSION_CATALOG)[number]["resource"];

export type RoleRecord = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isSystem: boolean;
};

export type UserRoleSummary = {
  id: string;
  name: string;
  slug: string;
  isSystem: boolean;
};
