import { useState } from "react";
import SecretaryLayout from "@/components/secretary/SecretaryLayout";
import { useAuth } from "@/lib/auth";
import { membersApi, housesApi } from "@/lib/api";
import type { Member, House } from "@/lib/data";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  Users,
  Loader2,
  RefreshCw,
  Plus,
  Edit2,
  Trash2,
  Phone,
  Mail,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface MemberFormData {
  name: string;
  role: "Owner" | "Tenant" | "Family";
  phone: string;
  email: string;
  isActive: boolean;
  houseId: string;
}

export default function SecretaryMembers() {
  const { isAuthenticated, isDemo, user } = useAuth();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState<MemberFormData>({
    name: "",
    role: "Owner",
    phone: "",
    email: "",
    isActive: true,
    houseId: "",
  });

  const hasToken = isAuthenticated && !isDemo && user?.role === "secretary";

  const { data: members = [], isLoading, refetch } = useQuery({
    queryKey: ["secretary-members"],
    queryFn: membersApi.getAll,
    enabled: hasToken,
  });

  const { data: houses = [] } = useQuery({
    queryKey: ["secretary-houses"],
    queryFn: housesApi.getAll,
    enabled: hasToken,
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Member>) => membersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["secretary-members"] });
      setIsFormOpen(false);
      setFormData({ name: "", role: "Owner", phone: "", email: "", isActive: true, houseId: "" });
      toast.success("Member added successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add member");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Member> }) => membersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["secretary-members"] });
      setIsFormOpen(false);
      setEditingId(null);
      setFormData({ name: "", role: "Owner", phone: "", email: "", isActive: true, houseId: "" });
      toast.success("Member updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update member");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => membersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["secretary-members"] });
      toast.success("Member deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete member");
    },
  });

  const handleAddClick = () => {
    setEditingId(null);
    setFormData({ name: "", role: "Owner", phone: "", email: "", isActive: true, houseId: "" });
    setIsFormOpen(true);
  };

  const handleEditClick = (member: Member) => {
    setEditingId(member.id);
    setFormData({
      name: member.name,
      role: member.role as "Owner" | "Tenant" | "Family",
      phone: member.phone,
      email: member.email,
      isActive: member.isActive,
      houseId: member.houseId,
    });
    setIsFormOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.houseId) {
      toast.error("Name and house are required");
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

  const roleStats = {
    Owner: members.filter((m) => m.role === "Owner").length,
    Tenant: members.filter((m) => m.role === "Tenant").length,
    Family: members.filter((m) => m.role === "Family").length,
  };

  if (isLoading) {
    return (
      <SecretaryLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-steel-blue" />
          <span className="ml-3 text-muted-foreground">Loading members...</span>
        </div>
      </SecretaryLayout>
    );
  }

  return (
    <>
    <SecretaryLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Members Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage residents and members of your assigned properties
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
                  Add Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingId ? "Edit Member" : "Add New Member"}</DialogTitle>
                  <DialogDescription>
                    Add a new member to your property
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(val) => setFormData({ ...formData, role: val as MemberFormData["role"] })}
                    >
                      <SelectTrigger id="role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Owner">Owner</SelectItem>
                        <SelectItem value="Tenant">Tenant</SelectItem>
                        <SelectItem value="Family">Family</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="houseId">Assign to House</Label>
                    <Select value={formData.houseId} onValueChange={(val) => setFormData({ ...formData, houseId: val })}>
                      <SelectTrigger id="houseId">
                        <SelectValue placeholder="Select a house" />
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
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      placeholder="9876543210"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({ ...formData, isActive: !!checked })}
                    />
                    <Label htmlFor="isActive" className="font-normal cursor-pointer">
                      Active
                    </Label>
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
                      editingId ? "Update Member" : "Add Member"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{members.length}</div>
              <p className="text-xs text-muted-foreground">All roles</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Owners</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{roleStats.Owner}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tenants</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{roleStats.Tenant}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Family</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{roleStats.Family}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Members</CardTitle>
            <CardDescription>Complete list of members in your properties</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {members.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No members found</p>
              ) : (
                members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                    <div className="flex-1">
                      <div className="font-medium">{member.name}</div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {member.phone || "N/A"}
                        </div>
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {member.email || "N/A"}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="mr-4">
                      {member.role}
                    </Badge>
                    <Badge variant={member.isActive ? "default" : "secondary"} className="mr-4">
                      {member.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <div className="text-sm text-muted-foreground mr-4">
                      {getHouseName(member.houseId)}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditClick(member)}
                        aria-label={`Edit member ${member.name}`}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteId(member.id)}
                        aria-label={`Delete member ${member.name}`}
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
      title="Delete Member"
      message="This action cannot be undone. The member will be removed from active records."
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
