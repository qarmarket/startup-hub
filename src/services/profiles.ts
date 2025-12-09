import { apiRequest } from "./api";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
}

export const profilesService = {
  async getAll(): Promise<Profile[]> {
    const response = await apiRequest<{ data: Profile[] }>("api-profiles");
    return response.data;
  },
};
