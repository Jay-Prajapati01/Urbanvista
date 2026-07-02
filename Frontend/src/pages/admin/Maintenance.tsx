import AdminLayout from "@/components/admin/AdminLayout";
import { useAuth } from "@/lib/auth";
import { maintenanceApi } from "@/lib/api";
import type { MaintenanceRecord } from "@/lib/data";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Receipt,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  TrendingDown,
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
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";
import { format } from "date-fns";

const COLORS = ["#10b981", "#f59e0b", "#ef4444"];

export default function Maintenance() {
  const { isAuthenticated, isDemo } = useAuth();

  const { data: records = [], isLoading, refetch, isFetching } = useQuery<MaintenanceRecord[]>({
    queryKey: ["maintenance"],
    queryFn: () => maintenanceApi.getAll(),
    enabled: isAuthenticated && !isDemo,
  });

  const recordsArray = records;
  const blocks = [...new Set(recordsArray.map((r) => r.houseNumber?.charAt(0) || "").filter(Boolean))].sort();

  const totalBilled = recordsArray.reduce((sum: number, r) => sum + (r.totalAmount || 0), 0);
  const totalCollected = recordsArray.reduce((sum: number, r) => sum + (r.amountPaid || 0), 0);
  const totalPending = totalBilled - totalCollected;

  const paidRecords = recordsArray.filter((r) => r.status === "Paid");
  const pendingRecords = recordsArray.filter((r) => r.status === "Pending");
  const overdueRecords = recordsArray.filter((r) => r.status === "Overdue");

  const maintenanceByBlock = blocks.map((block: string) => {
    const blockRecords = recordsArray.filter((r) => r.houseNumber?.startsWith(block));
    return {
      block,
      total: blockRecords.length,
      billed: blockRecords.reduce((sum, r) => sum + (r.totalAmount || 0), 0),
      collected: blockRecords.reduce((sum, r) => sum + (r.amountPaid || 0), 0),
      pending: blockRecords.reduce((sum, r) => sum + ((r.totalAmount || 0) - (r.amountPaid || 0)), 0),
    };
  });

  const statusData = [
    { name: "Paid", value: paidRecords.length },
    { name: "Pending", value: pendingRecords.length },
    { name: "Overdue", value: overdueRecords.length },
  ];

  const monthlyData = recordsArray
    .filter((r) => r.paymentDate)
    .reduce((acc, r) => {
      const month = format(new Date(r.paymentDate!), "MMM yyyy");
      if (!acc[month]) {
        acc[month] = { month, collected: 0, count: 0 };
      }
      acc[month].collected += r.amountPaid || 0;
      acc[month].count += 1;
      return acc;
    }, {} as Record<string, { month: string; collected: number; count: number }>);

  const collectionRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-steel-blue" />
          <span className="ml-3 text-muted-foreground">Loading maintenance data...</span>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Maintenance Overview</h1>
            <p className="text-muted-foreground mt-1">
              Financial summary and collection status of all maintenance records
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
              <CardTitle className="text-sm font-medium">Total Billed</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalBilled.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{records.length} records</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Collected</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">₹{totalCollected.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{paidRecords.length} paid</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-500">₹{totalPending.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{pendingRecords.length} pending</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{overdueRecords.length}</div>
              <p className="text-xs text-muted-foreground">records</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{collectionRate}%</div>
              <p className="text-xs text-muted-foreground">overall</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Status</CardTitle>
              <CardDescription>Breakdown by payment status</CardDescription>
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

          <Card>
            <CardHeader>
              <CardTitle>Collection Progress</CardTitle>
              <CardDescription>Collected vs Pending amounts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Collected</span>
                    <span className="font-medium">₹{totalCollected.toLocaleString()}</span>
                  </div>
                  <div className="h-4 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${collectionRate}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Pending</span>
                    <span className="font-medium">₹{totalPending.toLocaleString()}</span>
                  </div>
                  <div className="h-4 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all"
                      style={{ width: `${100 - collectionRate}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Billed</span>
                  <span className="font-semibold">₹{totalBilled.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Block-wise Collection Summary</CardTitle>
            <CardDescription>Maintenance collection breakdown by block</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {maintenanceByBlock.map((blockData) => {
                const blockRate = blockData.billed > 0 ? Math.round((blockData.collected / blockData.billed) * 100) : 0;
                return (
                  <div
                    key={blockData.block}
                    className="p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-lg">Block {blockData.block}</h3>
                      <Receipt className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Billed</span>
                        <span className="font-medium">₹{blockData.billed.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Collected</span>
                        <span className="font-medium text-green-500">₹{blockData.collected.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Pending</span>
                        <span className="font-medium text-amber-500">₹{blockData.pending.toLocaleString()}</span>
                      </div>
                      <div className="pt-2 border-t">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Collection Rate</span>
                          <Badge variant="secondary" className={blockRate >= 80 ? "bg-green-500/10 text-green-500" : blockRate >= 50 ? "bg-amber-500/10 text-amber-500" : "bg-red-500/10 text-red-500"}>
                            {blockRate}%
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
