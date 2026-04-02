import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ManagedUsersStats } from "@/lib/users-admin";
import {
  ShieldOff,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";

type StatCardsProps = {
  stats: ManagedUsersStats;
};

const statItems = [
  {
    key: "totalUsers",
    title: "Total Users",
    icon: Users,
  },
  {
    key: "activeUsers",
    title: "Active Users",
    icon: UserCheck,
  },
  {
    key: "inactiveUsers",
    title: "Inactive Users",
    icon: ShieldOff,
  },
] as const satisfies ReadonlyArray<{
  key: keyof ManagedUsersStats;
  title: string;
  icon: typeof Users;
}>;

export function StatCards({ stats }: StatCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statItems.map((item) => {
        const value = stats[item.key];
        const percentage = stats.totalUsers > 0 ? Math.round((value / stats.totalUsers) * 100) : 0;

        return (
          <Card key={item.key} className="border">
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <item.icon className="text-muted-foreground size-6" />
                <Badge
                  variant="outline"
                  className={cn(
                    "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/20 dark:text-green-400",
                  )}
                >
                  <TrendingUp className="me-1 size-3" /> {percentage}%
                </Badge>
              </div>

              <div className="space-y-2">
                <p className="text-muted-foreground text-sm font-medium">{item.title}</p>
                <div className="text-2xl font-bold">{value}</div>
                <div className="text-muted-foreground text-sm">
                  {stats.totalUsers === 0 ? "No users yet" : `${value} of ${stats.totalUsers} users`}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
