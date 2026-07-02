import AdminLayout from "@/components/admin/AdminLayout";
import { useAuth } from "@/lib/auth";
import { membersApi, housesApi } from "@/lib/api";
import type { Member, House } from "@/lib/data";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  UserCheck,
  User,
  Home,
  Phone,
  Mail,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b"];

export default function Members() {
  const { isAuthenticated, isDemo } = useAuth();

  const { data: members = [], isLoading: membersLoading, refetch, isFetching } = useQuery<Member[]>({
    queryKey: ["members"],
    queryFn: () => membersApi.getAll(),
    enabled: isAuthenticated && !isDemo,
  });

  const { data: houses = [] } = useQuery<House[]>({
    queryKey: ["houses"],
    queryFn: () => housesApi.getAll(),
    enabled: isAuthenticated && !isDemo,
  });

  const membersArray = members;
  const housesArray = houses;

  const blocks = [...new Set(membersArray.map((m) => m.houseNumber?.charAt(0) || "").filter(Boolean))].sort();

  const membersByBlock = blocks.map((block: string) => {
    const blockMembers = membersArray.filter((m) => m.houseNumber?.startsWith(block));
    return {
      block,
      total: blockMembers.length,
      owners: blockMembers.filter((m) => m.role === "Owner").length,
      tenants: blockMembers.filter((m) => m.role === "Tenant").length,
      family: blockMembers.filter((m) => m.role === "Family").length,
    };
  });

  const roleData = [
    { name: "Owners", value: membersArray.filter((m) => m.role === "Owner").length },
    { name: "Tenants", value: membersArray.filter((m) => m.role === "Tenant").length },
    { name: "Family", value: membersArray.filter((m) => m.role === "Family").length },
  ];

  const totalOwners = membersArray.filter((m) => m.role === "Owner").length;
  const totalTenants = membersArray.filter((m) => m.role === "Tenant").length;
  const totalFamily = membersArray.filter((m) => m.role === "Family").length;

  const housesWithMembers = new Set(membersArray.map((m) => m.houseId)).size;

  if (membersLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-steel-blue" />
          <span className="ml-3 text-muted-foreground">Loading members data...</span>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Members Overview</h1>
            <p className="text-muted-foreground mt-1">
              Block-wise distribution and role breakdown of all members
            </p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 px-4 py-2 text-sm border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{members.length}</div>
              <p className="text-xs text-muted-foreground">{housesWithMembers} houses</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Owners</CardTitle>
              <UserCheck className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">{totalOwners}</div>
              <p className="text-xs text-muted-foreground">
                {members.length > 0 ? Math.round((totalOwners / members.length) * 100) : 0}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tenants</CardTitle>
              <User className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{totalTenants}</div>
              <p className="text-xs text-muted-foreground">
                {members.length > 0 ? Math.round((totalTenants / members.length) * 100) : 0}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Family</CardTitle>
              <Users className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-500">{totalFamily}</div>
              <p className="text-xs text-muted-foreground">
                {members.length > 0 ? Math.round((totalFamily / members.length) * 100) : 0}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg per House</CardTitle>
              <Home className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {housesWithMembers > 0 ? (members.length / housesWithMembers).toFixed(1) : 0}
              </div>
              <p className="text-xs text-muted-foreground">members/house</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Block-wise Distribution</CardTitle>
              <CardDescription>Number of members per block</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={membersByBlock}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="block" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="total" fill="#3b82f6" name="Total" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Role Distribution</CardTitle>
              <CardDescription>Members by their role</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={roleData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {roleData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 mt-2">
                {roleData.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-1">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index] }}
                    />
                    <span className="text-xs">
                      {item.name}: {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Block-wise Details</CardTitle>
            <CardDescription>Detailed breakdown of members by block</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {membersByBlock.map((blockData) => (
                <div
                  key={blockData.block}
                  className="p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-lg">Block {blockData.block}</h3>
                    <Users className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Total</span>
                      <span className="font-medium">{blockData.total}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-blue-500" />
                        Owners
                      </span>
                      <Badge variant="secondary" className="bg-blue-500/10 text-blue-500">
                        {blockData.owners}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-green-500" />
                        Tenants
                      </span>
                      <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                        {blockData.tenants}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-amber-500" />
                        Family
                      </span>
                      <Badge variant="secondary" className="bg-amber-500/10 text-amber-500">
                        {blockData.family}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
