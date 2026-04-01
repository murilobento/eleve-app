export const PERMISSION_CATALOG = [
  { key: "dashboard.read", resource: "dashboard", action: "read", description: "Access the dashboard." },
  { key: "calendar.read", resource: "calendar", action: "read", description: "View the calendar." },
  { key: "calendar.create", resource: "calendar", action: "create", description: "Create calendar events." },
  { key: "calendar.update", resource: "calendar", action: "update", description: "Edit calendar events." },
  { key: "calendar.delete", resource: "calendar", action: "delete", description: "Delete calendar events." },
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
