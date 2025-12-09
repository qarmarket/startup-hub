import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { dashboardService, DashboardStats } from "@/services/dashboard";
import { Task } from "@/services/tasks";
import {
  Wallet,
  FileText,
  CheckSquare,
  StickyNote,
  TrendingUp,
  Clock,
  AlertCircle,
  Users,
} from "lucide-react";

export default function Dashboard() {
  const { user, isLead } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalBudgets: 0,
    activeBudgets: 0,
    totalInvoices: 0,
    unpaidInvoices: 0,
    totalTasks: 0,
    pendingTasks: 0,
    totalNotes: 0,
    teamMembers: 0,
  });
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      try {
        const data = await dashboardService.getStats();
        setStats(data.stats);
        setRecentTasks(data.recentTasks);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  const statCards = [
    {
      title: "Total Budgets",
      value: stats.totalBudgets,
      subtitle: `${stats.activeBudgets} active`,
      icon: Wallet,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Invoices",
      value: stats.totalInvoices,
      subtitle: `${stats.unpaidInvoices} unpaid`,
      icon: FileText,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "Tasks",
      value: stats.totalTasks,
      subtitle: `${stats.pendingTasks} pending`,
      icon: CheckSquare,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Notes",
      value: stats.totalNotes,
      subtitle: "Total entries",
      icon: StickyNote,
      color: "text-accent-foreground",
      bgColor: "bg-accent",
    },
  ];

  const priorityColors: Record<string, string> = {
    high: "destructive",
    medium: "default",
    low: "secondary",
  };

  const statusColors: Record<string, string> = {
    backlog: "secondary",
    in_progress: "default",
    done: "success",
    blocked: "destructive",
  };

  return (
    <AppLayout title="Dashboard" description="Overview of your startup operations">
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, index) => (
            <Card
              key={stat.title}
              className="animate-fade-in border-border/50"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-3xl font-bold mt-1">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Tasks */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Recent Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No tasks yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant={statusColors[task.status] as any}
                            className="text-xs"
                          >
                            {task.status.replace("_", " ")}
                          </Badge>
                          <Badge
                            variant={priorityColors[task.priority] as any}
                            className="text-xs"
                          >
                            {task.priority}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                Quick Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLead && (
                  <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/10">
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium">Team Size</p>
                        <p className="text-xs text-muted-foreground">Active members</p>
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-primary">
                      {stats.teamMembers}
                    </span>
                  </div>
                )}

                {stats.unpaidInvoices > 0 && (
                  <div className="flex items-center justify-between p-4 rounded-lg bg-warning/5 border border-warning/10">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="h-5 w-5 text-warning" />
                      <div>
                        <p className="text-sm font-medium">Unpaid Invoices</p>
                        <p className="text-xs text-muted-foreground">Requires attention</p>
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-warning">
                      {stats.unpaidInvoices}
                    </span>
                  </div>
                )}

                {stats.pendingTasks > 0 && (
                  <div className="flex items-center justify-between p-4 rounded-lg bg-success/5 border border-success/10">
                    <div className="flex items-center gap-3">
                      <CheckSquare className="h-5 w-5 text-success" />
                      <div>
                        <p className="text-sm font-medium">Pending Tasks</p>
                        <p className="text-xs text-muted-foreground">In progress</p>
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-success">
                      {stats.pendingTasks}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
