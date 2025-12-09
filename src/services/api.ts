import { supabase } from "@/integrations/supabase/client";

const API_BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }
  return {
    "Authorization": `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
  };
}

export async function apiRequest<T>(
  endpoint: string,
  options: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    body?: Record<string, unknown>;
    params?: Record<string, string>;
  } = {}
): Promise<T> {
  const { method = "GET", body, params } = options;
  
  const headers = await getAuthHeaders();
  const url = new URL(`${API_BASE_URL}/${endpoint}`);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  const response = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "API request failed");
  }

  return data;
}
