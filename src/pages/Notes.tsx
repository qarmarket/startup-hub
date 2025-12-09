import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { notesService, Note, CreateNoteInput } from "@/services/notes";
import { toast } from "sonner";
import { Plus, Search, StickyNote, Download, FileText } from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";

export default function Notes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [newNote, setNewNote] = useState<CreateNoteInput>({
    title: "",
    content: "",
    note_type: "general",
  });

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      const data = await notesService.getAll();
      setNotes(data);
    } catch (error) {
      toast.error("Failed to load notes");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNote = async () => {
    if (!newNote.title) {
      toast.error("Please enter a title");
      return;
    }

    try {
      await notesService.create(newNote);
      toast.success("Note created successfully");
      setIsCreateOpen(false);
      setNewNote({
        title: "",
        content: "",
        note_type: "general",
      });
      fetchNotes();
    } catch (error) {
      toast.error("Failed to create note");
    }
  };

  const handleExport = () => {
    const exportData = filteredNotes.map((note) => ({
      Title: note.title,
      Content: note.content,
      Type: note.note_type,
      "Created At": note.created_at,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Notes");
    XLSX.writeFile(wb, "notes_export.xlsx");
    toast.success("Notes exported successfully");
  };

  const filteredNotes = notes.filter((note) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      note.title.toLowerCase().includes(searchLower) ||
      note.content?.toLowerCase().includes(searchLower);
    const matchesType = typeFilter === "all" || note.note_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const noteTypes = ["general", "meeting", "decision", "idea"];

  const typeColors: Record<string, "default" | "secondary"> = {
    general: "secondary",
    meeting: "default",
    decision: "default",
    idea: "secondary",
  };

  return (
    <AppLayout
      title="Notes"
      description="Capture and organize your thoughts"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Note
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle>Create New Note</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label>Title</Label>
                    <Input
                      placeholder="Note title"
                      value={newNote.title}
                      onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={newNote.note_type}
                      onValueChange={(v) => setNewNote({ ...newNote, note_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {noteTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Content</Label>
                  <Textarea
                    placeholder="Write your note..."
                    value={newNote.content}
                    onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                    className="min-h-[200px]"
                  />
                </div>
                <Button onClick={handleCreateNote} className="w-full">
                  Create Note
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {noteTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Notes Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-4 bg-muted rounded w-3/4 mb-3" />
                  <div className="h-16 bg-muted rounded mb-2" />
                  <div className="h-3 bg-muted rounded w-1/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredNotes.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <StickyNote className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">No notes found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery ? "Try adjusting your search" : "Create your first note to get started"}
              </p>
              {!searchQuery && (
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Note
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNotes.map((note, index) => (
              <Card
                key={note.id}
                className="hover:shadow-md transition-shadow cursor-pointer animate-fade-in group"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => setSelectedNote(note)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium line-clamp-1 group-hover:text-primary transition-colors">
                      {note.title}
                    </h3>
                    <Badge variant={typeColors[note.note_type || "general"]} className="text-xs">
                      {note.note_type}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                    {note.content || "No content"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(note.created_at), "MMM d, yyyy")}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Note Detail Dialog */}
        <Dialog open={!!selectedNote} onOpenChange={() => setSelectedNote(null)}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {selectedNote?.title}
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-4">
                <Badge variant={typeColors[selectedNote?.note_type || "general"]}>
                  {selectedNote?.note_type}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {selectedNote && format(new Date(selectedNote.created_at), "MMMM d, yyyy")}
                </span>
              </div>
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap text-foreground">
                  {selectedNote?.content || "No content"}
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
