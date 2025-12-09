import { apiRequest } from "./api";
import { Task } from "./tasks";

export interface DashboardStats {
  totalBudgets: number;
  activeBudgets: number;
  totalInvoices: number;
  unpaidInvoices: number;
  totalTasks: number;
  pendingTasks: number;
  totalNotes: number;
  teamMembers: number;
}

export interface DashboardData {
  stats: DashboardStats;
  recentTasks: Task[];
}

export const dashboardService = {
  async getStats(): Promise<DashboardData> {
    const response = await apiRequest<{ data: DashboardData }>("api-dashboard");
    return response.data;
  },
};
