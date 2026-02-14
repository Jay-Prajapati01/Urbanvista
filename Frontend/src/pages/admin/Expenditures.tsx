import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Expenditure } from "@/lib/data";
import { expendituresApi } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Filter,
  Receipt,
  Download,
  MoreHorizontal,
  Pencil,
  Trash2,
  Zap,
  Shield,
  Wrench,
  Sparkles,
  FileText,
  MoreVertical,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const categoryIcons: Record<string, React.ElementType> = {
  Utilities: Zap,
  Security: Shield,
  Maintenance: Wrench,
  Cleaning: Sparkles,
  Admin: FileText,
  Other: MoreVertical,
};

export default function Expenditures() {
  const { isDemo, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Form state
  const [newExpense, setNewExpense] = useState({
    title: "", category: "Maintenance" as Expenditure["category"],
    amount: 0, paymentMode: "UPI" as Expenditure["paymentMode"], date: "", description: "",
  });

  // Fetch from API
  const { data: expendituresList = [], isLoading } = useQuery<Expenditure[]>({
    queryKey: ["expenditures"],
    queryFn: expendituresApi.getAll,
    enabled: isAuthenticated && !isDemo,
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Expenditure>) => expendituresApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenditures"] });
      toast.success("Expense added successfully");
      setIsAddDialogOpen(false);
      setNewExpense({ title: "", category: "Maintenance", amount: 0, paymentMode: "UPI", date: "", description: "" });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => expendituresApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenditures"] });
      toast.success("Expense deleted successfully");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Get unique categories
  const categories = [...new Set(expendituresList.map((e) => e.category))];

  // Filter expenditures
  const filteredExpenditures = expendituresList.filter((expenditure) => {
    const matchesSearch =
      expenditure.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expenditure.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || expenditure.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleAction = (action: string, expenditure: Expenditure) => {
    if (isDemo && action !== "Download") {
      toast.info("Demo mode – changes are disabled");
      return;
    }
    if (action === "Delete") {
      deleteMutation.mutate(expenditure.id);
    } else {
      toast.success(`${action} ${expenditure.title}`);
    }
  };

  // Calculate stats
  const totalExpenses = expendituresList.reduce((acc, e) => acc + e.amount, 0);
  const categoryTotals = expendituresList.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

  const sortedCategories = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-steel-blue" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-up">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Expenditures</h1>
            <p className="text-muted-foreground">Track all society expenses</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => toast.success("CSV exported")}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="hero" disabled={isDemo}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Expense
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Expense</DialogTitle>
                  <DialogDescription>
                    Enter the expense details.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input placeholder="e.g. Electricity Bill" value={newExpense.title} onChange={(e) => setNewExpense({ ...newExpense, title: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={newExpense.category} onValueChange={(v) => setNewExpense({ ...newExpense, category: v as Expenditure["category"] })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Utilities">Utilities</SelectItem>
                          <SelectItem value="Maintenance">Maintenance</SelectItem>
                          <SelectItem value="Security">Security</SelectItem>
                          <SelectItem value="Cleaning">Cleaning</SelectItem>
                          <SelectItem value="Admin">Admin</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Amount (₹)</Label>
                      <Input type="number" placeholder="0" value={newExpense.amount || ""} onChange={(e) => setNewExpense({ ...newExpense, amount: Number(e.target.value) })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Payment Mode</Label>
                      <Select value={newExpense.paymentMode} onValueChange={(v) => setNewExpense({ ...newExpense, paymentMode: v as Expenditure["paymentMode"] })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Cash">Cash</SelectItem>
                          <SelectItem value="UPI">UPI</SelectItem>
                          <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                          <SelectItem value="Cheque">Cheque</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input type="date" value={newExpense.date} onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea placeholder="Brief description of the expense..." value={newExpense.description} onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    disabled={createMutation.isPending}
                    onClick={() => {
                      if (isDemo) { toast.info("Demo mode – changes are disabled"); setIsAddDialogOpen(false); return; }
                      createMutation.mutate({
                        title: newExpense.title,
                        category: newExpense.category,
                        amount: newExpense.amount,
                        paymentMode: newExpense.paymentMode,
                        date: newExpense.date,
                        description: newExpense.description,
                      });
                    }}
                  >
                    {createMutation.isPending ? "Adding..." : "Add Expense"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 animate-fade-up delay-100">
          <div className="stat-card lg:col-span-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-2xl font-bold text-foreground">₹{totalExpenses.toLocaleString()}</p>
              </div>
              <Receipt className="w-5 h-5 text-steel-blue" />
            </div>
          </div>
          {sortedCategories.map(([category, amount]) => {
            const Icon = categoryIcons[category] || FileText;
            return (
              <div key={category} className="stat-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{category}</p>
                    <p className="text-xl font-bold text-foreground">₹{amount.toLocaleString()}</p>
                  </div>
                  <Icon className="w-5 h-5 text-steel-blue" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 animate-fade-up delay-200">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search expenses..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Expenditures table */}
        <div className="glass-card overflow-hidden animate-fade-up delay-300">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Payment Mode</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenditures.map((expenditure) => {
                const Icon = categoryIcons[expenditure.category] || FileText;
                return (
                  <TableRow key={expenditure.id} className="table-row-hover">
                    <TableCell className="font-medium text-foreground">{expenditure.title}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <span className="badge-status badge-vacant">{expenditure.category}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      ₹{expenditure.amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{expenditure.paymentMode}</TableCell>
                    <TableCell className="text-muted-foreground">{expenditure.date}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">
                      {expenditure.description}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleAction("Edit", expenditure)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleAction("Delete", expenditure)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {filteredExpenditures.length === 0 && (
          <div className="glass-card p-12 text-center">
            <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground">No expenses found</h3>
            <p className="text-muted-foreground mt-1">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
