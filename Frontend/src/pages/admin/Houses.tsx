import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { House } from "@/lib/data";
import { housesApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Building2,
  Users,
  Car,
  MoreHorizontal,
  Pencil,
  Trash2,
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

export default function Houses() {
  const { isDemo, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [blockFilter, setBlockFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [openBlocks, setOpenBlocks] = useState<Record<string, boolean>>({});

  // Form state for Add House
  const [newHouse, setNewHouse] = useState({
    block: "", houseNumber: "", floor: 1, status: "vacant" as House["status"], notes: "",
  });

  // Fetch houses from API
  const { data: housesList = [], isLoading } = useQuery<House[]>({
    queryKey: ["houses"],
    queryFn: housesApi.getAll,
    enabled: isAuthenticated && !isDemo,
  });

  // Create house mutation
  const createMutation = useMutation({
    mutationFn: (data: Partial<House>) => housesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["houses"] });
      toast.success("House added successfully");
      setIsAddDialogOpen(false);
      setNewHouse({ block: "", houseNumber: "", floor: 1, status: "vacant", notes: "" });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Delete house mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => housesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["houses"] });
      toast.success("House deleted successfully");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Get unique blocks
  const blocks = [...new Set(housesList.map((h) => h.block))].sort();

  // Filter houses
  const filteredHouses = housesList.filter((house) => {
    const matchesSearch =
      house.houseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      house.block.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBlock = blockFilter === "all" || house.block === blockFilter;
    const matchesStatus = statusFilter === "all" || house.status === statusFilter;
    return matchesSearch && matchesBlock && matchesStatus;
  });

  // Group by block
  const groupedHouses = filteredHouses.reduce((acc, house) => {
    if (!acc[house.block]) acc[house.block] = [];
    acc[house.block].push(house);
    return acc;
  }, {} as Record<string, House[]>);

  const handleAction = (action: string, house: House) => {
    if (isDemo) {
      toast.info("Demo mode – changes are disabled");
      return;
    }
    if (action === "Delete") {
      deleteMutation.mutate(house.id);
    } else {
      toast.success(`${action} ${house.houseNumber}`);
    }
  };

  const getStatusBadge = (status: House["status"]) => {
    const styles = {
      occupied: "badge-occupied",
      vacant: "badge-vacant",
      maintenance: "badge-pending",
    };
    const labels = {
      occupied: "Occupied",
      vacant: "Vacant",
      maintenance: "Maintenance",
    };
    return <span className={`badge-status ${styles[status]}`}>{labels[status]}</span>;
  };

  const toggleBlock = (block: string) => {
    setOpenBlocks((prev) => ({ ...prev, [block]: !prev[block] }));
  };

  const toggleAllBlocks = (open: boolean) => {
    const newState: Record<string, boolean> = {};
    Object.keys(groupedHouses).forEach((block) => {
      newState[block] = open;
    });
    setOpenBlocks(newState);
  };

  // Calculate stats
  const stats = {
    total: housesList.length,
    occupied: housesList.filter((h) => h.status === "occupied").length,
    vacant: housesList.filter((h) => h.status === "vacant").length,
    maintenance: housesList.filter((h) => h.status === "maintenance").length,
  };

  return (
    <AdminLayout>
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-steel-blue" />
          <span className="ml-3 text-muted-foreground">Loading houses...</span>
        </div>
      ) : (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-up">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Houses</h1>
            <p className="text-muted-foreground">Manage all properties in your society</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="hero" disabled={isDemo}>
                <Plus className="w-4 h-4 mr-2" />
                Add House
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New House</DialogTitle>
                <DialogDescription>
                  Enter the details for the new house.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Block</Label>
                    <Input placeholder="A" value={newHouse.block} onChange={(e) => setNewHouse({ ...newHouse, block: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>House Number</Label>
                    <Input placeholder="A-101" value={newHouse.houseNumber} onChange={(e) => setNewHouse({ ...newHouse, houseNumber: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Floor</Label>
                    <Input type="number" placeholder="1" value={newHouse.floor} onChange={(e) => setNewHouse({ ...newHouse, floor: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={newHouse.status} onValueChange={(v) => setNewHouse({ ...newHouse, status: v as House["status"] })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="occupied">Occupied</SelectItem>
                        <SelectItem value="vacant">Vacant</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes (Optional)</Label>
                  <Input placeholder="Any additional notes..." value={newHouse.notes} onChange={(e) => setNewHouse({ ...newHouse, notes: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  disabled={createMutation.isPending}
                  onClick={() => {
                    if (isDemo) {
                      toast.info("Demo mode – changes are disabled");
                      setIsAddDialogOpen(false);
                      return;
                    }
                    createMutation.mutate({
                      block: newHouse.block,
                      houseNumber: newHouse.houseNumber,
                      floor: newHouse.floor,
                      status: newHouse.status,
                      notes: newHouse.notes || undefined,
                      membersCount: 0,
                      vehiclesCount: 0,
                    });
                  }}
                >
                  {createMutation.isPending ? "Adding..." : "Add House"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-up delay-100">
          {[
            { label: "Total Houses", value: stats.total, icon: Building2 },
            { label: "Occupied", value: stats.occupied, icon: Users },
            { label: "Vacant", value: stats.vacant, icon: Building2 },
            { label: "Under Maintenance", value: stats.maintenance, icon: Car },
          ].map((stat) => (
            <div key={stat.label} className="stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
                <stat.icon className="w-5 h-5 text-steel-blue" />
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 animate-fade-up delay-200">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search houses..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={blockFilter} onValueChange={setBlockFilter}>
            <SelectTrigger className="w-[140px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Block" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Blocks</SelectItem>
              {blocks.map((block) => (
                <SelectItem key={block} value={block}>
                  Block {block}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="occupied">Occupied</SelectItem>
              <SelectItem value="vacant">Vacant</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Expand/Collapse All */}
        <div className="flex items-center gap-2 animate-fade-up delay-200">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleAllBlocks(true)}
          >
            Expand All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleAllBlocks(false)}
          >
            Collapse All
          </Button>
        </div>

        {/* Houses grouped by block — Collapsible */}
        {Object.entries(groupedHouses)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([block, blockHouses]) => {
            const blockOccupied = blockHouses.filter((h) => h.status === "occupied").length;
            const blockVacant = blockHouses.filter((h) => h.status === "vacant").length;
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
                        <p className="text-sm text-muted-foreground">{blockHouses.length} houses</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="badge-status badge-occupied">{blockOccupied} Occupied</span>
                      <span className="badge-status badge-vacant">{blockVacant} Vacant</span>
                    </div>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>House No.</TableHead>
                        <TableHead>Floor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Members</TableHead>
                        <TableHead>Vehicles</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {blockHouses.map((house) => (
                        <TableRow key={house.id} className="table-row-hover">
                          <TableCell className="font-medium text-foreground">
                            {house.houseNumber}
                          </TableCell>
                          <TableCell>{house.floor}</TableCell>
                          <TableCell>{getStatusBadge(house.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-muted-foreground" />
                              {house.membersCount}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Car className="w-4 h-4 text-muted-foreground" />
                              {house.vehiclesCount}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground max-w-[200px] truncate">
                            {house.notes || "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleAction("Edit", house)}>
                                  <Pencil className="w-4 h-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleAction("Delete", house)}
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
                </CollapsibleContent>
              </Collapsible>
            );
          })}

        {filteredHouses.length === 0 && (
          <div className="glass-card p-12 text-center">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground">No houses found</h3>
            <p className="text-muted-foreground mt-1">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
      )}
    </AdminLayout>
  );
}
