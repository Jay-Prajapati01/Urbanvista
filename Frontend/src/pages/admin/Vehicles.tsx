import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Vehicle, House } from "@/lib/data";
import { vehiclesApi, housesApi } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Label } from "@/components/ui/label";
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
  Car,
  Bike,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Vehicles() {
  const { isDemo, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Form state
  const [newVehicle, setNewVehicle] = useState({ vehicleNumber: "", type: "Four Wheeler" as Vehicle["type"], color: "", houseId: "" });

  // Fetch from API
  const { data: vehiclesList = [], isLoading } = useQuery<Vehicle[]>({
    queryKey: ["vehicles"],
    queryFn: vehiclesApi.getAll,
    enabled: isAuthenticated && !isDemo,
  });

  const { data: houses = [] } = useQuery<House[]>({
    queryKey: ["houses"],
    queryFn: housesApi.getAll,
    enabled: isAuthenticated && !isDemo,
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Vehicle>) => vehiclesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      toast.success("Vehicle added successfully");
      setIsAddDialogOpen(false);
      setNewVehicle({ vehicleNumber: "", type: "Four Wheeler", color: "", houseId: "" });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => vehiclesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      toast.success("Vehicle deleted successfully");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Filter vehicles
  const filteredVehicles = vehiclesList.filter((vehicle) => {
    const matchesSearch =
      vehicle.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.houseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.color.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || vehicle.type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Group by house
  const groupedVehicles = filteredVehicles.reduce((acc, vehicle) => {
    if (!acc[vehicle.houseNumber]) acc[vehicle.houseNumber] = [];
    acc[vehicle.houseNumber].push(vehicle);
    return acc;
  }, {} as Record<string, Vehicle[]>);

  const handleAction = (action: string, vehicle: Vehicle) => {
    if (isDemo) {
      toast.info("Demo mode – changes are disabled");
      return;
    }
    if (action === "Delete") {
      deleteMutation.mutate(vehicle.id);
    } else {
      toast.success(`${action} ${vehicle.vehicleNumber}`);
    }
  };

  // Calculate stats
  const stats = {
    total: vehiclesList.length,
    twoWheelers: vehiclesList.filter((v) => v.type === "Two Wheeler").length,
    fourWheelers: vehiclesList.filter((v) => v.type === "Four Wheeler").length,
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
            <h1 className="text-2xl font-bold text-foreground">Vehicles</h1>
            <p className="text-muted-foreground">Manage society vehicle records</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="hero" disabled={isDemo}>
                <Plus className="w-4 h-4 mr-2" />
                Add Vehicle
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Vehicle</DialogTitle>
                <DialogDescription>Enter the vehicle details.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Vehicle Number</Label>
                  <Input placeholder="MH 12 AB 1234" value={newVehicle.vehicleNumber} onChange={(e) => setNewVehicle({ ...newVehicle, vehicleNumber: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={newVehicle.type} onValueChange={(v) => setNewVehicle({ ...newVehicle, type: v as Vehicle["type"] })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Two Wheeler">Two Wheeler</SelectItem>
                        <SelectItem value="Four Wheeler">Four Wheeler</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Color</Label>
                    <Input placeholder="White" value={newVehicle.color} onChange={(e) => setNewVehicle({ ...newVehicle, color: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>House</Label>
                  <Select value={newVehicle.houseId} onValueChange={(v) => setNewVehicle({ ...newVehicle, houseId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select house" />
                    </SelectTrigger>
                    <SelectContent>
                      {houses.map((house) => (
                        <SelectItem key={house.id} value={house.id}>
                          {house.houseNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    const selectedHouse = houses.find((h) => h.id === newVehicle.houseId);
                    createMutation.mutate({
                      vehicleNumber: newVehicle.vehicleNumber,
                      type: newVehicle.type,
                      color: newVehicle.color,
                      houseId: newVehicle.houseId,
                      houseNumber: selectedHouse?.houseNumber || "",
                    });
                  }}
                >
                  {createMutation.isPending ? "Adding..." : "Add Vehicle"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 animate-fade-up delay-100">
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Vehicles</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </div>
              <Car className="w-5 h-5 text-steel-blue" />
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Two Wheelers</p>
                <p className="text-2xl font-bold text-foreground">{stats.twoWheelers}</p>
              </div>
              <Bike className="w-5 h-5 text-steel-blue" />
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Four Wheelers</p>
                <p className="text-2xl font-bold text-foreground">{stats.fourWheelers}</p>
              </div>
              <Car className="w-5 h-5 text-steel-blue" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 animate-fade-up delay-200">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search vehicles..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Two Wheeler">Two Wheeler</SelectItem>
              <SelectItem value="Four Wheeler">Four Wheeler</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Vehicles grouped by house */}
        {Object.entries(groupedVehicles)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([houseNumber, houseVehicles]) => (
            <div key={houseNumber} className="glass-card overflow-hidden animate-fade-up delay-300">
              <div className="px-6 py-4 border-b border-border bg-secondary/30">
                <h3 className="font-semibold text-foreground">{houseNumber}</h3>
                <p className="text-sm text-muted-foreground">{houseVehicles.length} vehicles</p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle Number</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {houseVehicles.map((vehicle) => (
                    <TableRow key={vehicle.id} className="table-row-hover">
                      <TableCell className="font-medium text-foreground font-mono">
                        {vehicle.vehicleNumber}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {vehicle.type === "Two Wheeler" ? (
                            <Bike className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <Car className="w-4 h-4 text-muted-foreground" />
                          )}
                          {vehicle.type}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full border border-border"
                            style={{
                              backgroundColor:
                                vehicle.color.toLowerCase() === "white"
                                  ? "#f8f8f8"
                                  : vehicle.color.toLowerCase() === "black"
                                  ? "#1a1a1a"
                                  : vehicle.color.toLowerCase() === "silver"
                                  ? "#c0c0c0"
                                  : vehicle.color.toLowerCase() === "blue"
                                  ? "#3b82f6"
                                  : vehicle.color.toLowerCase() === "red"
                                  ? "#ef4444"
                                  : vehicle.color.toLowerCase() === "gray"
                                  ? "#6b7280"
                                  : "#9ca3af",
                            }}
                          />
                          {vehicle.color}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{vehicle.ownerName}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleAction("Edit", vehicle)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleAction("Delete", vehicle)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}

        {filteredVehicles.length === 0 && (
          <div className="glass-card p-12 text-center">
            <Car className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground">No vehicles found</h3>
            <p className="text-muted-foreground mt-1">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
