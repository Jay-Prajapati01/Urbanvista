import { useState } from "react";
import SecretaryLayout from "@/components/secretary/SecretaryLayout";
import { useAuth } from "@/lib/auth";
import type { House } from "@/lib/data";
import {
  useSecretaryHouses,
  useSecretaryScope,
  useCreateSecretaryHouse,
  useUpdateSecretaryHouse,
  useDeleteSecretaryHouse,
} from "@/hooks/useSecretaryQueries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  Building2,
  Home,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  CheckCircle,
  AlertCircle,
  Search,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface HouseFormData {
  block: string;
  houseNumber: string;
  floor: string;
  status: "occupied" | "vacant" | "maintenance";
}

export default function SecretaryHouses() {
  const { isAuthenticated, isDemo, user } = useAuth();
  const hasToken = isAuthenticated && !isDemo && user?.role === "secretary";

  // Queries with proper typing
  const { data: houses = [], isLoading: housesLoading } = useSecretaryHouses(undefined, hasToken);
  const { data: scope } = useSecretaryScope(hasToken);

  // Mutations with cascade invalidation
  const createMutation = useCreateSecretaryHouse();
  const updateMutation = useUpdateSecretaryHouse();
  const deleteMutation = useDeleteSecretaryHouse();

  // Local state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [blockFilter, setBlockFilter] = useState<string>("all");
  const [formData, setFormData] = useState<HouseFormData>({
    block: "",
    houseNumber: "",
    floor: "0",
    status: "vacant",
  });

  // Filter and search houses
  const filteredHouses = houses.filter((h) => {
    const matchesSearch =
      h.houseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.block.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || h.status === statusFilter;
    const matchesBlock = blockFilter === "all" || h.block === blockFilter;
    return matchesSearch && matchesStatus && matchesBlock;
  });

  // Get unique blocks for filter
  const uniqueBlocks = [...new Set(houses.map((h) => h.block))].sort();

  // Computed stats
  const totalHouses = houses.length;
  const occupiedCount = houses.filter((h) => h.status === "occupied").length;
  const vacantCount = houses.filter((h) => h.status === "vacant").length;
  const maintenanceCount = houses.filter((h) => h.status === "maintenance").length;

  const handleAddClick = () => {
    setEditingId(null);
    setFormData({
      block: scope?.blocks?.[0] || "",
      houseNumber: "",
      floor: "0",
      status: "vacant",
    });
    setIsFormOpen(true);
  };

  const handleEditClick = (house: House) => {
    setEditingId(house.id);
    setFormData({
      block: house.block,
      houseNumber: house.houseNumber,
      floor: String(Number.isFinite(house.floor) ? house.floor : 0),
      status: house.status as "occupied" | "vacant" | "maintenance",
    });
    setIsFormOpen(true);
  };

  const handleSubmit = () => {
    const normalizedBlock = formData.block.trim().toUpperCase();
    const normalizedHouseNumber = formData.houseNumber.trim();
    const parsedFloor = Number.parseInt(formData.floor, 10);
    const safeFloor = Number.isFinite(parsedFloor) ? parsedFloor : 0;

    if (!normalizedBlock || !normalizedHouseNumber) {
      toast.error("Block and house number are required");
      return;
    }

    const allowedBlocks = scope?.blocks || [];
    if (!editingId && allowedBlocks.length > 0 && !allowedBlocks.includes(normalizedBlock)) {
      toast.error(`You can only add houses in: ${allowedBlocks.join(", ")}`);
      return;
    }

    const payload: Partial<House> = {
      block: normalizedBlock,
      houseNumber: normalizedHouseNumber,
      floor: safeFloor,
      status: formData.status,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload }, {
        onSuccess: () => {
          toast.success("House updated successfully");
          setIsFormOpen(false);
          setFormData({ block: "", houseNumber: "", floor: "0", status: "vacant" });
        },
        onError: (error) => {
          toast.error(error.message || "Failed to update house");
        },
      });
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success("House added successfully");
          setIsFormOpen(false);
          setFormData({ block: "", houseNumber: "", floor: "0", status: "vacant" });
        },
        onError: (error) => {
          toast.error(error.message || "Failed to add house");
        },
      });
    }
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast.success("House deleted successfully");
        setDeleteId(null);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete house");
      },
    });
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const isDeleting = deleteMutation.isPending;

  if (housesLoading) {
    return (
      <SecretaryLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-steel-blue" />
          <span className="ml-3 text-muted-foreground">Loading houses...</span>
        </div>
      </SecretaryLayout>
    );
  }

  return (
    <SecretaryLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">House Management</h1>
            <p className="text-muted-foreground mt-1">Manage flats and property information</p>
          </div>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <Button onClick={handleAddClick} className="gap-2">
              <Plus className="w-4 h-4" />
              Add House
            </Button>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Houses</CardTitle>
              <Building2 className="h-4 w-4 text-steel-blue" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalHouses}</div>
              <p className="text-xs text-muted-foreground">{uniqueBlocks.length} blocks</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Occupied</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{occupiedCount}</div>
              <p className="text-xs text-muted-foreground">
                {totalHouses > 0 ? Math.round((occupiedCount / totalHouses) * 100) : 0}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vacant</CardTitle>
              <AlertCircle className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{vacantCount}</div>
              <p className="text-xs text-muted-foreground">Ready for occupancy</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{maintenanceCount}</div>
              <p className="text-xs text-muted-foreground">Under maintenance</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filter & Search</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="search">Search House</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by number or block..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="block-filter">Block</Label>
                <Select value={blockFilter} onValueChange={setBlockFilter}>
                  <SelectTrigger id="block-filter" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Blocks</SelectItem>
                    {uniqueBlocks.map((block) => (
                      <SelectItem key={block} value={block}>
                        Block {block}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status-filter">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="status-filter" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="occupied">Occupied</SelectItem>
                    <SelectItem value="vacant">Vacant</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Houses List */}
        <Card>
          <CardHeader>
            <CardTitle>Houses</CardTitle>
            <CardDescription>
              Showing {filteredHouses.length} of {totalHouses} houses
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredHouses.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {totalHouses === 0 ? "No houses yet. Add your first house." : "No houses match your filters."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-sm text-muted-foreground">
                      <th className="text-left py-3 px-2">House</th>
                      <th className="text-left py-3 px-2">Block</th>
                      <th className="text-left py-3 px-2">Floor</th>
                      <th className="text-left py-3 px-2">Status</th>
                      <th className="text-right py-3 px-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHouses.map((house) => (
                      <tr key={house.id} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-2 font-medium">{house.houseNumber}</td>
                        <td className="py-3 px-2">{house.block}</td>
                        <td className="py-3 px-2 text-muted-foreground">{house.floor}</td>
                        <td className="py-3 px-2">
                          <Badge
                            variant={
                              house.status === "occupied"
                                ? "default"
                                : house.status === "vacant"
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {house.status.charAt(0).toUpperCase() + house.status.slice(1)}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditClick(house)}
                              disabled={isSubmitting || isDeleting}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteId(house.id)}
                              disabled={isDeleting}
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit House" : "Add New House"}</DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update the house details"
                : "Add a new house to your assigned block"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="block">Block</Label>
              {scope?.blocks && scope.blocks.length > 0 && !editingId ? (
                <Select
                  value={formData.block}
                  onValueChange={(val) => setFormData({ ...formData, block: val })}
                >
                  <SelectTrigger id="block" className="mt-1">
                    <SelectValue placeholder="Select block" />
                  </SelectTrigger>
                  <SelectContent>
                    {scope.blocks.map((block) => (
                      <SelectItem key={block} value={block}>
                        Block {block}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="block"
                  placeholder="e.g., A, B, C"
                  value={formData.block}
                  onChange={(e) => setFormData({ ...formData, block: e.target.value })}
                  className="mt-1"
                  disabled={editingId ? true : false}
                />
              )}
            </div>

            <div>
              <Label htmlFor="houseNumber">House Number</Label>
              <Input
                id="houseNumber"
                placeholder="e.g., 101, 102"
                value={formData.houseNumber}
                onChange={(e) => setFormData({ ...formData, houseNumber: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="floor">Floor</Label>
              <Input
                id="floor"
                type="number"
                value={formData.floor}
                onChange={(e) => {
                  const value = e.target.value;
                  const parsed = value ? Number.parseInt(value, 10) : 0;
                  setFormData({ ...formData, floor: String(Number.isFinite(parsed) ? parsed : 0) });
                }}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(val) =>
                  setFormData({ ...formData, status: val as HouseFormData["status"] })
                }
              >
                <SelectTrigger id="status" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="occupied">Occupied</SelectItem>
                  <SelectItem value="vacant">Vacant</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : editingId ? (
                "Update House"
              ) : (
                "Add House"
              )}
            </Button>

            {scope?.blocks && scope.blocks.length > 0 && !editingId && (
              <p className="text-xs text-muted-foreground">
                You can add houses only in: {scope.blocks.join(", ")}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        title="Delete House"
        message="This action cannot be undone. The house will be removed from active records."
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) {
            handleDelete(deleteId);
          }
        }}
      />
    </SecretaryLayout>
  );
}
