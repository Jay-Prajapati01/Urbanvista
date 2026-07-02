import { useState } from "react";
import SecretaryLayout from "@/components/secretary/SecretaryLayout";
import { useAuth } from "@/lib/auth";
import { vehiclesApi, housesApi } from "@/lib/api";
import type { Vehicle, House } from "@/lib/data";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Car, Loader2, RefreshCw, Plus, Edit2, Trash2 } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface VehicleFormData {
  vehicleNumber: string;
  type: "Two Wheeler" | "Four Wheeler";
  color: string;
  houseId: string;
}

export default function SecretaryVehicles() {
  const { isAuthenticated, isDemo, user } = useAuth();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState<VehicleFormData>({
    vehicleNumber: "",
    type: "Four Wheeler",
    color: "",
    houseId: "",
  });

  const hasToken = isAuthenticated && !isDemo && user?.role === "secretary";

  const { data: vehicles = [], isLoading, refetch } = useQuery({
    queryKey: ["secretary-vehicles"],
    queryFn: vehiclesApi.getAll,
    enabled: hasToken,
  });

  const { data: houses = [] } = useQuery({
    queryKey: ["secretary-houses"],
    queryFn: housesApi.getAll,
    enabled: hasToken,
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Vehicle>) => vehiclesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["secretary-vehicles"] });
      setIsFormOpen(false);
      setFormData({ vehicleNumber: "", type: "Four Wheeler", color: "", houseId: "" });
      toast.success("Vehicle added successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add vehicle");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Vehicle> }) => vehiclesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["secretary-vehicles"] });
      setIsFormOpen(false);
      setEditingId(null);
      setFormData({ vehicleNumber: "", type: "Four Wheeler", color: "", houseId: "" });
      toast.success("Vehicle updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update vehicle");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => vehiclesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["secretary-vehicles"] });
      toast.success("Vehicle deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete vehicle");
    },
  });

  const handleAddClick = () => {
    setEditingId(null);
    setFormData({ vehicleNumber: "", type: "Four Wheeler", color: "", houseId: "" });
    setIsFormOpen(true);
  };

  const handleEditClick = (vehicle: Vehicle) => {
    setEditingId(vehicle.id);
    setFormData({
      vehicleNumber: vehicle.vehicleNumber,
      type: vehicle.type as "Two Wheeler" | "Four Wheeler",
      color: vehicle.color,
      houseId: vehicle.houseId,
    });
    setIsFormOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.vehicleNumber || !formData.houseId) {
      toast.error("Vehicle number and house are required");
      return;
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
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
          <span className="ml-3 text-muted-foreground">Loading vehicles...</span>
        </div>
      </SecretaryLayout>
    );
  }

  const twoWheelers = vehicles.filter((v) => v.type === "Two Wheeler").length;
  const fourWheelers = vehicles.filter((v) => v.type === "Four Wheeler").length;

  return (
    <>
    <SecretaryLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Vehicles Registry</h1>
            <p className="text-muted-foreground mt-1">
              Manage vehicles registered in your properties
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
                  Add Vehicle
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingId ? "Edit Vehicle" : "Register New Vehicle"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                    <Input
                      id="vehicleNumber"
                      placeholder="MH-01-AB-1234"
                      value={formData.vehicleNumber}
                      onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="type">Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(val) => setFormData({ ...formData, type: val as VehicleFormData["type"] })}
                    >
                      <SelectTrigger id="type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Two Wheeler">Two Wheeler</SelectItem>
                        <SelectItem value="Four Wheeler">Four Wheeler</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="color">Color</Label>
                    <Input
                      id="color"
                      placeholder="Black"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="houseId">Assigned to Property</Label>
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
                  <Button
                    onClick={handleSubmit}
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="w-full"
                  >
                    {createMutation.isPending || updateMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      editingId ? "Update Vehicle" : "Add Vehicle"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Vehicles</CardTitle>
              <Car className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{vehicles.length}</div>
              <p className="text-xs text-muted-foreground">Registered</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Four Wheelers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fourWheelers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Two Wheelers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{twoWheelers}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Vehicle Registry</CardTitle>
            <CardDescription>All registered vehicles</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {vehicles.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No vehicles registered</p>
              ) : (
                vehicles.map((vehicle) => (
                  <div key={vehicle.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                    <div className="flex-1">
                      <div className="font-medium">{vehicle.vehicleNumber}</div>
                      <div className="text-sm text-muted-foreground">{vehicle.color} • {getHouseName(vehicle.houseId)}</div>
                    </div>
                    <Badge variant="outline" className="mr-4">{vehicle.type}</Badge>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditClick(vehicle)}
                        aria-label={`Edit vehicle ${vehicle.vehicleNumber}`}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteId(vehicle.id)}
                        aria-label={`Delete vehicle ${vehicle.vehicleNumber}`}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </SecretaryLayout>
    <ConfirmDialog
      open={!!deleteId}
      title="Delete Vehicle"
      message="This action cannot be undone. The vehicle will be removed from active records."
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
