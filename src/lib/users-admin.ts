import { z } from "zod";

export const userStatusSchema = z.enum(["active", "pending", "banned"]);
export const userRoleAssignmentSchema = z.array(z.string().uuid()).min(1, "Select at least one role.");

const nameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters.")
  .max(80, "Name must be at most 80 characters.");

const emailSchema = z
  .string()
  .trim()
  .email("Please enter a valid email address.")
  .transform((value) => value.toLowerCase());

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password must be at most 128 characters.");

export const createManagedUserSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  roleIds: userRoleAssignmentSchema,
  status: userStatusSchema,
});

export const updateManagedUserSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: z
    .string()
    .max(128, "Password must be at most 128 characters.")
    .optional()
    .transform((value) => (value && value.trim().length > 0 ? value : undefined))
    .refine((value) => !value || value.length >= 8, {
      message: "Password must be at least 8 characters.",
    }),
  roleIds: userRoleAssignmentSchema,
  status: userStatusSchema,
});

export type ManagedUserStatus = z.infer<typeof userStatusSchema>;
export type CreateManagedUserInput = z.infer<typeof createManagedUserSchema>;
export type UpdateManagedUserInput = z.infer<typeof updateManagedUserSchema>;

type AuthAdminUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt: string;
  updatedAt: string;
  role?: string | null;
  banned?: boolean | null;
  banReason?: string | null;
};

export type ManagedRoleAssignment = {
  id: string;
  name: string;
  slug: string;
  isSystem: boolean;
};

export type ManagedUser = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  image: string | null;
  roles: ManagedRoleAssignment[];
  status: ManagedUserStatus;
  statusLabel: string;
  emailVerified: boolean;
  banned: boolean;
  banReason: string | null;
  joinedDate: string;
  updatedDate: string;
};

export type ManagedUsersStats = {
  totalUsers: number;
  activeUsers: number;
  pendingUsers: number;
  bannedUsers: number;
};

export function getUserInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "NA";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function getStatusFromUser(user: Pick<AuthAdminUser, "emailVerified" | "banned">): ManagedUserStatus {
  if (user.banned) {
    return "banned";
  }

  return user.emailVerified ? "active" : "pending";
}

export function getStatusLabel(status: ManagedUserStatus) {
  switch (status) {
    case "active":
      return "Active";
    case "pending":
      return "Pending";
    case "banned":
      return "Banned";
  }
}

export function buildUserStatusData(status: ManagedUserStatus) {
  switch (status) {
    case "active":
      return {
        emailVerified: true,
        banned: false,
        banReason: null,
        banExpires: null,
      };
    case "pending":
      return {
        emailVerified: false,
        banned: false,
        banReason: null,
        banExpires: null,
      };
    case "banned":
      return {
        emailVerified: true,
        banned: true,
        banReason: "Banned by administrator",
      };
  }
}

export function mapAuthUserToManagedUser(
  user: AuthAdminUser,
  roles: ManagedRoleAssignment[],
): ManagedUser {
  const status = getStatusFromUser(user);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: getUserInitials(user.name),
    image: user.image ?? null,
    roles,
    status,
    statusLabel: getStatusLabel(status),
    emailVerified: user.emailVerified,
    banned: Boolean(user.banned),
    banReason: user.banReason ?? null,
    joinedDate: user.createdAt,
    updatedDate: user.updatedAt,
  };
}

export function buildManagedUsersStats(users: ManagedUser[]): ManagedUsersStats {
  return users.reduce<ManagedUsersStats>(
    (stats, user) => {
      stats.totalUsers += 1;

      if (user.status === "active") {
        stats.activeUsers += 1;
      } else if (user.status === "pending") {
        stats.pendingUsers += 1;
      } else if (user.status === "banned") {
        stats.bannedUsers += 1;
      }

      return stats;
    },
    {
      totalUsers: 0,
      activeUsers: 0,
      pendingUsers: 0,
      bannedUsers: 0,
    },
  );
}
