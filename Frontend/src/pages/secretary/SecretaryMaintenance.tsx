import { useState } from "react";
import SecretaryLayout from "@/components/secretary/SecretaryLayout";
import { useAuth } from "@/lib/auth";
import { maintenanceApi, housesApi } from "@/lib/api";
import { secretaryResidentsApi, type Resident } from "@/lib/secretaryApi";
import type { MaintenanceRecord, House } from "@/lib/data";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wallet, Loader2, RefreshCw, Plus, Edit2, Trash2, Building2, UserRound, CalendarDays, IndianRupee, NotebookText } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface MaintenanceFormData {
  baseAmount: number;
  lateFeePerDay: number;
  extraCharges: number;
  fromMonth: string;
  toMonth: string;
  dueDate: string;
  houseId: string;
  residentId: string;
  description: string;
}

export default function SecretaryMaintenance() {
  const { isAuthenticated, isDemo, user } = useAuth();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState<MaintenanceFormData>({
    baseAmount: 0,
    lateFeePerDay: 0,
    extraCharges: 0,
    fromMonth: "",
    toMonth: "",
    dueDate: "",
    houseId: "",
    residentId: "",
    description: "",
  });

  const parseAmountInput = (value: string) => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const hasToken = isAuthenticated && !isDemo && user?.role === "secretary";

  const { data: maintenance = [], isLoading, refetch } = useQuery({
    queryKey: ["secretary-maintenance"],
    queryFn: maintenanceApi.getAll,
    enabled: hasToken,
  });

  const { data: houses = [] } = useQuery({
    queryKey: ["secretary-houses"],
    queryFn: housesApi.getAll,
    enabled: hasToken,
  });

  const { data: residents = [] } = useQuery({
    queryKey: ["secretary-residents-for-maintenance"],
    queryFn: secretaryResidentsApi.getAll,
    enabled: hasToken,
  });

  const selectedHouse = houses.find((house) => house.id === formData.houseId) || null;
  const computedTotal = Number((formData.baseAmount + formData.extraCharges).toFixed(2));

  const createMutation = useMutation({
    mutationFn: (data: Partial<MaintenanceRecord>) => maintenanceApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["secretary-maintenance"] });
      setIsFormOpen(false);
      setFormData({
        baseAmount: 0,
        lateFeePerDay: 0,
        extraCharges: 0,
        fromMonth: "",
        toMonth: "",
        dueDate: "",
        houseId: "",
        residentId: "",
        description: "",
      });
      toast.success("Maintenance record added");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add maintenance");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MaintenanceRecord> }) => maintenanceApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["secretary-maintenance"] });
      setIsFormOpen(false);
      setEditingId(null);
      setFormData({
        baseAmount: 0,
        lateFeePerDay: 0,
        extraCharges: 0,
        fromMonth: "",
        toMonth: "",
        dueDate: "",
        houseId: "",
        residentId: "",
        description: "",
      });
      toast.success("Maintenance record updated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update maintenance");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => maintenanceApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["secretary-maintenance"] });
      toast.success("Maintenance record deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete maintenance");
    },
  });

  const handleAddClick = () => {
    setEditingId(null);
    setFormData({
      baseAmount: 0,
      lateFeePerDay: 0,
      extraCharges: 0,
      fromMonth: "",
      toMonth: "",
      dueDate: "",
      houseId: "",
      residentId: "",
      description: "",
    });
    setIsFormOpen(true);
  };

  const handleEditClick = (record: MaintenanceRecord) => {
    setEditingId(record.id);
    setFormData({
      baseAmount: record.baseAmount,
      lateFeePerDay: record.lateFeePerDay || record.lateFee || 0,
      extraCharges: record.extraCharges,
      fromMonth: record.fromMonth?.split("T")[0] || "",
      toMonth: record.toMonth?.split("T")[0] || "",
      dueDate: record.dueDate?.split("T")[0] || "",
      houseId: record.houseId,
      residentId: record.userId || "",
      description: "",
    });
    setIsFormOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.houseId) {
      toast.error("Property is required");
      return;
    }

    if (!editingId && !formData.residentId) {
      toast.error("Resident is required");
      return;
    }

    if (!formData.fromMonth || !formData.toMonth || formData.fromMonth > formData.toMonth) {
      toast.error("From month must be before or equal to to month");
      return;
    }

    if (!formData.dueDate) {
      toast.error("Due date is required");
      return;
    }

    if (formData.baseAmount <= 0) {
      toast.error("Base amount must be greater than 0");
      return;
    }

    const payload = {
      ...formData,
      totalAmount: computedTotal,
      houseNumber: selectedHouse?.houseNumber || "",
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const getHouseName = (houseId: string) => {
    const house = houses.find((h) => h.id === houseId);
    return house ? `${house.block}-${house.houseNumber}` : "Unknown";
  };

  if (isLoading) {
    return (
      <SecretaryLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-steel-blue" />
          <span className="ml-3 text-muted-foreground">Loading maintenance records...</span>
        </div>
      </SecretaryLayout>
    );
  }

  const totalBilled = maintenance.reduce((sum, m) => sum + (m.totalAmount || 0), 0);
  const totalPaid = maintenance
    .filter((m) => String(m.status || "").toLowerCase() === "paid")
    .reduce((sum, m) => sum + Number(m.paidAmount ?? m.amountPaid ?? 0), 0);
  const pendingAmount = totalBilled - totalPaid;
  const collected = maintenance.filter((m) => String(m.status || "").toLowerCase() === "paid").length;

  return (
    <>
    <SecretaryLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Maintenance Billing</h1>
            <p className="text-muted-foreground mt-1">
              Track and manage maintenance bills and collections
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
                  Add Bill
                </Button>
              </DialogTrigger>
              <DialogContent className="h-[92vh] w-[min(96vw,920px)] max-w-none overflow-hidden p-0">
                <div className="flex h-full min-h-0 flex-col">
                  <DialogHeader className="sticky top-0 z-10 border-b bg-background px-6 py-4">
                    <DialogTitle>{editingId ? "Edit Maintenance Bill" : "Add Maintenance Bill"}</DialogTitle>
                    <DialogDescription>
                      Create structured maintenance billing with clear property, period, and financial details.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
                    <div className="space-y-5">
                      <section className="rounded-xl border bg-card p-4 sm:p-5">
                        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
                          <Building2 className="h-4 w-4" />
                          Property Details
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="md:col-span-2">
                            <Label htmlFor="houseId">Property</Label>
                            <Select value={formData.houseId} onValueChange={(val) => setFormData({ ...formData, houseId: val })}>
                              <SelectTrigger id="houseId">
                                <SelectValue placeholder="Select property" />
                              </SelectTrigger>
                              <SelectContent>
                                {houses.map((house) => (
                                  <SelectItem key={house.id} value={house.id}>
                                    {house.block}-{house.houseNumber}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="md:col-span-2">
                            <Label htmlFor="residentId">Resident</Label>
                            <Select
                              value={formData.residentId}
                              onValueChange={(val) => {
                                const resident = residents.find((r) => r.id === val) || null;
                                setFormData({
                                  ...formData,
                                  residentId: val,
                                  houseId: resident?.houseId || formData.houseId,
                                });
                              }}
                            >
                              <SelectTrigger id="residentId">
                                <SelectValue placeholder="Select resident" />
                              </SelectTrigger>
                              <SelectContent>
                                {residents.map((resident: Resident) => (
                                  <SelectItem key={resident.id} value={resident.id}>
                                    {resident.name} ({resident.email})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="md:col-span-2">
                            <Label htmlFor="houseUnit">House / Unit</Label>
                            <div className="relative">
                              <Input
                                id="houseUnit"
                                value={selectedHouse ? `${selectedHouse.block}-${selectedHouse.houseNumber}` : ""}
                                readOnly
                                className="pl-10"
                              />
                              <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            </div>
                          </div>
                        </div>
                      </section>

                      <section className="rounded-xl border bg-card p-4 sm:p-5">
                        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
                          <CalendarDays className="h-4 w-4" />
                          Billing Details
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                          <div>
                            <Label htmlFor="fromMonth">From Month</Label>
                            <Input
                              id="fromMonth"
                              type="month"
                              className="date-input-uv"
                              value={formData.fromMonth}
                              onChange={(e) => setFormData({ ...formData, fromMonth: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="toMonth">To Month</Label>
                            <Input
                              id="toMonth"
                              type="month"
                              className="date-input-uv"
                              value={formData.toMonth}
                              onChange={(e) => setFormData({ ...formData, toMonth: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="dueDate">Due Date</Label>
                            <Input
                              id="dueDate"
                              type="date"
                              className="date-input-uv"
                              value={formData.dueDate}
                              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                            />
                          </div>
                        </div>
                      </section>

                      <section className="rounded-xl border bg-card p-4 sm:p-5">
                        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
                          <IndianRupee className="h-4 w-4" />
                          Financial Details
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div>
                            <Label htmlFor="baseAmount">Base Amount (₹)</Label>
                            <Input
                              id="baseAmount"
                              type="number"
                              placeholder="500"
                              value={formData.baseAmount}
                              onChange={(e) => setFormData({ ...formData, baseAmount: parseAmountInput(e.target.value) })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="lateFeePerDay">Late Fee Per Day (₹)</Label>
                            <Input
                              id="lateFeePerDay"
                              type="number"
                              placeholder="0"
                              value={formData.lateFeePerDay}
                              onChange={(e) => setFormData({ ...formData, lateFeePerDay: parseAmountInput(e.target.value) })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="extraCharges">Extra Charges (₹)</Label>
                            <Input
                              id="extraCharges"
                              type="number"
                              placeholder="0"
                              value={formData.extraCharges}
                              onChange={(e) => setFormData({ ...formData, extraCharges: parseAmountInput(e.target.value) })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="totalAmount">Total Amount (₹)</Label>
                            <div className="relative">
                              <Input id="totalAmount" type="number" value={computedTotal} readOnly className="font-semibold" />
                              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                                Auto
                              </span>
                            </div>
                          </div>
                        </div>
                      </section>

                      <section className="rounded-xl border bg-card p-4 sm:p-5">
                        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
                          <NotebookText className="h-4 w-4" />
                          Optional Notes
                        </div>
                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Input
                            id="description"
                            placeholder="Bill notes"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          />
                        </div>
                      </section>
                    </div>
                  </div>

                  <div className="sticky bottom-0 z-10 border-t bg-background px-4 py-4 sm:px-6">
                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                      <Button variant="outline" onClick={() => setIsFormOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                        {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingId ? "Update Bill" : "Add Bill"}
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Billed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalBilled}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Collected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">₹{totalPaid}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">₹{pendingAmount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0}%</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Maintenance Records</CardTitle>
            <CardDescription>All bills for your properties</CardDescription>
          </CardHeader>
          <CardContent>
            {maintenance.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No records</p>
            ) : (
              <div className="space-y-2">
                {maintenance.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                    <div className="flex-1">
                      <div className="font-medium">₹{m.totalAmount}</div>
                      <div className="text-sm text-muted-foreground">{getHouseName(m.houseId)} • {m.fromMonth} to {m.toMonth}</div>
                    </div>
                    <Badge
                      variant={
                        String(m.status || "").toLowerCase() === "paid"
                          ? "default"
                          : String(m.status || "").toLowerCase() === "pending"
                          ? "secondary"
                          : "destructive"
                      }
                      className="mr-4"
                    >
                      {m.displayStatus || String(m.status || "").charAt(0).toUpperCase() + String(m.status || "").slice(1)}
                    </Badge>
                    <div className="flex gap-2">
                      <button onClick={() => handleEditClick(m)} aria-label={`Edit maintenance record ${m.id}`} className="p-2 hover:bg-muted rounded-lg">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteId(m.id)}
                        aria-label={`Delete maintenance record ${m.id}`}
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
      title="Delete Maintenance Record"
      message="This action cannot be undone. The record will be removed from active records."
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
