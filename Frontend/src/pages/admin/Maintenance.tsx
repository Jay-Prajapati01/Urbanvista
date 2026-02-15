import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { MaintenanceRecord, House } from "@/lib/data";
import { maintenanceApi, housesApi } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Filter,
  Wallet,
  FileText,
  MoreHorizontal,
  Pencil,
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportToCsv } from "@/lib/csv";
import { generateReceipt } from "@/lib/receipt";

export default function Maintenance() {
  const { isDemo, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [openBlocks, setOpenBlocks] = useState<Record<string, boolean>>({});

  // Form state
  const [newRecord, setNewRecord] = useState({
    houseId: "", paymentMethod: "UPI" as MaintenanceRecord["paymentMethod"],
    fromMonth: "", toMonth: "", baseAmount: 0, lateFee: 0, extraCharges: 0, amountPaid: 0,
  });

  // Fetch from API
  const { data: recordsList = [], isLoading } = useQuery<MaintenanceRecord[]>({
    queryKey: ["maintenance"],
    queryFn: maintenanceApi.getAll,
    enabled: isAuthenticated && !isDemo,
  });

  const { data: houses = [] } = useQuery<House[]>({
    queryKey: ["houses"],
    queryFn: housesApi.getAll,
    enabled: isAuthenticated && !isDemo,
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<MaintenanceRecord>) => maintenanceApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      toast.success("Maintenance record added successfully");
      setIsAddDialogOpen(false);
      setNewRecord({ houseId: "", paymentMethod: "UPI", fromMonth: "", toMonth: "", baseAmount: 0, lateFee: 0, extraCharges: 0, amountPaid: 0 });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Filter records
  const filteredRecords = recordsList.filter((record) => {
    const matchesSearch =
      record.houseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.ownerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || record.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Get block from houseNumber (e.g. "A-101" → "A")
  const getBlock = (houseNumber: string) => houseNumber.split("-")[0];

  // Group by block
  const groupedByBlock = filteredRecords.reduce((acc, record) => {
    const block = getBlock(record.houseNumber);
    if (!acc[block]) acc[block] = [];
    acc[block].push(record);
    return acc;
  }, {} as Record<string, MaintenanceRecord[]>);

  const toggleBlock = (block: string) => {
    setOpenBlocks((prev) => ({ ...prev, [block]: !prev[block] }));
  };

  const toggleAllBlocks = (open: boolean) => {
    const newState: Record<string, boolean> = {};
    Object.keys(groupedByBlock).forEach((block) => {
      newState[block] = open;
    });
    setOpenBlocks(newState);
  };

  const handleAction = (action: string, record: MaintenanceRecord) => {
    if (isDemo && action !== "Download") {
      toast.info("Demo mode – changes are disabled");
      return;
    }
    if (action === "Delete") {
      maintenanceApi.delete(record.id).then(() => {
        queryClient.invalidateQueries({ queryKey: ["maintenance"] });
        toast.success("Record deleted");
      });
    } else if (action === "Download") {
      generateReceipt(record);
      toast.success(`Receipt generated for ${record.houseNumber}`);
    } else {
      toast.success(`${action} for ${record.houseNumber}`);
    }
  };

  const handleExportCsv = () => {
    exportToCsv("maintenance_records", recordsList as Record<string, unknown>[], [
      { header: "House Number", key: "houseNumber" },
      { header: "Owner Name", key: "ownerName" },
      { header: "From Month", key: "fromMonth" },
      { header: "To Month", key: "toMonth" },
      { header: "Base Amount", key: "baseAmount" },
      { header: "Late Fee", key: "lateFee" },
      { header: "Extra Charges", key: "extraCharges" },
      { header: "Total Amount", key: "totalAmount" },
      { header: "Amount Paid", key: "amountPaid" },
      { header: "Balance", key: "totalAmount", format: (_v, row) => String((Number(row.totalAmount) || 0) - (Number(row.amountPaid) || 0)) },
      { header: "Payment Method", key: "paymentMethod" },
      { header: "Status", key: "status" },
    ]);
    toast.success("CSV exported successfully");
  };

  const getStatusBadge = (status: MaintenanceRecord["status"]) => {
    const config = {
      Paid: { class: "badge-paid", icon: CheckCircle },
      Pending: { class: "badge-pending", icon: Clock },
      Overdue: { class: "bg-destructive/10 text-destructive border border-destructive/20", icon: AlertCircle },
    };
    const { class: className, icon: Icon } = config[status];
    return (
      <span className={`badge-status ${className} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {status}
      </span>
    );
  };

  // Calculate stats
  const stats = {
    totalBilled: recordsList.reduce((acc, r) => acc + r.totalAmount, 0),
    totalCollected: recordsList.reduce((acc, r) => acc + r.amountPaid, 0),
    pending: recordsList.reduce((acc, r) => acc + (r.totalAmount - r.amountPaid), 0),
    paidCount: recordsList.filter((r) => r.status === "Paid").length,
    pendingCount: recordsList.filter((r) => r.status === "Pending").length,
    overdueCount: recordsList.filter((r) => r.status === "Overdue").length,
  };

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
            <h1 className="text-2xl font-bold text-foreground">Maintenance</h1>
            <p className="text-muted-foreground">Track monthly maintenance billing and payments</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportCsv}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="hero" disabled={isDemo}>
                <Plus className="w-4 h-4 mr-2" />
                Add Record
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Maintenance Record</DialogTitle>
                <DialogDescription>
                  Enter the maintenance billing details.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>House</Label>
                    <Select value={newRecord.houseId} onValueChange={(v) => setNewRecord({ ...newRecord, houseId: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select house" />
                      </SelectTrigger>
                      <SelectContent>
                        {houses
                          .filter((h) => h.status === "occupied")
                          .map((house) => (
                            <SelectItem key={house.id} value={house.id}>
                              {house.houseNumber}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <Select value={newRecord.paymentMethod} onValueChange={(v) => setNewRecord({ ...newRecord, paymentMethod: v as MaintenanceRecord["paymentMethod"] })}>
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
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>From Month</Label>
                    <Input type="month" value={newRecord.fromMonth} onChange={(e) => setNewRecord({ ...newRecord, fromMonth: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>To Month</Label>
                    <Input type="month" value={newRecord.toMonth} onChange={(e) => setNewRecord({ ...newRecord, toMonth: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Base Amount (₹)</Label>
                    <Input type="number" placeholder="3000" value={newRecord.baseAmount || ""} onChange={(e) => setNewRecord({ ...newRecord, baseAmount: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Late Fee (₹)</Label>
                    <Input type="number" placeholder="0" value={newRecord.lateFee || ""} onChange={(e) => setNewRecord({ ...newRecord, lateFee: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Extra Charges (₹)</Label>
                    <Input type="number" placeholder="0" value={newRecord.extraCharges || ""} onChange={(e) => setNewRecord({ ...newRecord, extraCharges: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Amount Paid (₹)</Label>
                  <Input type="number" placeholder="0" value={newRecord.amountPaid || ""} onChange={(e) => setNewRecord({ ...newRecord, amountPaid: Number(e.target.value) })} />
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
                    const selectedHouse = houses.find((h) => h.id === newRecord.houseId);
                    const total = newRecord.baseAmount + newRecord.lateFee + newRecord.extraCharges;
                    const status = newRecord.amountPaid >= total ? "Paid" : newRecord.amountPaid > 0 ? "Pending" : "Overdue";
                    createMutation.mutate({
                      houseId: newRecord.houseId,
                      houseNumber: selectedHouse?.houseNumber || "",
                      ownerName: "",
                      fromMonth: newRecord.fromMonth,
                      toMonth: newRecord.toMonth,
                      baseAmount: newRecord.baseAmount,
                      lateFee: newRecord.lateFee,
                      extraCharges: newRecord.extraCharges,
                      totalAmount: total,
                      amountPaid: newRecord.amountPaid,
                      paymentMethod: newRecord.paymentMethod,
                      status: status as MaintenanceRecord["status"],
                    });
                  }}
                >
                  {createMutation.isPending ? "Adding..." : "Add Record"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-up delay-100">
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Billed</p>
                <p className="text-2xl font-bold text-foreground">₹{stats.totalBilled.toLocaleString()}</p>
              </div>
              <Wallet className="w-5 h-5 text-steel-blue" />
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Collected</p>
                <p className="text-2xl font-bold text-steel-blue">₹{stats.totalCollected.toLocaleString()}</p>
              </div>
              <CheckCircle className="w-5 h-5 text-steel-blue" />
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-amber-500">₹{stats.pending.toLocaleString()}</p>
              </div>
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Collection Rate</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats.totalBilled ? Math.round((stats.totalCollected / stats.totalBilled) * 100) : 0}%
                </p>
              </div>
              <FileText className="w-5 h-5 text-steel-blue" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 animate-fade-up delay-200">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by house or owner..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Paid">Paid</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Expand/Collapse All */}
        <div className="flex items-center gap-2 animate-fade-up delay-200">
          <Button variant="outline" size="sm" onClick={() => toggleAllBlocks(true)}>
            Expand All
          </Button>
          <Button variant="outline" size="sm" onClick={() => toggleAllBlocks(false)}>
            Collapse All
          </Button>
        </div>

        {/* Records grouped by block — Collapsible */}
        {Object.entries(groupedByBlock)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([block, blockRecords]) => {
            const paidCount = blockRecords.filter((r) => r.status === "Paid").length;
            const pendingCount = blockRecords.filter((r) => r.status === "Pending").length;
            const overdueCount = blockRecords.filter((r) => r.status === "Overdue").length;
            const isOpen = openBlocks[block] ?? false;

            return (
              <Collapsible
                key={block}
                open={isOpen}
                onOpenChange={() => toggleBlock(block)}
                className="glass-card overflow-hidden animate-fade-up delay-300"
              >
                <CollapsibleTrigger asChild>
                  <button className="w-full px-6 py-4 border-b border-border bg-secondary/30 flex items-center justify-between hover:bg-secondary/50 transition-colors duration-200 cursor-pointer">
                    <div className="flex items-center gap-3">
                      {isOpen ? (
                        <ChevronDown className="w-5 h-5 text-steel-blue transition-transform duration-200" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-steel-blue transition-transform duration-200" />
                      )}
                      <div className="text-left">
                        <h3 className="font-semibold text-foreground">Block {block}</h3>
                        <p className="text-sm text-muted-foreground">{blockRecords.length} records</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      {paidCount > 0 && (
                        <span className="badge-status badge-paid flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> {paidCount} Paid
                        </span>
                      )}
                      {pendingCount > 0 && (
                        <span className="badge-status badge-pending flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {pendingCount} Pending
                        </span>
                      )}
                      {overdueCount > 0 && (
                        <span className="badge-status bg-destructive/10 text-destructive border border-destructive/20 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {overdueCount} Overdue
                        </span>
                      )}
                    </div>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>House</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Paid</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Payment Method</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {blockRecords
                        .sort((a, b) => a.houseNumber.localeCompare(b.houseNumber))
                        .map((record) => (
                        <TableRow key={record.id} className="table-row-hover">
                          <TableCell className="font-medium text-foreground">{record.houseNumber}</TableCell>
                          <TableCell className="text-muted-foreground">{record.ownerName}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {record.fromMonth} to {record.toMonth}
                          </TableCell>
                          <TableCell className="font-medium text-foreground">
                            ₹{(record.totalAmount ?? 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="font-medium text-steel-blue">
                            ₹{(record.amountPaid ?? 0).toLocaleString()}
                          </TableCell>
                          <TableCell>{getStatusBadge(record.status)}</TableCell>
                          <TableCell className="text-muted-foreground">{record.paymentMethod}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleAction("Edit", record)}>
                                  <Pencil className="w-4 h-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleAction("Download", record)}>
                                  <Download className="w-4 h-4 mr-2" />
                                  Download Receipt
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CollapsibleContent>
              </Collapsible>
            );
          })}

        {filteredRecords.length === 0 && (
          <div className="glass-card p-12 text-center">
            <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground">No records found</h3>
            <p className="text-muted-foreground mt-1">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
