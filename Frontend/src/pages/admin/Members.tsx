import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Member, House } from "@/lib/data";
import { membersApi, housesApi } from "@/lib/api";
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
  Users,
  Phone,
  Mail,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserCheck,
  UserX,
  ChevronDown,
  ChevronRight,
  Building2,
  Home,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Members() {
  const { isDemo, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [openBlocks, setOpenBlocks] = useState<Record<string, boolean>>({});
  const [openHouses, setOpenHouses] = useState<Record<string, boolean>>({});

  // Form state
  const [newMember, setNewMember] = useState({ name: "", houseId: "", role: "Family" as Member["role"], phone: "", email: "" });

  // Fetch from API
  const { data: membersList = [], isLoading } = useQuery<Member[]>({
    queryKey: ["members"],
    queryFn: membersApi.getAll,
    enabled: isAuthenticated && !isDemo,
  });

  const { data: houses = [] } = useQuery<House[]>({
    queryKey: ["houses"],
    queryFn: housesApi.getAll,
    enabled: isAuthenticated && !isDemo,
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Member>) => membersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      toast.success("Member added successfully");
      setIsAddDialogOpen(false);
      setNewMember({ name: "", houseId: "", role: "Family", phone: "", email: "" });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => membersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      toast.success("Member deleted successfully");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Filter members
  const filteredMembers = membersList.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.phone.includes(searchQuery) ||
      member.houseNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || member.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Get block from houseNumber (e.g. "A-101" → "A")
  const getBlock = (houseNumber: string) => houseNumber.split("-")[0];

  // Group by block → then by houseNumber
  const groupedByBlock = filteredMembers.reduce((acc, member) => {
    const block = getBlock(member.houseNumber);
    if (!acc[block]) acc[block] = {};
    if (!acc[block][member.houseNumber]) acc[block][member.houseNumber] = [];
    acc[block][member.houseNumber].push(member);
    return acc;
  }, {} as Record<string, Record<string, Member[]>>);

  // Sort members within each house group (Owner first)
  Object.values(groupedByBlock).forEach((houseGroups) => {
    Object.values(houseGroups).forEach((group) => {
      group.sort((a, b) => {
        if (a.role === "Owner") return -1;
        if (b.role === "Owner") return 1;
        return a.name.localeCompare(b.name);
      });
    });
  });

  const toggleBlock = (block: string) => {
    setOpenBlocks((prev) => ({ ...prev, [block]: !prev[block] }));
  };

  const toggleHouse = (houseKey: string) => {
    setOpenHouses((prev) => ({ ...prev, [houseKey]: !prev[houseKey] }));
  };

  const toggleAllBlocks = (open: boolean) => {
    const newBlocks: Record<string, boolean> = {};
    const newHouses: Record<string, boolean> = {};
    Object.keys(groupedByBlock).forEach((block) => {
      newBlocks[block] = open;
      Object.keys(groupedByBlock[block]).forEach((house) => {
        newHouses[`${block}-${house}`] = open;
      });
    });
    setOpenBlocks(newBlocks);
    setOpenHouses(newHouses);
  };

  const handleAction = (action: string, member: Member) => {
    if (isDemo) {
      toast.info("Demo mode – changes are disabled");
      return;
    }
    if (action === "Delete") {
      deleteMutation.mutate(member.id);
    } else {
      toast.success(`${action} ${member.name}`);
    }
  };

  const getRoleBadge = (role: Member["role"]) => {
    const styles = {
      Owner: "badge-occupied",
      Tenant: "badge-pending",
      Family: "badge-vacant",
    };
    return <span className={`badge-status ${styles[role]}`}>{role}</span>;
  };

  // Calculate stats
  const stats = {
    total: membersList.length,
    active: membersList.filter((m) => m.isActive).length,
    owners: membersList.filter((m) => m.role === "Owner").length,
    tenants: membersList.filter((m) => m.role === "Tenant").length,
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
            <h1 className="text-2xl font-bold text-foreground">Members</h1>
            <p className="text-muted-foreground">Manage residents and family members</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="hero" disabled={isDemo}>
                <Plus className="w-4 h-4 mr-2" />
                Add Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Member</DialogTitle>
                <DialogDescription>Enter the member details.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input placeholder="John Doe" value={newMember.name} onChange={(e) => setNewMember({ ...newMember, name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>House</Label>
                    <Select value={newMember.houseId} onValueChange={(v) => setNewMember({ ...newMember, houseId: v })}>
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
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={newMember.role} onValueChange={(v) => setNewMember({ ...newMember, role: v as Member["role"] })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Owner">Owner</SelectItem>
                        <SelectItem value="Tenant">Tenant</SelectItem>
                        <SelectItem value="Family">Family</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input placeholder="+91 98765 43210" value={newMember.phone} onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" placeholder="john@email.com" value={newMember.email} onChange={(e) => setNewMember({ ...newMember, email: e.target.value })} />
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
                    const selectedHouse = houses.find((h) => h.id === newMember.houseId);
                    createMutation.mutate({
                      name: newMember.name,
                      houseId: newMember.houseId,
                      houseNumber: selectedHouse?.houseNumber || "",
                      role: newMember.role,
                      phone: newMember.phone,
                      email: newMember.email,
                      isActive: true,
                    });
                  }}
                >
                  {createMutation.isPending ? "Adding..." : "Add Member"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-up delay-100">
          {[
            { label: "Total Members", value: stats.total, icon: Users },
            { label: "Active", value: stats.active, icon: UserCheck },
            { label: "Owners", value: stats.owners, icon: Users },
            { label: "Tenants", value: stats.tenants, icon: Users },
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
              placeholder="Search members..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[140px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="Owner">Owner</SelectItem>
              <SelectItem value="Tenant">Tenant</SelectItem>
              <SelectItem value="Family">Family</SelectItem>
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

        {/* Members grouped by Block → House Number (two-level collapsible) */}
        {Object.entries(groupedByBlock)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([block, houseGroups]) => {
            const blockMemberCount = Object.values(houseGroups).reduce(
              (sum, m) => sum + m.length,
              0
            );
            const houseCount = Object.keys(houseGroups).length;
            const isBlockOpen = openBlocks[block] ?? false;

            return (
              <Collapsible
                key={block}
                open={isBlockOpen}
                onOpenChange={() => toggleBlock(block)}
                className="glass-card overflow-hidden animate-fade-up delay-300"
              >
                {/* Block-level header */}
                <CollapsibleTrigger asChild>
                  <button className="w-full px-6 py-4 bg-secondary/30 flex items-center justify-between hover:bg-secondary/50 transition-colors duration-200 cursor-pointer">
                    <div className="flex items-center gap-3">
                      {isBlockOpen ? (
                        <ChevronDown className="w-5 h-5 text-steel-blue transition-transform duration-200" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-steel-blue transition-transform duration-200" />
                      )}
                      <Building2 className="w-5 h-5 text-steel-blue" />
                      <div className="text-left">
                        <h3 className="font-semibold text-foreground">Block {block}</h3>
                        <p className="text-sm text-muted-foreground">
                          {houseCount} houses • {blockMemberCount} members
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="badge-status badge-occupied">
                        {blockMemberCount} Members
                      </span>
                    </div>
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  {/* House-level collapsibles inside the block */}
                  {Object.entries(houseGroups)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([houseNumber, houseMembers]) => {
                      const houseKey = `${block}-${houseNumber}`;
                      const isHouseOpen = openHouses[houseKey] ?? false;
                      const ownerName = houseMembers.find((m) => m.role === "Owner")?.name;

                      return (
                        <Collapsible
                          key={houseKey}
                          open={isHouseOpen}
                          onOpenChange={() => toggleHouse(houseKey)}
                        >
                          {/* House-level header */}
                          <CollapsibleTrigger asChild>
                            <button className="w-full px-6 py-3 border-t border-border flex items-center justify-between hover:bg-secondary/30 transition-colors duration-200 cursor-pointer">
                              <div className="flex items-center gap-3 pl-6">
                                {isHouseOpen ? (
                                  <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform duration-200" />
                                )}
                                <Home className="w-4 h-4 text-steel-blue" />
                                <div className="text-left">
                                  <span className="font-medium text-foreground">{houseNumber}</span>
                                  {ownerName && (
                                    <span className="text-sm text-muted-foreground ml-2">
                                      — {ownerName}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {houseMembers.length} member{houseMembers.length !== 1 ? "s" : ""}
                              </span>
                            </button>
                          </CollapsibleTrigger>

                          <CollapsibleContent>
                            <div className="pl-6">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Phone</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {houseMembers.map((member) => (
                                    <TableRow key={member.id} className="table-row-hover">
                                      <TableCell className="font-medium text-foreground">
                                        {member.name}
                                      </TableCell>
                                      <TableCell>{getRoleBadge(member.role)}</TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                          <Phone className="w-4 h-4" />
                                          {member.phone}
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                          <Mail className="w-4 h-4" />
                                          {member.email}
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        {member.isActive ? (
                                          <div className="flex items-center gap-2 text-steel-blue">
                                            <UserCheck className="w-4 h-4" />
                                            Active
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-2 text-muted-foreground">
                                            <UserX className="w-4 h-4" />
                                            Inactive
                                          </div>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                              <MoreHorizontal className="w-4 h-4" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleAction("Edit", member)}>
                                              <Pencil className="w-4 h-4 mr-2" />
                                              Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                              onClick={() => handleAction("Delete", member)}
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
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    })}
                </CollapsibleContent>
              </Collapsible>
            );
          })}

        {filteredMembers.length === 0 && (
          <div className="glass-card p-12 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground">No members found</h3>
            <p className="text-muted-foreground mt-1">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
