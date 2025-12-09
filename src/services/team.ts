import { apiRequest } from "./api";

export interface TeamMember {
  id: string;
  email: string;
  full_name: string | null;
  status: string | null;
  created_at: string | null;
  role?: string;
}

export const teamService = {
  async getAll(): Promise<TeamMember[]> {
    const response = await apiRequest<{ data: TeamMember[] }>("api-team");
    return response.data;
  },

  async updateRole(userId: string, role: "lead" | "non_lead"): Promise<void> {
    await apiRequest("api-team", {
      method: "PATCH",
      params: { userId, action: "role" },
      body: { role },
    });
  },

  async updateStatus(userId: string, status: string): Promise<void> {
    await apiRequest("api-team", {
      method: "PATCH",
      params: { userId, action: "status" },
      body: { status },
    });
  },
};
