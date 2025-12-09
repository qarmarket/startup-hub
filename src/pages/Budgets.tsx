import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { budgetsService, Budget, CreateBudgetInput } from "@/services/budgets";
import { toast } from "sonner";
import { Plus, Search, Wallet, Calendar, DollarSign, Download } from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";

export default function Budgets() {
  const { isLead } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newBudget, setNewBudget] = useState<CreateBudgetInput>({
    name: "",
    period_type: "month",
    total_budget_amount: 0,
    currency: "USD",
    status: "draft",
  });

  useEffect(() => {
    fetchBudgets();
  }, []);

  const fetchBudgets = async () => {
    try {
      const data = await budgetsService.getAll();
      setBudgets(data);
    } catch (error) {
      toast.error("Failed to load budgets");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBudget = async () => {
    if (!newBudget.name) {
      toast.error("Please enter a budget name");
      return;
    }

    try {
      await budgetsService.create(newBudget);
      toast.success("Budget created successfully");
      setIsCreateOpen(false);
      setNewBudget({
        name: "",
        period_type: "month",
        total_budget_amount: 0,
        currency: "USD",
        status: "draft",
      });
      fetchBudgets();
    } catch (error) {
      toast.error("Failed to create budget");
    }
  };

  const handleExport = () => {
    const exportData = filteredBudgets.map((budget) => ({
      Name: budget.name,
      "Period Type": budget.period_type,
      "Total Amount": budget.total_budget_amount,
      Currency: budget.currency,
      Status: budget.status,
      "Created At": budget.created_at,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Budgets");
    XLSX.writeFile(wb, "budgets_export.xlsx");
    toast.success("Budgets exported successfully");
  };

  const filteredBudgets = budgets.filter((budget) => {
    const matchesSearch = budget.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || budget.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusColors: Record<string, "default" | "secondary" | "destructive"> = {
    draft: "secondary",
    active: "default",
    closed: "destructive",
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  return (
    <AppLayout
      title="Budgets"
      description="Manage your startup budgets and financial planning"
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
                  New Budget
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Budget</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Budget Name</Label>
                    <Input
                      placeholder="Q1 2024 Operations"
                      value={newBudget.name}
                      onChange={(e) => setNewBudget({ ...newBudget, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Period Type</Label>
                      <Select
                        value={newBudget.period_type}
                        onValueChange={(v) => setNewBudget({ ...newBudget, period_type: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="month">Month</SelectItem>
                          <SelectItem value="quarter">Quarter</SelectItem>
                          <SelectItem value="year">Year</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={newBudget.status}
                        onValueChange={(v) => setNewBudget({ ...newBudget, status: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Total Amount</Label>
                      <Input
                        type="number"
                        placeholder="10000"
                        value={newBudget.total_budget_amount}
                        onChange={(e) =>
                          setNewBudget({ ...newBudget, total_budget_amount: parseFloat(e.target.value) || 0 })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Currency</Label>
                      <Select
                        value={newBudget.currency}
                        onValueChange={(v) => setNewBudget({ ...newBudget, currency: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button onClick={handleCreateBudget} className="w-full">
                    Create Budget
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
              placeholder="Search budgets..."
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
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Budgets Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded w-3/4 mb-4" />
                  <div className="h-8 bg-muted rounded w-1/2 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredBudgets.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">No budgets found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery ? "Try adjusting your search" : "Create your first budget to get started"}
              </p>
              {isLead && !searchQuery && (
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Budget
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBudgets.map((budget, index) => (
              <Card
                key={budget.id}
                className="hover:shadow-md transition-shadow cursor-pointer animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base font-medium">{budget.name}</CardTitle>
                    <Badge variant={statusColors[budget.status]}>{budget.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-2xl font-bold text-primary">
                      <DollarSign className="h-5 w-5" />
                      {formatCurrency(budget.total_budget_amount, budget.currency)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {budget.period_type}
                      </div>
                      <span>•</span>
                      <span>{format(new Date(budget.created_at), "MMM d, yyyy")}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
