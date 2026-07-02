import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Secretary } from "@/lib/data";
import { secretariesApi, housesApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Pencil,
  Key,
  Power,
  Loader2,
  X,
  Check,
  Shield,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Secretaries() {
  const { isDemo, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [selectedSecretary, setSelectedSecretary] = useState<Secretary | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const [newSecretary, setNewSecretary] = useState({
    name: "",
    email: "",
    username: "",
    temporaryPassword: "",
    assignments: [] as { block: string }[],
  });

  const [editData, setEditData] = useState({
    name: "",
    email: "",
    status: "active" as "active" | "disabled",
  });

  const [resetPassword, setResetPassword] = useState("");
  const [assignments, setAssignments] = useState<{ block: string }[]>([]);
  const [newAssignment, setNewAssignment] = useState<{ block: string }>({
    block: "",
  });
  const [manualBlockInput, setManualBlockInput] = useState("");

  const toSearchableText = (value: unknown) =>
    typeof value === "string" ? value.toLowerCase() : "";

  const normalizeBlockInput = (value: string) => value.trim().toUpperCase();
  const isValidBlockInput = (value: string) => /^[A-Z]+$/.test(value);
  const alphabetBlocks = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

  // Fetch secretaries
  const { data: secretariesList = [], isLoading } = useQuery<Secretary[]>({
    queryKey: ["secretaries", statusFilter],
    queryFn: () =>
      secretariesApi.getAll(statusFilter === "all" ? undefined : statusFilter),
    enabled: isAuthenticated && !isDemo,
  });

  // Fetch houses for assignments
  const { data: housesList = [] } = useQuery({
    queryKey: ["houses"],
    queryFn: housesApi.getAll,
    enabled: isAuthenticated && !isDemo,
  });

  // Get unique blocks
  const blocks = [...new Set(housesList.map((h) => h.block).filter(Boolean))].sort();
  const selectableBlocks = [...new Set([...alphabetBlocks, ...blocks.map((block) => normalizeBlockInput(String(block || "")))])]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  const resolveAssignmentBlock = (assignment: Secretary["assignments"] extends Array<infer Item> ? Item : never) => {
    if (assignment?.block) {
      return assignment.block;
    }

    const legacyHouseId = (assignment as { houseId?: string } | undefined)?.houseId;
    if (!legacyHouseId) {
      return "";
    }

    return housesList.find((house) => house.id === legacyHouseId)?.block || "";
  };

  // Filter secretaries
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  const filteredSecretaries = secretariesList.filter((s) => {
    if (!normalizedSearchQuery) {
      return true;
    }

    return (
      toSearchableText(s.name).includes(normalizedSearchQuery) ||
      toSearchableText(s.email).includes(normalizedSearchQuery) ||
      toSearchableText(s.username).includes(normalizedSearchQuery)
    );
  });

  // Create secretary mutation
  const createMutation = useMutation({
    mutationFn: (data: typeof newSecretary) => {
      const formattedAssignments = data.assignments.map((a) => ({
        assignmentType: "block" as const,
        block: a.block,
      }));
      return secretariesApi.create({ ...data, assignments: formattedAssignments });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["secretaries"] });
      toast.success("Secretary created successfully");
      setIsAddDialogOpen(false);
      setNewSecretary({
        name: "",
        email: "",
        username: "",
        temporaryPassword: "",
        assignments: [],
      });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Update secretary mutation
  const updateMutation = useMutation({
    mutationFn: (data: { name: string; email: string; status: string }) =>
      secretariesApi.update(selectedSecretary!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["secretaries"] });
      toast.success("Secretary updated successfully");
      setIsEditDialogOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: () =>
      secretariesApi.resetPassword(selectedSecretary!.id, resetPassword),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["secretaries"] });
      toast.success("Password reset successfully");
      setIsResetPasswordDialogOpen(false);
      setResetPassword("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Update assignments mutation
  const updateAssignmentsMutation = useMutation({
    mutationFn: () =>
      secretariesApi.updateAssignments(
        selectedSecretary!.id,
        assignments.map((assignment) => ({
          assignmentType: "block" as const,
          block: assignment.block,
        }))
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["secretaries"] });
      toast.success("Assignments updated successfully");
      setIsAssignDialogOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Disable secretary mutation
  const disableMutation = useMutation({
    mutationFn: () => secretariesApi.disable(selectedSecretary!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["secretaries"] });
      toast.success("Secretary disabled");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Enable secretary mutation
  const enableMutation = useMutation({
    mutationFn: () => secretariesApi.enable(selectedSecretary!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["secretaries"] });
      toast.success("Secretary enabled");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleAddClick = () => {
    setNewAssignment({ block: "" });
    setManualBlockInput("");
    setIsAddDialogOpen(true);
  };

  const handleEditClick = (secretary: Secretary) => {
    setSelectedSecretary(secretary);
    setEditData({
      name: secretary.name || "",
      email: secretary.email || "",
      status: secretary.status,
    });
    setIsEditDialogOpen(true);
  };

  const handleAssignClick = (secretary: Secretary) => {
    setSelectedSecretary(secretary);
    setAssignments(secretary.assignments?.map((a) => ({
      block: resolveAssignmentBlock(a),
    })) || []);
    setNewAssignment({ block: "" });
    setManualBlockInput("");
    setIsAssignDialogOpen(true);
  };

  const handleResetPasswordClick = (secretary: Secretary) => {
    setSelectedSecretary(secretary);
    setResetPassword("");
    setIsResetPasswordDialogOpen(true);
  };

  const handleAddAssignment = () => {
    const normalizedBlock = normalizeBlockInput(newAssignment.block);
    if (!normalizedBlock) {
      toast.error("Please select a block");
      return;
    }
    if (!isValidBlockInput(normalizedBlock)) {
      toast.error("Block must contain only letters A-Z");
      return;
    }
    if (assignments.some((item) => normalizeBlockInput(item.block) === normalizedBlock)) {
      toast.error(`Block ${normalizedBlock} is already assigned`);
      return;
    }
    setAssignments([...assignments, { block: normalizedBlock }]);
    setNewAssignment({ block: "" });
  };

  const handleAddManualBlockToCreate = () => {
    const normalizedBlock = normalizeBlockInput(manualBlockInput);
    if (!normalizedBlock) {
      toast.error("Enter a block name");
      return;
    }
    if (!isValidBlockInput(normalizedBlock)) {
      toast.error("Block must contain only letters A-Z");
      return;
    }
    if (newSecretary.assignments.some((item) => normalizeBlockInput(item.block) === normalizedBlock)) {
      toast.error(`Block ${normalizedBlock} is already assigned`);
      return;
    }

    setNewSecretary({
      ...newSecretary,
      assignments: [...newSecretary.assignments, { block: normalizedBlock }],
    });
    setManualBlockInput("");
  };

  const handleAddSelectedBlockToCreate = () => {
    const normalizedBlock = normalizeBlockInput(newAssignment.block);
    if (!normalizedBlock) {
      toast.error("Please select a block");
      return;
    }
    if (!isValidBlockInput(normalizedBlock)) {
      toast.error("Block must contain only letters A-Z");
      return;
    }
    if (newSecretary.assignments.some((item) => normalizeBlockInput(item.block) === normalizedBlock)) {
      toast.error(`Block ${normalizedBlock} is already assigned`);
      return;
    }

    setNewSecretary({
      ...newSecretary,
      assignments: [...newSecretary.assignments, { block: normalizedBlock }],
    });
    setNewAssignment({ block: "" });
  };

  const handleAddManualBlockToAssignments = () => {
    const normalizedBlock = normalizeBlockInput(manualBlockInput);
    if (!normalizedBlock) {
      toast.error("Enter a block name");
      return;
    }
    if (!isValidBlockInput(normalizedBlock)) {
      toast.error("Block must contain only letters A-Z");
      return;
    }
    if (assignments.some((item) => normalizeBlockInput(item.block) === normalizedBlock)) {
      toast.error(`Block ${normalizedBlock} is already assigned`);
      return;
    }

    setAssignments([...assignments, { block: normalizedBlock }]);
    setManualBlockInput("");
  };

  const handleRemoveAssignment = (index: number) => {
    setAssignments(assignments.filter((_, i) => i !== index));
  };

  const handleCreateSecretary = () => {
    if (!newSecretary.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!newSecretary.email.trim()) {
      toast.error("Email is required");
      return;
    }
    if (!newSecretary.username.trim()) {
      toast.error("Username is required");
      return;
    }
    if (newSecretary.temporaryPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (newSecretary.assignments.length === 0) {
      toast.error("At least one block assignment is required");
      return;
    }
    createMutation.mutate(newSecretary);
  };

  const handleUpdateSecretary = () => {
    if (!editData.name.trim()) {
      toast.error("Name is required");
      return;
    }
    updateMutation.mutate(editData);
  };

  const handleUpdateAssignments = () => {
    if (assignments.length === 0) {
      toast.error("At least one block assignment is required");
      return;
    }
    updateAssignmentsMutation.mutate();
  };

  const handleResetPassword = () => {
    if (resetPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    resetPasswordMutation.mutate();
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-steel-blue" />
          <span className="ml-3 text-muted-foreground">Loading secretaries...</span>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Secretary Management</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage secretaries and their block assignments
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAddClick} className="gap-2">
                <Plus className="w-4 h-4" />
                New Secretary
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Secretary</DialogTitle>
                <DialogDescription>
                    Add a new secretary account and assign blocks
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Full Name*</Label>
                  <Input
                    id="name"
                    value={newSecretary.name}
                    onChange={(e) =>
                      setNewSecretary({ ...newSecretary, name: e.target.value })
                    }
                    placeholder="e.g., John Doe"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email*</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newSecretary.email}
                    onChange={(e) =>
                      setNewSecretary({ ...newSecretary, email: e.target.value })
                    }
                    placeholder="john@example.com"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="username">Username*</Label>
                  <Input
                    id="username"
                    value={newSecretary.username}
                    onChange={(e) =>
                      setNewSecretary({
                        ...newSecretary,
                        username: e.target.value,
                      })
                    }
                    placeholder="johndoe"
                    className="mt-1"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="password">Temporary Password (min 6 chars)*</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newSecretary.temporaryPassword}
                    onChange={(e) =>
                      setNewSecretary({
                        ...newSecretary,
                        temporaryPassword: e.target.value,
                      })
                    }
                    placeholder="Must be at least 6 characters"
                    className="mt-1"
                  />
                  {newSecretary.temporaryPassword.length > 0 && newSecretary.temporaryPassword.length < 6 && (
                    <p className="text-xs text-red-500 mt-1">Password must be at least 6 characters.</p>
                  )}
                </div>

                <div className="col-span-2">
                  <div className="flex items-center justify-between mb-3">
                    <Label>Block Assignments*</Label>
                    <span className="text-xs text-muted-foreground">
                      {newSecretary.assignments.length} assigned
                    </span>
                  </div>

                  {/* Assignment list */}
                  <div className="flex flex-wrap gap-2 mb-4 min-h-10">
                    {newSecretary.assignments.map((assign, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="flex items-center gap-2 py-1.5"
                      >
                        <span className="text-sm">{assign.block}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setNewSecretary({
                              ...newSecretary,
                              assignments: newSecretary.assignments.filter(
                                (_, i) => i !== idx
                              ),
                            });
                          }}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </Badge>
                    ))}
                    {newSecretary.assignments.length === 0 && (
                      <p className="text-xs text-muted-foreground">No blocks added yet.</p>
                    )}
                  </div>

                  {/* Add block assignment */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Select
                      value={newAssignment.block}
                      onValueChange={(block) =>
                        setNewAssignment({ block })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select block A-Z" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectableBlocks.map((block) => (
                          <SelectItem key={block} value={block}>
                            Block {block}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddSelectedBlockToCreate}
                    >
                      Add Selected
                    </Button>

                    <Input
                      value={manualBlockInput}
                      onChange={(e) => setManualBlockInput(e.target.value.toUpperCase())}
                      placeholder="Type block (A-Z)"
                      maxLength={4}
                    />
                    <Button type="button" variant="outline" onClick={handleAddManualBlockToCreate}>
                      Add Typed
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Blocks are normalized to uppercase and duplicates are blocked.</p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateSecretary}
                  disabled={createMutation.isPending || (newSecretary.temporaryPassword.length > 0 && newSecretary.temporaryPassword.length < 6)}
                >
                  {createMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Create Secretary
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="disabled">Disabled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Secretaries Table */}
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[25%]">Name</TableHead>
                <TableHead className="w-[20%]">Email</TableHead>
                <TableHead className="w-[15%]">Username</TableHead>
                <TableHead className="w-[15%]">Assignments</TableHead>
                <TableHead className="w-[10%]">Status</TableHead>
                <TableHead className="w-[15%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSecretaries.length > 0 ? (
                filteredSecretaries.map((secretary) => (
                  <TableRow key={secretary.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{secretary.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {secretary.email}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {secretary.username}
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="px-2 py-1 bg-steel-blue/10 text-steel-blue rounded text-xs font-medium">
                        {secretary.assignedBlocks?.length || secretary.assignments?.length || 0}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                          secretary.status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {secretary.status === "active" ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => handleEditClick(secretary)}
                          >
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleAssignClick(secretary)}
                          >
                            <Shield className="w-4 h-4 mr-2" />
                            Assign Blocks
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleResetPasswordClick(secretary)}
                          >
                            <Key className="w-4 h-4 mr-2" />
                            Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedSecretary(secretary);
                              setDeleteConfirmOpen(true);
                            }}
                          >
                            <Power className="w-4 h-4 mr-2" />
                            {secretary.status === "active"
                              ? "Disable"
                              : "Enable"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No secretaries found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Edit Secretary Dialog */}
        {selectedSecretary && (
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Secretary</DialogTitle>
                <DialogDescription>
                  Update secretary information
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-name">Full Name</Label>
                  <Input
                    id="edit-name"
                    value={editData.name}
                    onChange={(e) =>
                      setEditData({ ...editData, name: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editData.email}
                    onChange={(e) =>
                      setEditData({ ...editData, email: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateSecretary}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Update
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Assign Areas Dialog */}
        {selectedSecretary && (
          <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Assign Blocks to {selectedSecretary.name}</DialogTitle>
                <DialogDescription>
                  Manage block assignments for this secretary
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Current assignments */}
                <div>
                  <Label className="mb-3 block font-medium">Current Blocks Assigned</Label>
                  <div className="flex flex-wrap gap-2 min-h-10">
                    {assignments.map((assign, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="flex items-center gap-2 py-1.5"
                      >
                        <span className="text-sm">{assign.block}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAssignment(idx)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </Badge>
                    ))}
                    {assignments.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-2">No blocks assigned yet</p>
                    )}
                  </div>
                </div>

                {/* Add new block assignment */}
                <div className="space-y-3 pt-4 border-t border-border">
                  <Label className="font-medium">Add New Block</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Select
                      value={newAssignment.block}
                      onValueChange={(block) =>
                        setNewAssignment({ block })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select block A-Z" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectableBlocks.map((block) => (
                          <SelectItem key={block} value={block}>
                            Block {block}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddAssignment}
                    >
                      Add Selected
                    </Button>

                    <Input
                      value={manualBlockInput}
                      onChange={(e) => setManualBlockInput(e.target.value.toUpperCase())}
                      placeholder="Type block (A-Z)"
                      maxLength={4}
                    />
                    <Button type="button" variant="outline" onClick={handleAddManualBlockToAssignments}>
                      Add Typed
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Typed values are validated to A-Z and normalized to uppercase.</p>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsAssignDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateAssignments}
                  disabled={updateAssignmentsMutation.isPending}
                >
                  {updateAssignmentsMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Save Blocks
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Reset Password Dialog */}
        {selectedSecretary && (
          <Dialog
            open={isResetPasswordDialogOpen}
            onOpenChange={setIsResetPasswordDialogOpen}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reset Password</DialogTitle>
                <DialogDescription>
                  Set a new temporary password for {selectedSecretary.name}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="reset-password">
                    Temporary Password (min 6 chars)
                  </Label>
                  <Input
                    id="reset-password"
                    type="password"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder="Must be at least 6 characters"
                    className="mt-1"
                  />
                  {resetPassword.length > 0 && resetPassword.length < 6 && (
                    <p className="text-xs text-red-500 mt-1">Password must be at least 6 characters.</p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  The secretary will be required to change this password on their next login.
                </p>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsResetPasswordDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleResetPassword}
                  disabled={resetPasswordMutation.isPending}
                  variant="destructive"
                >
                  {resetPasswordMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Reset Password
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Disable/Enable Confirmation */}
        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {selectedSecretary?.status === "active"
                  ? "Disable Secretary?"
                  : "Enable Secretary?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {selectedSecretary?.status === "active"
                  ? `Are you sure you want to disable ${selectedSecretary?.name}? They will not be able to access the system.`
                  : `Are you sure you want to enable ${selectedSecretary?.name}?`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedSecretary?.status === "active") {
                  disableMutation.mutate();
                } else {
                  enableMutation.mutate();
                }
                setDeleteConfirmOpen(false);
              }}
              className={
                selectedSecretary?.status === "active"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }
            >
              {selectedSecretary?.status === "active" ? "Disable" : "Enable"}
            </AlertDialogAction>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
