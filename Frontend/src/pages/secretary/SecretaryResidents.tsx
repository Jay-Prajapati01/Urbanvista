import { useState } from "react";
import SecretaryLayout from "@/components/secretary/SecretaryLayout";
import { useAuth } from "@/lib/auth";
import type { Resident } from "@/lib/secretaryApi";
import type { House } from "@/lib/data";
import {
  useSecretaryResidents,
  useSecretaryHouses,
  useCreateSecretaryResident,
  useUpdateSecretaryResident,
  useDeleteSecretaryResident,
} from "@/hooks/useSecretaryQueries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  Loader2,
  Plus,
  Edit2,
  Trash2,
  Mail,
  Home,
  Search,
  Copy,
  CheckCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ConfirmDialog from "@/components/ConfirmDialog";
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

interface ResidentFormData {
  name: string;
  email: string;
  password: string;
  houseId: string;
}

export default function SecretaryResidents() {
  const { isAuthenticated, isDemo, user } = useAuth();
  const hasToken = isAuthenticated && !isDemo && user?.role === "secretary";

  // Queries with proper typing
  const { data: residents = [], isLoading: residentsLoading } = useSecretaryResidents(undefined, hasToken);
  const { data: houses = [] } = useSecretaryHouses(undefined, hasToken);

  // Mutations with cascade invalidation
  const createMutation = useCreateSecretaryResident();
  const updateMutation = useUpdateSecretaryResident();
  const deleteMutation = useDeleteSecretaryResident();

  // Local state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null);
  const [formData, setFormData] = useState<ResidentFormData>({
    name: "",
    email: "",
    password: "",
    houseId: "",
  });

  // Filter residents
  const filteredResidents = residents.filter(
    (r) =>
      r.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get house name by ID
  const getHouseName = (houseId: string | null): string => {
    if (!houseId) return "-";
    const house = houses.find((h) => h.id === houseId);
    return house ? `${house.block}-${house.houseNumber}` : "-";
  };

  const handleAddClick = () => {
    setEditingId(null);
    setFormData({ name: "", email: "", password: "", houseId: houses[0]?.id || "" });
    setIsFormOpen(true);
  };

  const handleEditClick = (resident: Resident) => {
    setEditingId(resident.id);
    setFormData({
      name: resident.name || "",
      email: resident.email || "",
      password: "", // Don't pre-fill password on edit
      houseId: resident.houseId || "",
    });
    setIsFormOpen(true);
  };

  const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, password });
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.email || !formData.houseId) {
      toast.error("Name, email, and house are required");
      return;
    }

    if (!editingId && !formData.password) {
      toast.error("Password is required for new residents");
      return;
    }

    if (!editingId) {
      // Create new resident
      createMutation.mutate(formData as ResidentFormData, {
        onSuccess: (response) => {
          // Store credentials if available
          if (response?.credentials) {
            setCreatedCredentials(response.credentials);
          }
          toast.success("Resident account created successfully");
          setIsFormOpen(false);
          setFormData({ name: "", email: "", password: "", houseId: "" });
        },
        onError: (error) => {
          toast.error(error.message || "Failed to create resident");
        },
      });
    } else {
      // Update resident
      updateMutation.mutate(
        {
          id: editingId,
          data: {
            name: formData.name,
            email: formData.email,
          },
        },
        {
          onSuccess: () => {
            toast.success("Resident updated successfully");
            setIsFormOpen(false);
            setFormData({ name: "", email: "", password: "", houseId: "" });
          },
          onError: (error) => {
            toast.error(error.message || "Failed to update resident");
          },
        }
      );
    }
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast.success("Resident deleted successfully");
        setDeleteId(null);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete resident");
      },
    });
  };

  const copyCredentials = () => {
    if (createdCredentials) {
      const text = `Email: ${createdCredentials.email}\nPassword: ${createdCredentials.password}`;
      navigator.clipboard.writeText(text);
      toast.success("Credentials copied to clipboard");
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const isDeleting = deleteMutation.isPending;

  if (residentsLoading) {
    return (
      <SecretaryLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-steel-blue" />
          <span className="ml-3 text-muted-foreground">Loading residents...</span>
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
            <h1 className="text-3xl font-bold text-foreground">Resident Management</h1>
            <p className="text-muted-foreground mt-1">Add residents and manage their credentials</p>
          </div>
          <Button onClick={handleAddClick} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Resident
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Residents</CardTitle>
              <Users className="h-4 w-4 text-steel-blue" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{residents.length}</div>
              <p className="text-xs text-muted-foreground">Active residents</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assigned Houses</CardTitle>
              <Home className="h-4 w-4 text-steel-blue" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(residents.map((r) => r.houseId)).size}
              </div>
              <p className="text-xs text-muted-foreground">Houses with residents</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Search & Filter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* Residents List */}
        <Card>
          <CardHeader>
            <CardTitle>Residents</CardTitle>
            <CardDescription>
              Showing {filteredResidents.length} of {residents.length} residents
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredResidents.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {residents.length === 0
                    ? "No residents yet. Add your first resident."
                    : "No residents match your search."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-sm text-muted-foreground">
                      <th className="text-left py-3 px-2">Name</th>
                      <th className="text-left py-3 px-2">Email</th>
                      <th className="text-left py-3 px-2">House</th>
                      <th className="text-right py-3 px-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResidents.map((resident) => (
                      <tr key={resident.id} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-2 font-medium">{resident.name}</td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            {resident.email}
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <Badge variant="secondary">{getHouseName(resident.houseId)}</Badge>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditClick(resident)}
                              disabled={isSubmitting || isDeleting}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteId(resident.id)}
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Resident" : "Add New Resident"}</DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update resident details"
                : "Create a new resident account with temporary credentials"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Resident name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="resident@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-1"
              />
            </div>

            {!editingId && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label htmlFor="password">Temporary Password</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={generatePassword}
                    className="text-xs"
                  >
                    Generate
                  </Button>
                </div>
                <Input
                  id="password"
                  type="text"
                  placeholder="At least 12 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="mt-1 font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Password will be shown once after creation
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="houseId">Assign to House</Label>
              <Select
                value={formData.houseId}
                onValueChange={(val) => setFormData({ ...formData, houseId: val })}
              >
                <SelectTrigger id="houseId" className="mt-1">
                  <SelectValue placeholder="Select house" />
                </SelectTrigger>
                <SelectContent>
                  {houses.map((house) => (
                    <SelectItem key={house.id} value={house.id}>
                      {house.block}-{house.houseNumber} (Floor {house.floor})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : editingId ? (
                "Update Resident"
              ) : (
                "Create Resident"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Credentials Display Dialog */}
      <Dialog open={!!createdCredentials} onOpenChange={() => setCreatedCredentials(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Resident Account Created</DialogTitle>
            <DialogDescription>Save or share these credentials with the resident</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-green-700 mb-3">
                <CheckCircle className="w-4 h-4" />
                Account Created Successfully
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Email</Label>
                  <div className="font-mono text-sm bg-muted p-2 rounded mt-1 break-all">
                    {createdCredentials?.email}
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Temporary Password</Label>
                  <div className="font-mono text-sm bg-muted p-2 rounded mt-1 break-all">
                    {createdCredentials?.password}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
              <p className="text-xs text-amber-700">
                🔒 <strong>Important:</strong> Resident must change password on first login. Save credentials in a secure location.
              </p>
            </div>

            <div className="flex gap-2">
              <Button onClick={copyCredentials} variant="outline" className="flex-1">
                <Copy className="w-4 h-4 mr-2" />
                Copy Credentials
              </Button>
              <Button onClick={() => setCreatedCredentials(null)} className="flex-1">
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        title="Delete Resident"
        message="This action cannot be undone. The resident account will be removed."
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
