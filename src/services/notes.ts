import { apiRequest } from "./api";

export interface Note {
  id: string;
  title: string;
  content: string | null;
  note_type: string | null;
  created_at: string;
}

export interface CreateNoteInput {
  title: string;
  content?: string;
  note_type: string;
}

export const notesService = {
  async getAll(): Promise<Note[]> {
    const response = await apiRequest<{ data: Note[] }>("api-notes");
    return response.data;
  },

  async create(note: CreateNoteInput): Promise<Note> {
    const response = await apiRequest<{ data: Note }>("api-notes", {
      method: "POST",
      body: note as unknown as Record<string, unknown>,
    });
    return response.data;
  },

  async update(id: string, updates: Partial<Note>): Promise<Note> {
    const response = await apiRequest<{ data: Note }>("api-notes", {
      method: "PATCH",
      params: { id },
      body: updates as unknown as Record<string, unknown>,
    });
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await apiRequest("api-notes", {
      method: "DELETE",
      params: { id },
    });
  },
};
