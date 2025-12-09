import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { invoicesService, Invoice, CreateInvoiceInput } from "@/services/invoices";
import { toast } from "sonner";
import { Plus, Search, FileText, Download } from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";

export default function Invoices() {
  const { isLead } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newInvoice, setNewInvoice] = useState<CreateInvoiceInput>({
    vendor_name: "",
    invoice_number: "",
    amount: 0,
    status: "unpaid",
    issue_date: "",
    due_date: "",
    notes: "",
  });

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const data = await invoicesService.getAll();
      setInvoices(data);
    } catch (error) {
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = async () => {
    if (!newInvoice.vendor_name) {
      toast.error("Please enter a vendor name");
      return;
    }

    try {
      await invoicesService.create({
        ...newInvoice,
        issue_date: newInvoice.issue_date || null,
        due_date: newInvoice.due_date || null,
      });
      toast.success("Invoice created successfully");
      setIsCreateOpen(false);
      setNewInvoice({
        vendor_name: "",
        invoice_number: "",
        amount: 0,
        status: "unpaid",
        issue_date: "",
        due_date: "",
        notes: "",
      });
      fetchInvoices();
    } catch (error) {
      toast.error("Failed to create invoice");
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await invoicesService.update(id, { status: newStatus });
      toast.success("Status updated");
      fetchInvoices();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleExport = () => {
    const exportData = filteredInvoices.map((invoice) => ({
      "Invoice Number": invoice.invoice_number,
      Vendor: invoice.vendor_name,
      Amount: invoice.amount,
      Status: invoice.status,
      "Issue Date": invoice.issue_date,
      "Due Date": invoice.due_date,
      Notes: invoice.notes,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Invoices");
    XLSX.writeFile(wb, "invoices_export.xlsx");
    toast.success("Invoices exported successfully");
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      invoice.vendor_name?.toLowerCase().includes(searchLower) ||
      invoice.invoice_number?.toLowerCase().includes(searchLower);
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusColors: Record<string, "default" | "secondary" | "destructive"> = {
    unpaid: "secondary",
    paid: "default",
    overdue: "destructive",
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <AppLayout
      title="Invoices"
      description="Track and manage your invoices"
      actions={
        isLead && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Invoice
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Invoice</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Vendor Name</Label>
                      <Input
                        placeholder="Acme Corp"
                        value={newInvoice.vendor_name}
                        onChange={(e) => setNewInvoice({ ...newInvoice, vendor_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Invoice Number</Label>
                      <Input
                        placeholder="INV-001"
                        value={newInvoice.invoice_number}
                        onChange={(e) => setNewInvoice({ ...newInvoice, invoice_number: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Amount</Label>
                      <Input
                        type="number"
                        placeholder="1000"
                        value={newInvoice.amount}
                        onChange={(e) => setNewInvoice({ ...newInvoice, amount: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={newInvoice.status}
                        onValueChange={(v) => setNewInvoice({ ...newInvoice, status: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unpaid">Unpaid</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="overdue">Overdue</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Issue Date</Label>
                      <Input
                        type="date"
                        value={newInvoice.issue_date || ""}
                        onChange={(e) => setNewInvoice({ ...newInvoice, issue_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Due Date</Label>
                      <Input
                        type="date"
                        value={newInvoice.due_date || ""}
                        onChange={(e) => setNewInvoice({ ...newInvoice, due_date: e.target.value })}
                      />
                    </div>
                  </div>
                  <Button onClick={handleCreateInvoice} className="w-full">
                    Create Invoice
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )
      }
    >
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search invoices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Invoices Table */}
        {loading ? (
          <Card className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-64 bg-muted rounded" />
            </CardContent>
          </Card>
        ) : filteredInvoices.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">No invoices found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery ? "Try adjusting your search" : "Create your first invoice to get started"}
              </p>
              {isLead && !searchQuery && (
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Invoice
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  {isLead && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      {invoice.invoice_number || "-"}
                    </TableCell>
                    <TableCell>{invoice.vendor_name || "-"}</TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(invoice.amount)}
                    </TableCell>
                    <TableCell>
                      {invoice.due_date ? format(new Date(invoice.due_date), "MMM d, yyyy") : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColors[invoice.status]}>{invoice.status}</Badge>
                    </TableCell>
                    {isLead && (
                      <TableCell>
                        <Select
                          value={invoice.status}
                          onValueChange={(v) => handleStatusChange(invoice.id, v)}
                        >
                          <SelectTrigger className="w-[120px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unpaid">Unpaid</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="overdue">Overdue</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
