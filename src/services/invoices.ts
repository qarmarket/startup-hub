import { apiRequest } from "./api";

export interface Invoice {
  id: string;
  vendor_name: string | null;
  client_name: string | null;
  invoice_number: string | null;
  issue_date: string | null;
  due_date: string | null;
  amount: number | null;
  status: string;
  notes: string | null;
  created_at: string;
}

export interface CreateInvoiceInput {
  vendor_name: string;
  invoice_number: string;
  amount: number;
  status: string;
  issue_date?: string | null;
  due_date?: string | null;
  notes?: string;
}

export const invoicesService = {
  async getAll(): Promise<Invoice[]> {
    const response = await apiRequest<{ data: Invoice[] }>("api-invoices");
    return response.data;
  },

  async create(invoice: CreateInvoiceInput): Promise<Invoice> {
    const response = await apiRequest<{ data: Invoice }>("api-invoices", {
      method: "POST",
      body: invoice as unknown as Record<string, unknown>,
    });
    return response.data;
  },

  async update(id: string, updates: Partial<Invoice>): Promise<Invoice> {
    const response = await apiRequest<{ data: Invoice }>("api-invoices", {
      method: "PATCH",
      params: { id },
      body: updates as unknown as Record<string, unknown>,
    });
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await apiRequest("api-invoices", {
      method: "DELETE",
      params: { id },
    });
  },
};
