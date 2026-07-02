import AdminLayout from "@/components/admin/AdminLayout";
import { useAuth } from "@/lib/auth";
import { housesApi } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Home,
  CheckCircle,
  XCircle,
  Wrench,
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

const COLORS = ["#10b981", "#f59e0b", "#ef4444"];

export default function Houses() {
  const { isAuthenticated, isDemo } = useAuth();

  const { data: houses = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["houses"],
    queryFn: housesApi.getAll,
    enabled: isAuthenticated && !isDemo,
  });

  const blocks = [...new Set(houses.map((h) => h.block))].sort();

  const housesByBlock = blocks.map((block) => ({
    block,
    total: houses.filter((h) => h.block === block).length,
    occupied: houses.filter((h) => h.block === block && h.status === "occupied").length,
    vacant: houses.filter((h) => h.block === block && h.status === "vacant").length,
    maintenance: houses.filter((h) => h.block === block && h.status === "maintenance").length,
  }));

  const statusData = [
    { name: "Occupied", value: houses.filter((h) => h.status === "occupied").length },
    { name: "Vacant", value: houses.filter((h) => h.status === "vacant").length },
    { name: "Maintenance", value: houses.filter((h) => h.status === "maintenance").length },
  ];

  const totalOccupied = houses.filter((h) => h.status === "occupied").length;
  const totalVacant = houses.filter((h) => h.status === "vacant").length;
  const totalMaintenance = houses.filter((h) => h.status === "maintenance").length;

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-steel-blue" />
          <span className="ml-3 text-muted-foreground">Loading houses data...</span>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Houses Overview</h1>
            <p className="text-muted-foreground mt-1">
              Block-wise distribution and status of all houses
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Houses</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{houses.length}</div>
              <p className="text-xs text-muted-foreground">{blocks.length} blocks</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Occupied</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{totalOccupied}</div>
              <p className="text-xs text-muted-foreground">
                {houses.length > 0 ? Math.round((totalOccupied / houses.length) * 100) : 0}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vacant</CardTitle>
              <XCircle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-500">{totalVacant}</div>
              <p className="text-xs text-muted-foreground">
                {houses.length > 0 ? Math.round((totalVacant / houses.length) * 100) : 0}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
              <Wrench className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{totalMaintenance}</div>
              <p className="text-xs text-muted-foreground">
                {houses.length > 0 ? Math.round((totalMaintenance / houses.length) * 100) : 0}%
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Block-wise Distribution</CardTitle>
              <CardDescription>Number of houses per block</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={housesByBlock}>
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
              <CardTitle>Status Distribution</CardTitle>
              <CardDescription>Overall house status breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {statusData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 mt-2">
                {statusData.map((item, index) => (
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
            <CardDescription>Detailed breakdown of houses by block</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {housesByBlock.map((blockData) => (
                <div
                  key={blockData.block}
                  className="p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-lg">Block {blockData.block}</h3>
                    <Home className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Total</span>
                      <span className="font-medium">{blockData.total}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        Occupied
                      </span>
                      <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                        {blockData.occupied}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1">
                        <XCircle className="w-3 h-3 text-amber-500" />
                        Vacant
                      </span>
                      <Badge variant="secondary" className="bg-amber-500/10 text-amber-500">
                        {blockData.vacant}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1">
                        <Wrench className="w-3 h-3 text-red-500" />
                        Maintenance
                      </span>
                      <Badge variant="secondary" className="bg-red-500/10 text-red-500">
                        {blockData.maintenance}
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
