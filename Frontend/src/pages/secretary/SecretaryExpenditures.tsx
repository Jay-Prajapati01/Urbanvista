import { useState } from "react";
import SecretaryLayout from "@/components/secretary/SecretaryLayout";
import { useAuth } from "@/lib/auth";
import { expendituresApi } from "@/lib/api";
import type { Expenditure } from "@/lib/data";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Loader2, RefreshCw, Plus, Edit2, Trash2 } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface ExpenditureFormData {
  amount: number;
  category: "Utilities" | "Maintenance" | "Security" | "Cleaning" | "Admin" | "Other";
  description: string;
  date: string;
}

export default function SecretaryExpenditures() {
  const { isAuthenticated, isDemo, user } = useAuth();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ExpenditureFormData>({
    amount: 0,
    category: "Other",
    description: "",
    date: "",
  });

  const parseAmountInput = (value: string) => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const hasToken = isAuthenticated && !isDemo && user?.role === "secretary";

  const { data: expenditures = [], isLoading, refetch } = useQuery({
    queryKey: ["secretary-expenditures"],
    queryFn: expendituresApi.getAll,
    enabled: hasToken,
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Expenditure>) => expendituresApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["secretary-expenditures"] });
      setIsFormOpen(false);
      setFormData({ amount: 0, category: "Other", description: "", date: "" });
      toast.success("Expense recorded");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add expense");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Expenditure> }) => expendituresApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["secretary-expenditures"] });
      setIsFormOpen(false);
      setEditingId(null);
      setFormData({ amount: 0, category: "Other", description: "", date: "" });
      toast.success("Expense updated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update expense");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => expendituresApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["secretary-expenditures"] });
      toast.success("Expense deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete expense");
    },
  });

  const handleAddClick = () => {
    setEditingId(null);
    setFormData({ amount: 0, category: "Other", description: "", date: "" });
    setIsFormOpen(true);
  };

  const handleEditClick = (exp: Expenditure) => {
    setEditingId(exp.id);
    setFormData({
      amount: exp.amount,
      category: exp.category,
      description: exp.description,
      date: exp.date?.split("T")[0] || "",
    });
    setIsFormOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.amount || !formData.category) {
      toast.error("Amount and category are required");
      return;
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  if (isLoading) {
    return (
      <SecretaryLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-steel-blue" />
          <span className="ml-3 text-muted-foreground">Loading expenditures...</span>
        </div>
      </SecretaryLayout>
    );
  }

  const totalExpenses = expenditures.reduce((sum, e) => sum + (e.amount || 0), 0);
  const categories = [...new Set(expenditures.map((e) => e.category))];

  return (
    <>
    <SecretaryLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Expenditures</h1>
            <p className="text-muted-foreground mt-1">
              Track all expenses for your properties
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 px-4 py-2 text-sm border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleAddClick} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Record Expense
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingId ? "Edit Expense" : "Record New Expense"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="amount">Amount (₹)</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="500"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: parseAmountInput(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <select
                      id="category"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as "Utilities" | "Maintenance" | "Security" | "Cleaning" | "Admin" | "Other" })}
                    >
                      <option value="Other">Other</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Utilities">Utilities</option>
                      <option value="Security">Security</option>
                      <option value="Cleaning">Cleaning</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      placeholder="Details of expense"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} className="w-full">
                    {createMutation.isPending || updateMutation.isPending ? <>Saving...</> : editingId ? "Update" : "Record"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalExpenses}</div>
              <p className="text-xs text-muted-foreground">{expenditures.length} transactions</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{categories.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Average Expense</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₹{expenditures.length > 0 ? Math.round(totalExpenses / expenditures.length) : 0}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Expense Records</CardTitle>
            <CardDescription>All recorded expenses</CardDescription>
          </CardHeader>
          <CardContent>
            {expenditures.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No expenses recorded</p>
            ) : (
              <div className="space-y-2">
                {expenditures.map((exp) => (
                  <div key={exp.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                    <div className="flex-1">
                      <div className="font-medium">₹{exp.amount}</div>
                      <div className="text-sm text-muted-foreground">{exp.category} • {exp.description}</div>
                    </div>
                    <div className="text-sm text-muted-foreground mr-4">{new Date(exp.date || "").toLocaleDateString()}</div>
                    <div className="flex gap-2">
                      <button onClick={() => handleEditClick(exp)} aria-label={`Edit expense ${exp.category}`} className="p-2 hover:bg-muted rounded-lg">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteId(exp.id)}
                        aria-label={`Delete expense ${exp.category}`}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SecretaryLayout>
    <ConfirmDialog
      open={!!deleteId}
      title="Delete Expense"
      message="This action cannot be undone. The expense will be removed from active records."
      onCancel={() => setDeleteId(null)}
      onConfirm={() => {
        if (deleteId) {
          deleteMutation.mutate(deleteId);
          setDeleteId(null);
        }
      }}
    />
    </>
  );
}
