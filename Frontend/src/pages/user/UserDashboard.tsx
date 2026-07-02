import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUserAuth } from "@/lib/userAuth";
import { userDashboardApi, type UserDashboardData } from "@/lib/userApi";
import UserLayout from "@/components/user/UserLayout";
import { toast } from "sonner";
import { useState } from "react";
import {
  Home,
  Users,
  Car,
  Wallet,
  IndianRupee,
  AlertCircle,
  Loader2,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function UserDashboard() {
  const { user, isAuthenticated } = useUserAuth();
  const queryClient = useQueryClient();
  const [houseForm, setHouseForm] = useState({ ownerContact: "", notes: "" });
  const [memberForm, setMemberForm] = useState({ name: "", role: "Family" as "Owner" | "Tenant" | "Family", phone: "", email: "" });
  const [vehicleForm, setVehicleForm] = useState({ vehicleNumber: "", type: "Four Wheeler" as "Two Wheeler" | "Four Wheeler", color: "" });
  const [houseDialogOpen, setHouseDialogOpen] = useState(false);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false);

  const { data, isLoading } = useQuery<UserDashboardData>({
    queryKey: ["user-dashboard"],
    queryFn: userDashboardApi.getData,
    enabled: isAuthenticated,
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });

  const updateHouseMutation = useMutation({
    mutationFn: userDashboardApi.updateHouse,
    onSuccess: () => {
      toast.success("House details updated");
      setHouseDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["user-dashboard"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const addMemberMutation = useMutation({
    mutationFn: userDashboardApi.addMember,
    onSuccess: () => {
      toast.success("Member added successfully");
      setMemberDialogOpen(false);
      setMemberForm({ name: "", role: "Family", phone: "", email: "" });
      queryClient.invalidateQueries({ queryKey: ["user-dashboard"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const addVehicleMutation = useMutation({
    mutationFn: userDashboardApi.addVehicle,
    onSuccess: () => {
      toast.success("Vehicle added successfully");
      setVehicleDialogOpen(false);
      setVehicleForm({ vehicleNumber: "", type: "Four Wheeler", color: "" });
      queryClient.invalidateQueries({ queryKey: ["user-dashboard"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <UserLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-steel-blue" />
        </div>
      </UserLayout>
    );
  }

  const house = data?.house;
  const members = data?.members || [];
  const vehicles = data?.vehicles || [];
  const summary = data?.paymentSummary;

  const openHouseDialog = () => {
    setHouseForm({
      ownerContact: house?.ownerContact || "",
      notes: house?.notes || "",
    });
    setHouseDialogOpen(true);
  };

  return (
    <UserLayout>
      <div className="space-y-6">
        {/* Welcome */}
        <div className="animate-fade-up">
          <h1 className="text-2xl font-bold text-foreground">
            Welcome, {user?.name?.split(" ")[0]}
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's an overview of your home and society details.
          </p>
        </div>

        <div className="glass-card p-6 animate-fade-up delay-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-steel-blue/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-steel-blue" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Resident Management Sections</h2>
              <p className="text-sm text-muted-foreground">Manage Houses, Members, and Vehicles from here.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div id="houses-section" className="p-4 rounded-lg bg-secondary/40 border border-border">
              <p className="font-medium text-foreground">Houses</p>
              <p className="text-xs text-muted-foreground mt-1">Update your linked house details.</p>
              <Button
                size="sm"
                className="mt-3"
                variant="outline"
                onClick={openHouseDialog}
                disabled={!house}
              >
                Edit House
              </Button>
            </div>
            <div id="members-section" className="p-4 rounded-lg bg-secondary/40 border border-border">
              <p className="font-medium text-foreground">Members</p>
              <p className="text-xs text-muted-foreground mt-1">Add family members for your house.</p>
              <Button
                size="sm"
                className="mt-3"
                variant="outline"
                onClick={() => setMemberDialogOpen(true)}
              >
                Add Member
              </Button>
            </div>
            <div id="vehicles-section" className="p-4 rounded-lg bg-secondary/40 border border-border">
              <p className="font-medium text-foreground">Vehicles</p>
              <p className="text-xs text-muted-foreground mt-1">Add vehicles linked to your house.</p>
              <Button
                size="sm"
                className="mt-3"
                variant="outline"
                onClick={() => setVehicleDialogOpen(true)}
              >
                Add Vehicle
              </Button>
            </div>
          </div>
          {!house && (
            <p className="text-xs text-amber-500 mt-3">
              Your account must be linked to a house before creating members or vehicles.
            </p>
          )}
        </div>

        {/* Account not linked message */}
        {!house && (
          <div className="glass-card p-6 animate-fade-up delay-100">
            <div className="flex items-center gap-3 text-amber-500">
              <AlertCircle className="w-6 h-6" />
              <div>
                <div className="font-medium">Account Not Linked</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {data?.message || "Your account is not yet linked to a house. Please contact the society admin."}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-up delay-100">
            <div className="stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Billed</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    <IndianRupee className="w-5 h-5 inline -mt-1" />
                    {summary.totalBilled.toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-steel-blue/10 flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-steel-blue" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {summary.totalRecords} record{summary.totalRecords !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Paid</p>
                  <p className="text-2xl font-bold text-emerald-500 mt-1">
                    <IndianRupee className="w-5 h-5 inline -mt-1" />
                    {summary.totalPaid.toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {summary.paidRecords} paid
              </p>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-amber-500 mt-1">
                    <IndianRupee className="w-5 h-5 inline -mt-1" />
                    {summary.pendingAmount.toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-amber-500" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {summary.pendingRecords} pending
              </p>
            </div>
          </div>
        )}

        {/* House Info */}
        {house && (
          <div className="glass-card p-6 animate-fade-up delay-200">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-steel-blue/10 flex items-center justify-center">
                  <Home className="w-5 h-5 text-steel-blue" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">Home Information</h2>
              </div>

              <Dialog open={houseDialogOpen} onOpenChange={setHouseDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" onClick={openHouseDialog}>Edit House</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Update House Details</DialogTitle>
                    <DialogDescription>
                      These updates are visible to secretary and admin panels.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="owner-contact">Owner Contact</Label>
                      <Input
                        id="owner-contact"
                        value={houseForm.ownerContact}
                        onChange={(e) => setHouseForm((prev) => ({ ...prev, ownerContact: e.target.value }))}
                        placeholder="Enter contact number"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="house-notes">Notes</Label>
                      <Input
                        id="house-notes"
                        value={houseForm.notes}
                        onChange={(e) => setHouseForm((prev) => ({ ...prev, notes: e.target.value }))}
                        placeholder="Any details about your house"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setHouseDialogOpen(false)}>Cancel</Button>
                    <Button
                      onClick={() => updateHouseMutation.mutate(houseForm)}
                      disabled={updateHouseMutation.isPending}
                    >
                      {updateHouseMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground uppercase font-medium">House No.</p>
                <p className="text-lg font-semibold text-foreground mt-1">{house.houseNumber}</p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground uppercase font-medium">Block</p>
                <p className="text-lg font-semibold text-foreground mt-1">{house.block}</p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground uppercase font-medium">Floor</p>
                <p className="text-lg font-semibold text-foreground mt-1">{house.floor}</p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground uppercase font-medium">Status</p>
                <Badge
                  className={`mt-1 ${
                    house.status === "occupied"
                      ? "badge-occupied"
                      : house.status === "vacant"
                      ? "badge-vacant"
                      : "badge-pending"
                  }`}
                >
                  {house.status}
                </Badge>
              </div>
              {house.ownerName && (
                <div className="p-4 rounded-lg bg-secondary/50 col-span-2">
                  <p className="text-xs text-muted-foreground uppercase font-medium">Owner</p>
                  <p className="text-lg font-semibold text-foreground mt-1">{house.ownerName}</p>
                </div>
              )}
              {house.ownerContact && (
                <div className="p-4 rounded-lg bg-secondary/50 col-span-2">
                  <p className="text-xs text-muted-foreground uppercase font-medium">Contact</p>
                  <p className="text-lg font-semibold text-foreground mt-1">{house.ownerContact}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Two column: Family + Vehicles */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Family Members */}
          <div className="glass-card p-6 animate-fade-up delay-300">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-steel-blue/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-steel-blue" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Family Members</h2>
                  <p className="text-sm text-muted-foreground">{members.length} member{members.length !== 1 ? "s" : ""}</p>
                </div>
              </div>

              <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">Add Member</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Family Member</DialogTitle>
                    <DialogDescription>
                      This will be visible in secretary and admin member management.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="member-name">Name</Label>
                      <Input
                        id="member-name"
                        value={memberForm.name}
                        onChange={(e) => setMemberForm((prev) => ({ ...prev, name: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Role</Label>
                      <Select
                        value={memberForm.role}
                        onValueChange={(value) => setMemberForm((prev) => ({ ...prev, role: value as "Owner" | "Tenant" | "Family" }))}
                      >
                        <SelectTrigger className="mt-1">
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
                      <Label htmlFor="member-phone">Phone</Label>
                      <Input
                        id="member-phone"
                        value={memberForm.phone}
                        onChange={(e) => setMemberForm((prev) => ({ ...prev, phone: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="member-email">Email</Label>
                      <Input
                        id="member-email"
                        type="email"
                        value={memberForm.email}
                        onChange={(e) => setMemberForm((prev) => ({ ...prev, email: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setMemberDialogOpen(false)}>Cancel</Button>
                    <Button
                      onClick={() => {
                        if (!memberForm.name.trim()) {
                          toast.error("Member name is required");
                          return;
                        }
                        addMemberMutation.mutate(memberForm);
                      }}
                      disabled={addMemberMutation.isPending}
                    >
                      {addMemberMutation.isPending ? "Adding..." : "Add Member"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground">No members linked to your house.</p>
            ) : (
              <div className="space-y-3">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-steel-blue/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium text-steel-blue">
                        {member.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground truncate">{member.name}</span>
                        <Badge variant="outline" className="text-xs">{member.role}</Badge>
                        {member.isActive ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                        {member.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {member.phone}
                          </span>
                        )}
                        {member.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {member.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Vehicles */}
          <div className="glass-card p-6 animate-fade-up delay-300">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-steel-blue/10 flex items-center justify-center">
                  <Car className="w-5 h-5 text-steel-blue" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Registered Vehicles</h2>
                  <p className="text-sm text-muted-foreground">{vehicles.length} vehicle{vehicles.length !== 1 ? "s" : ""}</p>
                </div>
              </div>

              <Dialog open={vehicleDialogOpen} onOpenChange={setVehicleDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">Add Vehicle</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Vehicle</DialogTitle>
                    <DialogDescription>
                      Vehicle entries are shared with secretary and admin vehicle panels.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="vehicle-number">Vehicle Number</Label>
                      <Input
                        id="vehicle-number"
                        value={vehicleForm.vehicleNumber}
                        onChange={(e) => setVehicleForm((prev) => ({ ...prev, vehicleNumber: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Type</Label>
                      <Select
                        value={vehicleForm.type}
                        onValueChange={(value) => setVehicleForm((prev) => ({ ...prev, type: value as "Two Wheeler" | "Four Wheeler" }))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Two Wheeler">Two Wheeler</SelectItem>
                          <SelectItem value="Four Wheeler">Four Wheeler</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="vehicle-color">Color</Label>
                      <Input
                        id="vehicle-color"
                        value={vehicleForm.color}
                        onChange={(e) => setVehicleForm((prev) => ({ ...prev, color: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setVehicleDialogOpen(false)}>Cancel</Button>
                    <Button
                      onClick={() => {
                        if (!vehicleForm.vehicleNumber.trim()) {
                          toast.error("Vehicle number is required");
                          return;
                        }
                        addVehicleMutation.mutate(vehicleForm);
                      }}
                      disabled={addVehicleMutation.isPending}
                    >
                      {addVehicleMutation.isPending ? "Adding..." : "Add Vehicle"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            {vehicles.length === 0 ? (
              <p className="text-sm text-muted-foreground">No vehicles registered to your house.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle No.</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Color</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.map((vehicle) => (
                    <TableRow key={vehicle.id} className="table-row-hover">
                      <TableCell className="font-medium">{vehicle.vehicleNumber}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{vehicle.type}</Badge>
                      </TableCell>
                      <TableCell>{vehicle.color || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>
    </UserLayout>
  );
}
