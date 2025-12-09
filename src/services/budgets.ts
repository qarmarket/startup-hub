import { apiRequest } from "./api";

export interface Budget {
  id: string;
  name: string;
  period_type: string;
  start_date: string | null;
  end_date: string | null;
  total_budget_amount: number;
  currency: string;
  status: string;
  created_at: string;
}

export interface CreateBudgetInput {
  name: string;
  period_type: string;
  total_budget_amount: number;
  currency: string;
  status: string;
}

export const budgetsService = {
  async getAll(): Promise<Budget[]> {
    const response = await apiRequest<{ data: Budget[] }>("api-budgets");
    return response.data;
  },

  async create(budget: CreateBudgetInput): Promise<Budget> {
    const response = await apiRequest<{ data: Budget }>("api-budgets", {
      method: "POST",
      body: budget as unknown as Record<string, unknown>,
    });
    return response.data;
  },

  async update(id: string, updates: Partial<Budget>): Promise<Budget> {
    const response = await apiRequest<{ data: Budget }>("api-budgets", {
      method: "PATCH",
      params: { id },
      body: updates as unknown as Record<string, unknown>,
    });
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await apiRequest("api-budgets", {
      method: "DELETE",
      params: { id },
    });
  },
};
