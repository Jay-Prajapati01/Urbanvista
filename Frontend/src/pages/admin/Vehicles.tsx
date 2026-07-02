import AdminLayout from "@/components/admin/AdminLayout";
import { useAuth } from "@/lib/auth";
import { vehiclesApi, housesApi } from "@/lib/api";
import type { Vehicle, House } from "@/lib/data";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Car,
  Bike,
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

const COLORS = ["#3b82f6", "#10b981"];

export default function Vehicles() {
  const { isAuthenticated, isDemo } = useAuth();

  const { data: vehicles = [], isLoading: vehiclesLoading, refetch, isFetching } = useQuery<Vehicle[]>({
    queryKey: ["vehicles"],
    queryFn: () => vehiclesApi.getAll(),
    enabled: isAuthenticated && !isDemo,
  });

  const { data: houses = [] } = useQuery<House[]>({
    queryKey: ["houses"],
    queryFn: () => housesApi.getAll(),
    enabled: isAuthenticated && !isDemo,
  });

  const vehiclesArray = vehicles;

  const blocks = [...new Set(vehiclesArray.map((v) => v.houseNumber?.charAt(0) || "").filter(Boolean))].sort();

  const vehiclesByBlock = blocks.map((block: string) => {
    const blockVehicles = vehiclesArray.filter((v) => v.houseNumber?.startsWith(block));
    return {
      block,
      total: blockVehicles.length,
      twoWheeler: blockVehicles.filter((v) => v.type === "Two Wheeler").length,
      fourWheeler: blockVehicles.filter((v) => v.type === "Four Wheeler").length,
    };
  });

  const typeData = [
    { name: "Two Wheeler", value: vehiclesArray.filter((v) => v.type === "Two Wheeler").length },
    { name: "Four Wheeler", value: vehiclesArray.filter((v) => v.type === "Four Wheeler").length },
  ];

  const totalTwoWheeler = vehiclesArray.filter((v) => v.type === "Two Wheeler").length;
  const totalFourWheeler = vehiclesArray.filter((v) => v.type === "Four Wheeler").length;
  const housesWithVehicles = new Set(vehiclesArray.map((v) => v.houseId)).size;

  if (vehiclesLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-steel-blue" />
          <span className="ml-3 text-muted-foreground">Loading vehicles data...</span>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Vehicles Overview</h1>
            <p className="text-muted-foreground mt-1">
              Block-wise distribution and type breakdown of all vehicles
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
              <CardTitle className="text-sm font-medium">Total Vehicles</CardTitle>
              <Car className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{vehicles.length}</div>
              <p className="text-xs text-muted-foreground">{housesWithVehicles} houses</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Two Wheelers</CardTitle>
              <Bike className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">{totalTwoWheeler}</div>
              <p className="text-xs text-muted-foreground">
                {vehicles.length > 0 ? Math.round((totalTwoWheeler / vehicles.length) * 100) : 0}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Four Wheelers</CardTitle>
              <Car className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{totalFourWheeler}</div>
              <p className="text-xs text-muted-foreground">
                {vehicles.length > 0 ? Math.round((totalFourWheeler / vehicles.length) * 100) : 0}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg per House</CardTitle>
              <Car className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {housesWithVehicles > 0 ? (vehicles.length / housesWithVehicles).toFixed(1) : 0}
              </div>
              <p className="text-xs text-muted-foreground">vehicles/house</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Block-wise Distribution</CardTitle>
              <CardDescription>Number of vehicles per block</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={vehiclesByBlock}>
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
              <CardTitle>Vehicle Type Distribution</CardTitle>
              <CardDescription>Breakdown by vehicle type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={typeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {typeData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 mt-2">
                {typeData.map((item, index) => (
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
            <CardDescription>Detailed breakdown of vehicles by block</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {vehiclesByBlock.map((blockData) => (
                <div
                  key={blockData.block}
                  className="p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-lg">Block {blockData.block}</h3>
                    <Car className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Total</span>
                      <span className="font-medium">{blockData.total}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1">
                        <Bike className="w-3 h-3 text-blue-500" />
                        Two Wheeler
                      </span>
                      <Badge variant="secondary" className="bg-blue-500/10 text-blue-500">
                        {blockData.twoWheeler}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1">
                        <Car className="w-3 h-3 text-green-500" />
                        Four Wheeler
                      </span>
                      <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                        {blockData.fourWheeler}
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
