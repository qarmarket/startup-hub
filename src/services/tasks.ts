import { apiRequest } from "./api";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  assignee_user_id: string | null;
  created_at: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  status: string;
  priority: string;
  due_date?: string | null;
  assignee_user_id?: string | null;
}

export const tasksService = {
  async getAll(): Promise<Task[]> {
    const response = await apiRequest<{ data: Task[] }>("api-tasks");
    return response.data;
  },

  async create(task: CreateTaskInput): Promise<Task> {
    const response = await apiRequest<{ data: Task }>("api-tasks", {
      method: "POST",
      body: task as unknown as Record<string, unknown>,
    });
    return response.data;
  },

  async update(id: string, updates: Partial<Task>): Promise<Task> {
    const response = await apiRequest<{ data: Task }>("api-tasks", {
      method: "PATCH",
      params: { id },
      body: updates as unknown as Record<string, unknown>,
    });
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await apiRequest("api-tasks", {
      method: "DELETE",
      params: { id },
    });
  },
};
